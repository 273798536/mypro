import csv
import json
from datetime import datetime
from typing import Any, Optional

from .models import (
    AnomalyRecord,
    AnomalyType,
    AuditEntry,
    CallRecord,
    CallStatus,
    CustomerTier,
    DispatchStrategy,
    FairnessMetrics,
    ScoreReport,
    StrategyComparison,
    StrategyName,
)
from .compare import rank_strategies


def _serialize_enum(obj: Any) -> Any:
    if isinstance(obj, (CustomerTier, CallStatus, StrategyName, AnomalyType)):
        return obj.value
    if isinstance(obj, list):
        return [_serialize_enum(i) for i in obj]
    if isinstance(obj, dict):
        return {k: _serialize_enum(v) for k, v in obj.items()}
    if hasattr(obj, "__dataclass_fields__"):
        result = {}
        for k, v in obj.__dict__.items():
            result[k] = _serialize_enum(v)
        return result
    return obj


def _call_to_flat_dict(call: CallRecord) -> dict:
    return {
        "call_id": call.call_id,
        "customer_id": call.customer.customer_id,
        "customer_tier": call.customer.tier.value,
        "required_skill": call.customer.required_skill or "",
        "arrival_time": call.arrival_time,
        "start_time": call.start_time or "",
        "end_time": call.end_time or "",
        "assigned_agent": call.assigned_agent.agent_id if call.assigned_agent else "",
        "status": call.status.value,
        "wait_time": call.wait_time or "",
        "service_time": call.service_time or "",
        "skill_matched": call.skill_matched if call.skill_matched is not None else "",
        "source": call.source,
        "audit_count": len(call.audit_trail),
    }


def export_report_json(report: ScoreReport, path: str) -> str:
    data = _serialize_enum(report)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, default=str)
    return path


def export_calls_csv(calls: list[CallRecord], path: str) -> str:
    if not calls:
        return path
    flat = [_call_to_flat_dict(c) for c in calls]
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=flat[0].keys())
        writer.writeheader()
        writer.writerows(flat)
    return path


def export_metrics_csv(comparisons: list[StrategyComparison], path: str) -> str:
    rows = []
    for comp in comparisons:
        m = comp.metrics
        rows.append({
            "strategy": comp.strategy.name.value,
            "jain_index": m.jain_index,
            "gini_coefficient": m.gini_coefficient,
            "vip_avg_wait": m.vip_avg_wait or "",
            "normal_avg_wait": m.normal_avg_wait or "",
            "low_avg_wait": m.low_avg_wait or "",
            "vip_squeeze_ratio": m.vip_squeeze_ratio or "",
            "p90_wait": m.p90_wait or "",
            "p99_wait": m.p99_wait or "",
            "long_tail_count": m.long_tail_count,
            "skill_mismatch_count": m.skill_mismatch_count,
            "abandon_count": m.abandon_count,
            "total_calls": m.total_calls,
        })
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    return path


def export_anomalies_csv(anomalies: list[AnomalyRecord], path: str) -> str:
    rows = []
    for a in anomalies:
        rows.append({
            "type": a.anomaly_type.value,
            "severity": a.severity,
            "description": a.description,
            "explanation": a.explanation,
            "affected_count": len(a.affected_calls),
            "affected_calls": ";".join(a.affected_calls[:10]),
            "source": a.source,
        })
    if not rows:
        return path
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    return path


def build_report(comparisons: list[StrategyComparison], report_id: Optional[str] = None) -> ScoreReport:
    if not report_id:
        report_id = f"RPT-{datetime.now().strftime('%Y%m%d%H%M%S')}"

    ranked = rank_strategies(comparisons)
    best_name = ranked[0][0] if ranked else None
    best_reason = ranked[0][2] if ranked else None

    all_anomalies = []
    for comp in comparisons:
        all_anomalies.extend(comp.anomalies)

    report = ScoreReport(
        report_id=report_id,
        created_at=datetime.now().isoformat(),
        strategies_compared=comparisons,
        best_strategy=best_name,
        best_reason=best_reason,
        anomalies_found=all_anomalies,
        source="report",
    )

    if best_name:
        report.audit_trail.append(AuditEntry(
            timestamp=datetime.now().isoformat(),
            action="rank",
            field="best_strategy",
            old_value=None,
            new_value=best_name,
            reason=best_reason or "",
            source="ranking",
        ))

    return report
