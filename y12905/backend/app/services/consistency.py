import hashlib
import json
import orjson
from typing import Dict, Any, List, Tuple
from sqlalchemy.orm import Session
from .. import models, crud


def _canonical_json(data: Any) -> bytes:
    return orjson.dumps(data, option=orjson.OPT_SORT_KEYS)


def build_summary_from_diffs(diffs: List[Dict[str, Any]]) -> Dict[str, Any]:
    decision_counts = {"APPROVED": 0, "REVIEW_REQUIRED": 0, "RERUN": 0}
    for d in diffs:
        key = d.get("decision") or "REVIEW_REQUIRED"
        if key in decision_counts:
            decision_counts[key] += 1
    return {
        "total_samples": len(diffs),
        "approved": decision_counts["APPROVED"],
        "review_required": decision_counts["REVIEW_REQUIRED"],
        "rerun": decision_counts["RERUN"],
        "decision_counts": decision_counts,
    }


def build_compare_summary(db: Session, compare: models.GrayCompareTask) -> Dict[str, Any]:
    diffs = crud.compute_sample_diffs(db, compare)
    metrics = dict(compare.metrics_summary or {})
    decisions_summary = build_summary_from_diffs(diffs)
    return {
        "compare_id": compare.id,
        "version_a_id": compare.version_a_id,
        "version_b_id": compare.version_b_id,
        "consistency_flag": compare.consistency_flag,
        "metrics": metrics,
        "decisions": decisions_summary,
    }


def compute_summary_hash(db: Session, compare: models.GrayCompareTask) -> str:
    summary = build_compare_summary(db, compare)
    canonical = _canonical_json(summary)
    return hashlib.md5(canonical).hexdigest()


def verify_export_consistency(
    db: Session, compare: models.GrayCompareTask, export_rows: List[Dict[str, Any]]
) -> Tuple[bool, str, str]:
    file_summary = build_summary_from_diffs(export_rows)
    db_summary = build_compare_summary(db, compare)
    combined = {"file": file_summary, "db": db_summary["decisions"]}
    canonical = _canonical_json(combined)
    checksum = hashlib.md5(canonical).hexdigest()
    db_hash = compute_summary_hash(db, compare)
    file_hash = hashlib.md5(_canonical_json({"decisions": file_summary, "metrics": db_summary["metrics"]})).hexdigest()
    valid = file_summary["total_samples"] == db_summary["decisions"]["total_samples"] and \
            file_summary["approved"] == db_summary["decisions"]["approved"] and \
            file_summary["review_required"] == db_summary["decisions"]["review_required"] and \
            file_summary["rerun"] == db_summary["decisions"]["rerun"]
    return valid, db_hash, checksum
