from typing import List, Dict, Optional
from collections import Counter, defaultdict
from datetime import datetime
from sqlalchemy.orm import Session
from var_backtest.models import (
    VarResult, AnomalyRecord, ValidationRecord, ImpactNotification
)
from var_backtest.validator import ActionRequired, AnomalySeverity


SEVERITY_ORDER = {
    AnomalySeverity.BLOCKER.value: 0,
    AnomalySeverity.CRITICAL.value: 1,
    AnomalySeverity.WARNING.value: 2,
    AnomalySeverity.INFO.value: 3,
}


def classify_anomalies(db: Session, backtest_run_id: Optional[int] = None) -> Dict:
    query = db.query(AnomalyRecord).filter(AnomalyRecord.resolution_status == "open")
    if backtest_run_id is not None:
        query = query.join(VarResult).filter(VarResult.backtest_run_id == backtest_run_id)
    anomalies = query.all()

    by_action: Dict[str, List[Dict]] = defaultdict(list)
    by_severity: Dict[str, List[Dict]] = defaultdict(list)
    by_question: Dict[str, List[Dict]] = defaultdict(list)

    for a in anomalies:
        item = {
            "id": a.id,
            "question_external_id": a.var_result.question_external_id if a.var_result else None,
            "anomaly_type": a.anomaly_type,
            "severity": a.severity,
            "action_required": a.action_required,
            "title": a.title,
            "detail": a.detail,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        by_action[a.action_required].append(item)
        by_severity[a.severity].append(item)
        if a.var_result:
            by_question[a.var_result.question_external_id].append(item)

    action_summary = []
    for action in sorted(ActionRequired):
        items = by_action.get(action.value, [])
        if items or action == ActionRequired.NO_ACTION:
            action_summary.append({
                "action_required": action.value,
                "count": len(items),
                "hint": _action_hint(action),
                "items": items,
            })

    severity_counts = {s.value: len(by_severity.get(s.value, [])) for s in AnomalySeverity}

    question_summary = []
    for qid, items in sorted(by_question.items()):
        blocker = any(i["severity"] == AnomalySeverity.BLOCKER.value for i in items)
        question_summary.append({
            "question_external_id": qid,
            "anomaly_count": len(items),
            "has_blocker": blocker,
            "actions_needed": sorted({i["action_required"] for i in items}),
            "items": items,
        })
    question_summary.sort(key=lambda x: (not x["has_blocker"], -x["anomaly_count"]))

    return {
        "total_open_anomalies": len(anomalies),
        "severity_counts": severity_counts,
        "by_action": action_summary,
        "by_question": question_summary,
    }


def _action_hint(action: ActionRequired) -> str:
    hints = {
        ActionRequired.SUPPLEMENT_MATERIAL: "补充历史数据 / 扩充样本 / 提供缺失的材料",
        ActionRequired.ADJUST_CALIBER: "调整计算口径 / 修改参数 / 复核方法论",
        ActionRequired.REGENERATE_CHART: "重新生成图表并验证哈希",
        ActionRequired.RE_CHECK: "人工复核 / 交叉验证 / 二次确认",
        ActionRequired.NO_ACTION: "无需处理",
    }
    return hints.get(action, "")


def build_researcher_dashboard(db: Session, backtest_run_id: Optional[int] = None) -> Dict:
    classification = classify_anomalies(db, backtest_run_id)

    impacted_notifications = (
        db.query(ImpactNotification)
        .filter(ImpactNotification.notified == False)
        .all()
    )
    impact_list = []
    for n in impacted_notifications:
        impact_list.append({
            "question_external_id": n.question_external_id,
            "impact_type": n.impact_type,
            "description": n.description,
            "needs_rerun": n.needs_rerun,
            "old_result_summary": n.old_result_summary,
        })

    needs_rerun = [i for i in impact_list if i["needs_rerun"]]
    info_only = [i for i in impact_list if not i["needs_rerun"]]

    return {
        "generated_at": datetime.utcnow().isoformat(),
        "anomaly_overview": {
            "total": classification["total_open_anomalies"],
            "blockers": classification["severity_counts"][AnomalySeverity.BLOCKER.value],
            "criticals": classification["severity_counts"][AnomalySeverity.CRITICAL.value],
            "warnings": classification["severity_counts"][AnomalySeverity.WARNING.value],
            "infos": classification["severity_counts"][AnomalySeverity.INFO.value],
        },
        "action_items": [
            {k: v for k, v in a.items() if k != "items"}
            for a in classification["by_action"]
            if a["count"] > 0 and a["action_required"] != ActionRequired.NO_ACTION.value
        ],
        "question_issues": classification["by_question"],
        "question_list_impact": {
            "total_notifications": len(impact_list),
            "needs_rerun_count": len(needs_rerun),
            "needs_rerun": needs_rerun,
            "info_only": info_only,
        },
    }


def build_operator_report(db: Session, backtest_run_id: int) -> Dict:
    run_results = db.query(VarResult).filter_by(backtest_run_id=backtest_run_id).all()

    total = len(run_results)
    extrapolation_count = sum(1 for r in run_results if r.is_extrapolation)
    extrapolation_breached = sum(1 for r in run_results if r.extrapolation_bounds_breached)
    answer_mismatch = sum(1 for r in run_results if r.answer_match is False)
    chart_missing = sum(1 for r in run_results if not r.chart_generated)

    extrapolation_details = []
    for r in run_results:
        if r.is_extrapolation or r.extrapolation_bounds_breached:
            extrapolation_details.append({
                "question_external_id": r.question_external_id,
                "var_value": r.var_value,
                "historical_var_value": r.historical_var_value,
                "is_extrapolation": r.is_extrapolation,
                "extrapolation_bounds_breached": r.extrapolation_bounds_breached,
                "explanation": _explain_extrapolation(r),
                "next_step": _next_step_for_result(r),
            })

    return {
        "generated_at": datetime.utcnow().isoformat(),
        "backtest_run_id": backtest_run_id,
        "summary": {
            "total_questions": total,
            "passed": total - extrapolation_breached - answer_mismatch - chart_missing,
            "extrapolation_count": extrapolation_count,
            "extrapolation_breached": extrapolation_breached,
            "answer_mismatch": answer_mismatch,
            "chart_missing": chart_missing,
        },
        "extrapolation_explanations": extrapolation_details,
        "blocking_issues_count": extrapolation_breached + answer_mismatch,
    }


def _explain_extrapolation(r: VarResult) -> str:
    if not r.is_extrapolation and not r.extrapolation_bounds_breached:
        return "样本充足，未触发外推"
    if r.is_extrapolation and not r.extrapolation_bounds_breached:
        return (
            f"由于历史数据不足，使用外推法估算 VaR。结果与历史答案差异在允许范围内。"
            f"建议：如有更多历史数据可补入以提升结果可靠性。"
        )
    if r.extrapolation_bounds_breached:
        ratio = (
            r.var_value / r.historical_var_value
            if r.historical_var_value and r.historical_var_value != 0
            else float("inf")
        )
        return (
            f"外推越界被拦截：估算值 {r.var_value:.6f} 与历史答案 {r.historical_var_value:.6f} "
            f"比值 {ratio:.2f}x 超过合理范围。原因：样本不足导致估计不稳定 / 市场环境发生结构性变化。"
            f"此结果已被标记为异常，不可直接用于出题。"
        )
    return ""


def _next_step_for_result(r: VarResult) -> str:
    if r.extrapolation_bounds_breached:
        return "下一步：先补材料（扩充历史样本），若样本已充足则改口径（调整外推参数）"
    if r.answer_match is False:
        return "下一步：复核数据（补材料），若数据无误则需要改口径"
    if not r.chart_generated:
        return "下一步：重出图，生成与结果一致的图表截图"
    if r.is_extrapolation:
        return "下一步：结果可用，建议后续补入更多数据提升稳定性"
    return "正常，无需处理"
