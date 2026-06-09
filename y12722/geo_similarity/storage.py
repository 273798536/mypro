import json
import os
from typing import List, Optional
from datetime import datetime

from .models import ProcessingRecord, JudgementRecord, Triangle, JudgementResult


STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
os.makedirs(STORAGE_DIR, exist_ok=True)


def _triangle_from_dict(d: dict) -> Triangle:
    return Triangle(
        a=d["a"],
        b=d["b"],
        c=d["c"],
        angle_A=d.get("angle_A"),
        angle_B=d.get("angle_B"),
        angle_C=d.get("angle_C"),
        label=d.get("label", ""),
        unit=d.get("unit", "cm"),
    )


def _result_from_dict(d: Optional[dict]) -> Optional[JudgementResult]:
    if d is None:
        return None
    return JudgementResult(
        is_similar=d.get("is_similar"),
        method=d.get("method", ""),
        formula=d.get("formula", ""),
        scope=d.get("scope", ""),
        details=d.get("details", {}),
        error_reason=d.get("error_reason"),
        warning=d.get("warning"),
        error_magnitude=d.get("error_magnitude", 0.0),
    )


def _record_from_dict(d: dict) -> JudgementRecord:
    return JudgementRecord(
        record_id=d.get("record_id", ""),
        timestamp=d.get("timestamp", ""),
        triangle_1=_triangle_from_dict(d["triangle_1"]),
        triangle_2=_triangle_from_dict(d["triangle_2"]),
        result=_result_from_dict(d.get("result")),
        source_row=d.get("source_row"),
        source_file=d.get("source_file"),
        reviewed=d.get("reviewed", False),
        review_note=d.get("review_note"),
        screenshot_path=d.get("screenshot_path"),
    )


def load_processing_record(batch_id: str) -> Optional[ProcessingRecord]:
    path = os.path.join(STORAGE_DIR, f"batch_{batch_id}.json")
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    pr = ProcessingRecord(
        batch_id=data.get("batch_id", ""),
        created_at=data.get("created_at", ""),
        source_file=data.get("source_file", ""),
        tolerance=data.get("tolerance", 1e-4),
        angle_tolerance=data.get("angle_tolerance", 0.01),
        status=data.get("status", "pending"),
    )
    pr.judgement_records = [_record_from_dict(r) for r in data.get("judgement_records", [])]
    return pr


def save_processing_record(pr: ProcessingRecord) -> str:
    path = os.path.join(STORAGE_DIR, f"batch_{pr.batch_id}.json")
    data = {
        "batch_id": pr.batch_id,
        "created_at": pr.created_at,
        "source_file": pr.source_file,
        "tolerance": pr.tolerance,
        "angle_tolerance": pr.angle_tolerance,
        "status": pr.status,
        "judgement_records": [r.to_dict() for r in pr.judgement_records],
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return path


def list_batches() -> List[dict]:
    batches = []
    for fname in os.listdir(STORAGE_DIR):
        if fname.startswith("batch_") and fname.endswith(".json"):
            batch_id = fname[len("batch_"):-len(".json")]
            pr = load_processing_record(batch_id)
            if pr:
                batches.append(pr.summary())
    batches.sort(key=lambda b: b.get("batch_id", ""), reverse=True)
    return batches


def update_review(batch_id: str, record_id: str, review_note: str,
                  reviewed: bool = True, override_result: Optional[bool] = None) -> Optional[JudgementRecord]:
    pr = load_processing_record(batch_id)
    if pr is None:
        return None
    rec = pr.find_record(record_id)
    if rec is None:
        return None
    rec.reviewed = reviewed
    rec.review_note = review_note
    if override_result is not None and rec.result is not None:
        original = rec.result.is_similar
        rec.result.is_similar = override_result
        if rec.result.warning is None:
            rec.result.warning = ""
        rec.result.warning += f" [复核修正: {original} -> {override_result}]"
    save_processing_record(pr)
    return rec


def trace_record(batch_id: str, record_id: str) -> Optional[dict]:
    pr = load_processing_record(batch_id)
    if pr is None:
        return None
    rec = pr.find_record(record_id)
    if rec is None:
        return None
    return {
        "batch": pr.summary(),
        "record": rec.to_dict(),
        "trace": {
            "source_file": rec.source_file,
            "source_row": rec.source_row,
            "record_id": rec.record_id,
            "timestamp": rec.timestamp,
            "reviewed": rec.reviewed,
            "review_note": rec.review_note,
            "screenshot_path": rec.screenshot_path,
        },
    }
