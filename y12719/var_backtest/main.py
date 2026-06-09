from typing import List, Optional, Dict
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import numpy as np

from var_backtest.database import get_db
from var_backtest import models, schemas
from var_backtest.var_calculator import (
    HistoricalVaRCalculator, check_answer_match, generate_sample_returns
)
from var_backtest.validator import IncrementalValidator
from var_backtest.question_diff import QuestionListDiffDetector
from var_backtest.charting import sync_chart_with_result, generate_var_chart, chart_to_base64
from var_backtest.reporting import (
    build_researcher_dashboard, build_operator_report, classify_anomalies
)
from var_backtest.exporter import export_html_report

app = FastAPI(
    title="风险价值分位回测系统",
    description="风险价值 (VaR) 分位回测：支持历史模拟法、外推越界检测、增量校验、图表联动、分级异常报告、题目清单差异检测",
    version="1.0.0",
)


@app.post("/api/question-lists", response_model=Dict, summary="导入题目清单")
def import_question_list(payload: schemas.QuestionListInput, db: Session = Depends(get_db)):
    existing = db.query(models.QuestionList).filter_by(batch_id=payload.batch_id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"批次 {payload.batch_id} 已存在")

    db.query(models.QuestionList).update({models.QuestionList.is_current: False})

    ql = models.QuestionList(
        batch_id=payload.batch_id,
        name=payload.name,
        version=payload.version,
        meta=payload.meta or {},
        is_current=True,
    )
    for q in payload.questions:
        ql.questions.append(models.Question(
            question_id=q.question_id,
            title=q.title,
            content=q.content,
            quantile=q.quantile,
            var_level=q.var_level or q.quantile,
            window=q.window,
            params=q.params or {},
        ))
    db.add(ql)
    db.commit()
    db.refresh(ql)

    detector = QuestionListDiffDetector(db)
    diff_report = detector.detect_and_report(ql, auto_notify=True)
    impact_summary = detector.summarize_impact(diff_report)

    return {
        "question_list_id": ql.id,
        "batch_id": ql.batch_id,
        "question_count": len(ql.questions),
        "impact_summary": impact_summary,
    }


@app.get("/api/question-lists/{batch_id}/impact", response_model=Dict, summary="查询题目清单变更影响")
def get_question_list_impact(batch_id: str, db: Session = Depends(get_db)):
    notifications = (
        db.query(models.ImpactNotification)
        .join(models.QuestionList, models.ImpactNotification.new_question_list_id == models.QuestionList.id)
        .filter(models.QuestionList.batch_id == batch_id)
        .all()
    )
    items = [
        {
            "question_external_id": n.question_external_id,
            "impact_type": n.impact_type,
            "description": n.description,
            "needs_rerun": n.needs_rerun,
            "old_result_summary": n.old_result_summary,
        }
        for n in notifications
    ]
    needs_rerun = [i for i in items if i["needs_rerun"]]
    return {
        "batch_id": batch_id,
        "total_notifications": len(items),
        "needs_rerun_count": len(needs_rerun),
        "needs_rerun": needs_rerun,
        "all_notifications": items,
    }


@app.post("/api/backtest/runs", response_model=Dict, summary="执行回测")
def run_backtest(payload: schemas.BacktestRunInput, db: Session = Depends(get_db)):
    question_list = None
    if payload.question_list_batch_id:
        question_list = (
            db.query(models.QuestionList)
            .filter_by(batch_id=payload.question_list_batch_id)
            .first()
        )
        if not question_list:
            raise HTTPException(status_code=404, detail=f"题目清单 {payload.question_list_batch_id} 不存在")

    run = models.BacktestRun(
        batch_id=payload.batch_id,
        question_list_id=question_list.id if question_list else None,
        status="running",
        triggered_by=payload.triggered_by,
        notes=payload.notes,
    )
    db.add(run)
    db.flush()

    qmap = {}
    if question_list:
        qmap = {q.question_id: q for q in question_list.questions}

    results: List[Dict] = []
    validator = IncrementalValidator(db)
    validator.ensure_rules_exist()

    for qd in payload.question_data:
        question_obj = qmap.get(qd.question_id)
        quantile = question_obj.quantile if question_obj else 0.95
        window = question_obj.window if question_obj else 252

        calc = HistoricalVaRCalculator(quantile=quantile, window=window)
        returns_arr = np.asarray(qd.returns, dtype=float)
        var_res = calc.calculate(returns_arr, historical_var=qd.historical_var_value)
        answer_match = check_answer_match(var_res.var_value, qd.historical_var_value)

        vr = models.VarResult(
            backtest_run_id=run.id,
            question_id=question_obj.id if question_obj else None,
            question_external_id=qd.question_id,
            var_value=var_res.var_value,
            var_lower=var_res.var_lower,
            var_upper=var_res.var_upper,
            var_expected=qd.historical_var_value,
            historical_var_value=qd.historical_var_value,
            historical_var_source=qd.historical_var_source,
            is_extrapolation=var_res.is_extrapolation,
            extrapolation_bounds_breached=var_res.extrapolation_bounds_breached,
            answer_match=answer_match,
        )
        db.add(vr)
        db.flush()

        chart_info = sync_chart_with_result(db, vr, returns_arr, quantile=quantile)

        outcomes = validator.validate_result(
            vr, incremental=True, context={"sample_size": var_res.sample_size}
        )

        anomalies = [
            {
                "rule_code": o.rule_code,
                "passed": o.passed,
                "severity": o.severity,
                "action_required": o.action_required.value if hasattr(o.action_required, "value") else o.action_required,
                "detail": o.detail,
            }
            for o in outcomes if not o.passed
        ]

        results.append({
            "var_result_id": vr.id,
            "question_external_id": qd.question_id,
            "var_value": vr.var_value,
            "var_confidence_interval": [vr.var_lower, vr.var_upper],
            "is_extrapolation": vr.is_extrapolation,
            "extrapolation_bounds_breached": vr.extrapolation_bounds_breached,
            "answer_match": vr.answer_match,
            "chart_path": chart_info["chart_path"],
            "chart_verified": chart_info["chart_verified"],
            "anomalies": anomalies,
        })

    run.status = "completed"
    run.finished_at = datetime.utcnow()
    db.commit()

    return {
        "backtest_run_id": run.id,
        "batch_id": run.batch_id,
        "status": run.status,
        "results": results,
    }


