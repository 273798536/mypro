from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import StreamingResponse, JSONResponse
import io

from models import (
    CallRecord, Agent, DispatchStrategyConfig,
    FairnessScoreResult, PendingConfirmationItem,
    StrategySupplementLog
)
from store import store
from fairness_service import fairness_service
from report_generator import report_generator
from data_seed import seed_sample_data

app = FastAPI(title="排队公平性评分API", version="1.0.0")

seed_sample_data()


@app.get("/")
async def root():
    return {
        "message": "排队公平性评分API",
        "endpoints": {
            "GET /fairness/score": "计算排队公平性评分",
            "GET /fairness/pending": "获取待确认异常列表",
            "POST /fairness/confirm/{item_id}": "确认待处理异常",
            "POST /strategy/supplement/{strategy_id}": "补录派单策略并追踪结论变更",
            "GET /strategy/comparison": "获取各策略公平性评分对比",
            "GET /report/download": "下载公平性报告",
            "POST /calls": "添加上来电记录",
            "GET /calls": "获取来电记录列表"
        }
    }


@app.get("/fairness/score", response_model=FairnessScoreResult)
async def get_fairness_score(
    start_date: Optional[str] = Query(None, description="开始日期，格式: YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="结束日期，格式: YYYY-MM-DD")
):
    time_range = None
    if start_date and end_date:
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d")
            end = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            time_range = (start, end)
        except ValueError:
            raise HTTPException(status_code=400, detail="日期格式错误，请使用 YYYY-MM-DD 格式")

    result = fairness_service.calculate_fairness_score(time_range)
    return result


@app.get("/fairness/pending")
async def get_pending_confirmations():
    summary = fairness_service.get_pending_confirmation_summary()
    return summary


@app.post("/fairness/confirm/{item_id}")
async def confirm_pending_item(item_id: str, confirmed_by: str = Query(..., description="确认人")):
    success = fairness_service.confirm_pending_item(item_id, confirmed_by)
    if not success:
        raise HTTPException(status_code=404, detail="待确认项不存在")
    return {"success": True, "message": f"异常项 {item_id} 已由 {confirmed_by} 确认"}


@app.post("/strategy/supplement/{strategy_id}")
async def supplement_strategy(
    strategy_id: str,
    operator: str = Query(..., description="操作人")
):
    try:
        log = fairness_service.supplement_strategy_and_track_changes(strategy_id, operator)
        return {
            "success": True,
            "log_id": log.log_id,
            "affected_calls_count": len(log.affected_calls),
            "conclusion_changes_count": len(log.conclusion_changes),
            "affected_calls": log.affected_calls,
            "conclusion_changes": [
                {
                    "call_id": c.call_id,
                    "original": c.original_conclusion,
                    "new": c.new_conclusion,
                    "reason": c.change_reason
                }
                for c in log.conclusion_changes
            ]
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/strategy/comparison")
async def get_strategy_comparison():
    comparison = fairness_service.recalculate_strategy_comparison()
    return {
        "comparison": comparison,
        "best_strategy": max(comparison.items(), key=lambda x: x[1])[0] if comparison else None
    }


@app.get("/strategy/logs")
async def get_supplement_logs():
    logs = fairness_service.get_supplement_logs()
    return {"logs": logs}


@app.get("/report/download")
async def download_report(format: str = Query("json", description="下载格式: json 或 csv")):
    score_result = fairness_service.calculate_fairness_score()
    report, terminal_summary = report_generator.generate_download_report(score_result)

    print("\n" + terminal_summary + "\n")

    if format.lower() == "csv":
        output = report_generator.export_to_csv(report)
        response = StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv; charset=utf-8"
        )
        response.headers["Content-Disposition"] = f"attachment; filename=fairness_report_{report.report_id}.csv"
        return response
    else:
        json_content = report_generator.export_to_json(report)
        response = JSONResponse(content=json_content)
        response.headers["Content-Disposition"] = f"attachment; filename=fairness_report_{report.report_id}.json"
        return response


@app.post("/calls", response_model=CallRecord)
async def add_call(call: CallRecord):
    store.add_call_record(call)
    return call


@app.get("/calls", response_model=List[CallRecord])
async def get_calls():
    return store.get_all_calls()


@app.post("/agents", response_model=Agent)
async def add_agent(agent: Agent):
    store.add_agent(agent)
    return agent


@app.get("/agents", response_model=List[Agent])
async def get_agents():
    return store.get_all_agents()


@app.post("/strategies", response_model=DispatchStrategyConfig)
async def add_strategy(strategy: DispatchStrategyConfig):
    store.add_strategy(strategy)
    return strategy


@app.get("/strategies", response_model=List[DispatchStrategyConfig])
async def get_strategies():
    return store.get_all_strategies()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
