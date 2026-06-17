from __future__ import annotations

import csv
import io
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Any

from .evaluation import recompute_summary_from_results
from .models import (
    DriftReport,
    EvaluationVerdict,
    ExportFormat,
    QuestionEvalResult,
    ResultReadiness,
)

EXPORT_DIR = Path(__file__).resolve().parent.parent / "exports"
EXPORT_DIR.mkdir(parents=True, exist_ok=True)


VERDICT_LABELS = {
    EvaluationVerdict.PASS: "通过",
    EvaluationVerdict.FAIL: "未通过",
    EvaluationVerdict.PENDING_REVIEW: "待确认",
    EvaluationVerdict.NEEDS_SECURITY_REVIEW: "需安全审核员复核",
}

READINESS_LABELS = {
    ResultReadiness.DIRECTLY_USABLE: "直接可用",
    ResultReadiness.NEEDS_SECURITY_AUDITOR: "需安全审核员复核",
}


def _final_verdict(r: QuestionEvalResult) -> EvaluationVerdict:
    return r.human_verdict if r.human_verdict is not None else r.auto_verdict


def _verdict_label(r: QuestionEvalResult) -> str:
    return VERDICT_LABELS.get(_final_verdict(r), str(_final_verdict(r)))


def _readiness_label(r: QuestionEvalResult) -> str:
    return READINESS_LABELS.get(r.readiness, str(r.readiness))


def build_export_payload(report: DriftReport) -> Dict[str, Any]:
    synced_summary = recompute_summary_from_results(report)

    question_rows = []
    for r in report.question_results:
        question_rows.append(
            {
                "question_id": r.question_id,
                "question_text": r.question_text,
                "category": r.category.value,
                "baseline_model": r.baseline_model_version,
                "target_model": r.target_model_version,
                "cosine_distance": r.cosine_distance,
                "norm_diff": r.norm_diff,
                "drift_detected": r.drift_detected,
                "has_rule_misconfig": r.has_rule_misconfig,
                "security_checks": [
                    {
                        "rule_id": c.rule_id,
                        "rule_name": c.rule_name,
                        "status": c.status.value,
                        "message": c.message,
                    }
                    for c in r.security_checks
                ],
                "auto_verdict": r.auto_verdict.value,
                "human_verdict": r.human_verdict.value if r.human_verdict else None,
                "final_verdict": _final_verdict(r).value,
                "final_verdict_label": _verdict_label(r),
                "human_note": r.human_note,
                "human_corrected_by": r.human_corrected_by,
                "readiness": r.readiness.value,
                "readiness_label": _readiness_label(r),
            }
        )

    return {
        "summary": {
            "benchmark_id": synced_summary.benchmark_id,
            "benchmark_name": synced_summary.benchmark_name,
            "baseline_model": synced_summary.baseline_model,
            "target_model": synced_summary.target_model,
            "total_questions": synced_summary.total_questions,
            "drift_count": synced_summary.drift_count,
            "drift_rate": synced_summary.drift_rate,
            "security_rule_misconfig_count": synced_summary.security_rule_misconfig_count,
            "auto_pass_count": synced_summary.auto_pass_count,
            "auto_fail_count": synced_summary.auto_fail_count,
            "needs_security_review_count": synced_summary.needs_security_review_count,
            "directly_usable_count": synced_summary.directly_usable_count,
            "needs_auditor_count": synced_summary.needs_auditor_count,
            "overall_status": synced_summary.overall_status.value,
            "generated_at": synced_summary.generated_at.isoformat(),
        },
        "distribution": {
            "mean_norm": report.distribution.mean_norm,
            "std_norm": report.distribution.std_norm,
            "mean_cosine_similarity": report.distribution.mean_cosine_similarity,
            "ks_statistic": report.distribution.ks_statistic,
            "ks_p_value": report.distribution.ks_p_value,
            "dimension_wise_drift": report.distribution.dimension_wise_drift,
        },
        "question_results": question_rows,
    }


def export_json(report: DriftReport) -> Path:
    payload = build_export_payload(report)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = EXPORT_DIR / f"drift_report_{ts}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    return path


def export_csv(report: DriftReport) -> Path:
    payload = build_export_payload(report)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = EXPORT_DIR / f"drift_report_{ts}.csv"

    rows = payload["question_results"]
    if not rows:
        with open(path, "w", encoding="utf-8") as f:
            f.write("")
        return path

    fieldnames = list(rows[0].keys())
    fieldnames.remove("security_checks")
    fieldnames.append("security_checks_summary")

    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            checks = row.pop("security_checks", [])
            row["security_checks_summary"] = " | ".join(
                f"[{c['status']}] {c['rule_name']}: {c['message']}" for c in checks
            )
            writer.writerow(row)

    summary_path = EXPORT_DIR / f"drift_report_{ts}_summary.csv"
    summary = payload["summary"]
    with open(summary_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["指标", "数值"])
        for k, v in summary.items():
            writer.writerow([k, v])

    return path


def export_to_string(report: DriftReport, fmt: ExportFormat) -> str:
    payload = build_export_payload(report)
    if fmt == ExportFormat.JSON:
        return json.dumps(payload, ensure_ascii=False, indent=2)

    rows = payload["question_results"]
    output = io.StringIO()
    if not rows:
        return ""
    fieldnames = list(rows[0].keys())
    fieldnames.remove("security_checks")
    fieldnames.append("security_checks_summary")
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    for row in rows:
        checks = row.pop("security_checks", [])
        row["security_checks_summary"] = " | ".join(
            f"[{c['status']}] {c['rule_name']}: {c['message']}" for c in checks
        )
        writer.writerow(row)
    return output.getvalue()
