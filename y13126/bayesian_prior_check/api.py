from __future__ import annotations

import os
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from .config import load_boundaries
from .models import RunStatus
from .parser import DataParser
from .reporter import ReportGenerator
from .storage import RunStorage
from .validator import BayesianPriorValidator


def _get_storage() -> RunStorage:
    storage_dir = os.environ.get("BAYES_CHECK_STORAGE_DIR") or None
    return RunStorage(storage_dir)


app = FastAPI(
    title="贝叶斯先验边界校验 API",
    description="对贝叶斯计算草稿进行边界校验，保留原始来源、追踪除零边界、分类输出处理记录",
    version="0.1.0",
)


@app.post("/api/v1/check", summary="上传文件并执行校验")
async def api_check(
    file: UploadFile = File(..., description="CSV或Excel计算草稿文件"),
    config_file: Optional[str] = Form(None, description="边界配置文件路径（服务端本地路径）"),
    note: Optional[str] = Form(None, description="本次校验的备注说明"),
    sheet: Optional[str] = Form(None, description="Excel时指定sheet名"),
):
    storage = _get_storage()
    original_filename = file.filename or "uploaded.csv"

    run = storage.create_run(
        source_file=original_filename,
        config_file=config_file,
        note=note,
    )
    run.status = RunStatus.RUNNING

    content = await file.read()
    stored_path = storage.save_uploaded_file(run.run_id, original_filename, content)
    run.stored_file_path = stored_path
    storage.update_run(run)

    try:
        boundaries = load_boundaries(config_file)
    except Exception as e:
        run = storage.finalize_run(run, run.summary, error_message=f"加载边界配置失败: {e}")
        raise HTTPException(status_code=400, detail=f"加载边界配置失败: {e}")

    validator = BayesianPriorValidator(boundaries)
    error_msg = None

    try:
        parser = DataParser(
            stored_path,
            sheet_name=sheet,
            original_source=original_filename,
        )
        for parsed in parser.iter_records():
            validated = validator.validate_record(parsed)
            storage.append_record_details(run.run_id, validated)
    except Exception as e:
        error_msg = str(e)

    run = storage.finalize_run(run, validator.summary, error_message=error_msg)

    return JSONResponse(
        content={
            "run_id": run.run_id,
            "status": run.status.value,
            "started_at": run.started_at.isoformat(),
            "finished_at": run.finished_at.isoformat() if run.finished_at else None,
            "source_file": run.source_file,
            "note": run.note,
            "summary": run.summary.model_dump(mode="json"),
            "error_message": run.error_message,
        }
    )


@app.get("/api/v1/runs", summary="列出历史校验记录")
async def api_list_runs(limit: int = 20):
    storage = _get_storage()
    runs = storage.list_runs(limit=limit)
    result = []
    for r in runs:
        result.append({
            "run_id": r.run_id,
            "status": r.status.value,
            "started_at": r.started_at.isoformat(),
            "finished_at": r.finished_at.isoformat() if r.finished_at else None,
            "source_file": r.source_file,
            "note": r.note,
            "summary": r.summary.model_dump(mode="json"),
        })
    return {"runs": result}


@app.get("/api/v1/runs/{run_id}", summary="获取指定运行的完整结果")
async def api_get_run(run_id: str):
    storage = _get_storage()
    run = storage.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"未找到运行ID: {run_id}")
    details = storage.get_run_details(run_id)
    run_dict = run.model_dump(mode="json")
    run_dict.pop("stored_file_path", None)
    return {
        "run": run_dict,
        "details": details,
    }


@app.get("/api/v1/runs/{run_id}/summary", summary="获取指定运行的摘要")
async def api_get_run_summary(run_id: str):
    storage = _get_storage()
    run = storage.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"未找到运行ID: {run_id}")
    run_dict = run.model_dump(mode="json")
    run_dict.pop("stored_file_path", None)
    return run_dict


@app.patch("/api/v1/runs/{run_id}/note", summary="更新运行备注")
async def api_update_note(run_id: str, note: str = Form(..., description="备注内容")):
    storage = _get_storage()
    run = storage.update_note(run_id, note)
    if not run:
        raise HTTPException(status_code=404, detail=f"未找到运行ID: {run_id}")
    return {"run_id": run.run_id, "note": run.note}


@app.get("/api/v1/runs/{run_id}/report", summary="获取人可读评审会报告（Markdown）")
async def api_get_report(run_id: str):
    storage = _get_storage()
    run = storage.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"未找到运行ID: {run_id}")
    reporter = ReportGenerator(run, storage)
    md = reporter.generate_human_readable_report()
    return {"run_id": run_id, "report_markdown": md}


@app.get("/api/v1/boundaries", summary="获取当前使用的边界配置")
async def api_get_boundaries(config_file: Optional[str] = None):
    try:
        cfg = load_boundaries(config_file)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"加载边界配置失败: {e}")

    def _rule_to_dict(rule):
        return {
            "min": rule.min,
            "max": rule.max,
            "min_inclusive": rule.min_inclusive,
            "max_inclusive": rule.max_inclusive,
            "description": rule.description,
        }

    conjugate = {}
    for dist, params in cfg.conjugate_priors.items():
        conjugate[dist] = {p: _rule_to_dict(r) for p, r in params.items()}

    return {
        "probability": _rule_to_dict(cfg.probability),
        "conjugate_priors": conjugate,
        "division_zero_tracking": cfg.division_zero_tracking,
    }


@app.get("/health", summary="健康检查")
async def health():
    return {"status": "ok", "service": "bayesian-prior-check"}
