import json
from datetime import datetime


def generate_report(store, output_path: str = None) -> str:
    report = {
        "report_title": "协同过滤相似度诊断报告",
        "generated_at": datetime.now().isoformat(),
        "data_version": store.data_version,
        "summary": _build_summary(store),
        "cold_starts": _build_cold_start_section(store),
        "diagnoses": _build_diagnosis_section(store),
        "corrections": _build_correction_section(store),
        "exposure_impact": store.get_changed_after_exposure(),
        "similarities": _build_similarity_section(store),
        "routing": _build_routing_section(store),
    }

    text = json.dumps(report, ensure_ascii=False, indent=2)

    if output_path:
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(text)

    return text


def _build_summary(store) -> dict:
    total = len(store.similarity_results)
    confirmed = sum(1 for s in store.similarity_results.values() if s.status == "confirmed")
    pending = sum(1 for s in store.similarity_results.values() if s.status == "pending")
    corrected = sum(1 for s in store.similarity_results.values() if s.correction_id)
    cold = sum(1 for s in store.similarity_results.values() if s.is_cold_start)

    return {
        "total_similarity_pairs": total,
        "confirmed": confirmed,
        "pending_cold_start": pending,
        "corrected": corrected,
        "cold_start_affected": cold,
        "total_corrections": len(store.corrections),
        "total_diagnoses": len(store.diagnoses),
    }


def _build_cold_start_section(store) -> list:
    return [
        {
            "item_id": r.item_id,
            "reason": r.reason,
            "status": r.status,
            "assigned_to": r.assigned_to,
        }
        for r in store.cold_starts.values()
    ]


def _build_diagnosis_section(store) -> list:
    return [
        {
            "type": d.diag_type,
            "severity": d.severity,
            "details": d.details,
            "next_step": d.next_step,
            "contact": d.next_contact,
        }
        for d in store.diagnoses
    ]


def _build_correction_section(store) -> list:
    return [
        {
            "correction_id": c.correction_id,
            "timestamp": c.timestamp,
            "field": c.field,
            "old_value": c.old_value,
            "new_value": c.new_value,
            "reason": c.reason,
            "operator": c.operator,
        }
        for c in store.corrections
    ]


def _build_similarity_section(store) -> list:
    return [
        {
            "item_a": s.item_a,
            "item_b": s.item_b,
            "method": s.method,
            "score": s.score,
            "is_cold_start": s.is_cold_start,
            "status": s.status,
            "data_version": s.data_version,
            "correction_id": s.correction_id,
        }
        for s in store.similarity_results.values()
    ]


def _build_routing_section(store) -> dict:
    from cf_diag.diagnosis.routing import build_routing
    return {"routes": build_routing(store)}