@app.post("/api/backtest/runs/{run_id}/revalidate", response_model=Dict, summary="对回测结果增量重校验")
def revalidate_run(run_id: int, db: Session = Depends(get_db)):
    run = db.query(models.BacktestRun).filter_by(id=run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="回测运行不存在")

    validator = IncrementalValidator(db)
    total_issues = 0
    per_question = {}

    for vr in run.results:
        outcomes = validator.validate_result(vr, incremental=True)
        failed = [o for o in outcomes if not o.passed]
        total_issues += len(failed)
        per_question[vr.question_external_id] = [
            {
                "rule_code": o.rule_code,
                "action_required": o.action_required.value if hasattr(o.action_required, "value") else o.action_required,
                "detail": o.detail,
            }
            for o in failed
        ]

    return {
        "backtest_run_id": run_id,
        "total_new_issues": total_issues,
        "per_question": per_question,
    }


@app.post("/api/var-results/{result_id}/chart", response_model=Dict, summary="(重)生成并联动图表")
def regenerate_chart(result_id: int, db: Session = Depends(get_db)):
    vr = db.query(models.VarResult).filter_by(id=result_id).first()
    if not vr:
        raise HTTPException(status_code=404, detail="结果不存在")

    returns = generate_sample_returns(500)
    quantile = 0.95
    if vr.question:
        quantile = vr.question.quantile

    info = sync_chart_with_result(db, vr, returns, quantile=quantile)

    validator = IncrementalValidator(db)
    validator.validate_result(vr, incremental=False)

    return info


@app.get("/api/anomalies", response_model=Dict, summary="查询分级异常（教研编辑视图）")
def list_anomalies(
    run_id: Optional[int] = Query(None),
    action_required: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    dashboard = build_researcher_dashboard(db, run_id)
    if action_required:
        dashboard["action_items"] = [
            a for a in dashboard["action_items"] if a["action_required"] == action_required
        ]
    return dashboard


@app.get("/api/backtest/runs/{run_id}/operator-report", response_model=Dict, summary="运营导出报告视图")
def get_operator_report(run_id: int, db: Session = Depends(get_db)):
    run = db.query(models.BacktestRun).filter_by(id=run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="回测运行不存在")
    return build_operator_report(db, run_id)


@app.post("/api/backtest/runs/{run_id}/export", response_model=Dict, summary="导出 HTML + JSON 报告")
def export_report(run_id: int, db: Session = Depends(get_db)):
    run = db.query(models.BacktestRun).filter_by(id=run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="回测运行不存在")
    return export_html_report(db, run_id, run.batch_id)


@app.post("/api/anomalies/{anomaly_id}/resolve", response_model=Dict, summary="标记异常已处理")
def resolve_anomaly(anomaly_id: int, note: str = "", db: Session = Depends(get_db)):
    a = db.query(models.AnomalyRecord).filter_by(id=anomaly_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="异常不存在")
    a.resolution_status = "resolved"
    a.resolution_note = note
    a.resolved_at = datetime.utcnow()
    db.commit()
    return {"status": "resolved", "id": anomaly_id}


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "var-backtest"}
