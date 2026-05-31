from __future__ import annotations

import csv
import io
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import PlainTextResponse

from calculator import calculate_all, diff_results
from database import (
    create_engine as db_create_engine,
    delete_engine as db_delete_engine,
    get_engine as db_get_engine,
    get_latest_result as db_get_latest_result,
    get_result_version as db_get_result_version,
    get_results as db_get_results,
    init_db,
    list_engines as db_list_engines,
    save_result as db_save_result,
    update_engine as db_update_engine,
)
from models import EngineCreate, EngineUpdate

app = FastAPI(
    title="火箭发动机混合比计算服务",
    description="航天课程助教工具：混合比计算、边界判断、单位混用检测、温度超限告警、曲线导出、版本差异对比",
)


@app.on_event("startup")
def startup():
    init_db()


def _recalc_and_save(engine_id: str) -> dict:
    engine = db_get_engine(engine_id)
    if engine is None:
        raise HTTPException(status_code=404, detail="发动机记录不存在")
    new_version = engine.current_version + 1
    result = calculate_all(engine, new_version)
    db_save_result(engine_id, result)
    return {"engine_id": engine_id, "result": result.model_dump()}


@app.post("/engines", summary="新增发动机记录并自动计算混合比")
def api_create_engine(data: EngineCreate):
    engine = db_create_engine(data)
    new_version = 1
    result = calculate_all(engine, new_version)
    db_save_result(engine.id, result)
    return {
        "engine": engine.model_dump(),
        "result": result.model_dump(),
    }


@app.get("/engines", summary="列出所有发动机记录")
def api_list_engines():
    engines = db_list_engines()
    return {"engines": [e.model_dump() for e in engines]}


@app.get("/engines/{engine_id}", summary="获取发动机详情")
def api_get_engine(engine_id: str):
    engine = db_get_engine(engine_id)
    if engine is None:
        raise HTTPException(status_code=404, detail="发动机记录不存在")
    return engine.model_dump()


@app.put("/engines/{engine_id}", summary="修改发动机参数并重新计算（新版本）")
def api_update_engine(engine_id: str, data: EngineUpdate):
    engine = db_update_engine(engine_id, data)
    if engine is None:
        raise HTTPException(status_code=404, detail="发动机记录不存在")
    return _recalc_and_save(engine_id)


@app.post("/engines/{engine_id}/recalc", summary="复核：重新计算混合比（如燃烧温度晚到后补算）")
def api_recalc(engine_id: str):
    return _recalc_and_save(engine_id)


@app.delete("/engines/{engine_id}", summary="删除发动机记录及其所有计算结果")
def api_delete_engine(engine_id: str):
    ok = db_delete_engine(engine_id)
    if not ok:
        raise HTTPException(status_code=404, detail="发动机记录不存在")
    return {"deleted": True, "engine_id": engine_id}


@app.get("/engines/{engine_id}/results", summary="获取全部计算结果版本历史")
def api_get_results(engine_id: str):
    engine = db_get_engine(engine_id)
    if engine is None:
        raise HTTPException(status_code=404, detail="发动机记录不存在")
    results = db_get_results(engine_id)
    return {"engine_id": engine_id, "results": [r.model_dump() for r in results]}


@app.get("/engines/{engine_id}/results/latest", summary="获取最新计算结果")
def api_get_latest_result(engine_id: str):
    result = db_get_latest_result(engine_id)
    if result is None:
        raise HTTPException(status_code=404, detail="尚无计算结果，请先复核")
    return result.model_dump()


@app.get("/engines/{engine_id}/results/{version}", summary="获取指定版本的计算结果")
def api_get_result_version(engine_id: str, version: int):
    result = db_get_result_version(engine_id, version)
    if result is None:
        raise HTTPException(status_code=404, detail="指定版本的计算结果不存在")
    return result.model_dump()


@app.get("/engines/{engine_id}/diff", summary="对比两个版本的计算结果差异")
def api_diff_results(engine_id: str, v1: int = Query(...), v2: int = Query(...)):
    old = db_get_result_version(engine_id, v1)
    new = db_get_result_version(engine_id, v2)
    if old is None or new is None:
        raise HTTPException(status_code=404, detail="指定版本的计算结果不存在")
    return diff_results(old, new)


@app.get("/engines/{engine_id}/export/curve", summary="导出混合比曲线数据")
def api_export_curve(engine_id: str, format: str = Query("json", regex="^(json|csv)$")):
    result = db_get_latest_result(engine_id)
    if result is None:
        raise HTTPException(status_code=404, detail="尚无计算结果，请先复核")
    if not result.curve_data:
        raise HTTPException(status_code=400, detail="曲线数据不可用（推进剂组合未识别或温度缺失）")

    if format == "csv":
        buf = io.StringIO()
        writer = csv.DictWriter(buf, fieldnames=["mixture_ratio", "c_star", "isp", "efficiency_used"])
        writer.writeheader()
        for pt in result.curve_data:
            writer.writerow(pt.model_dump())
        return PlainTextResponse(
            content=buf.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=curve_{engine_id}.csv"},
        )

    return {"engine_id": engine_id, "version": result.version, "curve": [pt.model_dump() for pt in result.curve_data]}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
