from __future__ import annotations

import hashlib
import json
import re
from typing import List, Tuple, Dict, Any, Optional
from sqlalchemy.orm import Session
from datetime import datetime

from . import models, schemas

ERROR_THRESHOLD_WARNING = 0.01
ERROR_THRESHOLD_CRITICAL = 0.1


def compute_content_hash(row_data: Dict[str, Any]) -> str:
    canonical = json.dumps({
        "qid": str(row_data.get("question_id", "")).strip(),
        "qno": str(row_data.get("question_no", "")).strip(),
        "title": str(row_data.get("question_title", "")).strip(),
        "matrix": str(row_data.get("matrix_data", "")).strip()
    }, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def detect_empty_values(row: Dict[str, Any]) -> List[str]:
    required = ["question_title", "matrix_data", "eigenvalue_approx"]
    issues = []
    for field in required:
        val = str(row.get(field, "")).strip()
        if val == "" or val.lower() in {"nan", "none", "null"}:
            issues.append(field)
    return issues


def detect_remark_mixed(remark: str) -> bool:
    if not remark:
        return False
    patterns = [
        r"(待确认|通过|驳回|需复核)",
        r"(error|warning|ok)",
        r"(^\d+\.?\d*$)",
        r"[\[\（]\s*[^\]\）]*\s*[\]\）]",
    ]
    text = str(remark).strip()
    if not text:
        return False
    mix_count = 0
    for pat in patterns:
        if re.search(pat, text, re.IGNORECASE):
            mix_count += 1
    has_matrix_like = bool(re.search(r"[\[\]]", text))
    has_number = bool(re.search(r"\d+\.?\d*", text))
    has_status_word = bool(re.search(r"(待确认|通过|驳回|复核)", text))
    return (has_number and has_status_word) or mix_count >= 2 or (has_matrix_like and has_status_word)


def classify_error_level(error_value: float) -> str:
    try:
        err = abs(float(error_value))
    except (ValueError, TypeError):
        return "warning"
    if err >= ERROR_THRESHOLD_CRITICAL:
        return "critical"
    elif err >= ERROR_THRESHOLD_WARNING:
        return "warning"
    return "normal"


def parse_eigenvalue_str(val: str) -> List[float]:
    if not val:
        return []
    cleaned = re.sub(r"[\s\[\]（）]", "", str(val))
    parts = [p for p in re.split(r"[,，;；/]", cleaned) if p]
    result = []
    for p in parts:
        try:
            result.append(float(p))
        except ValueError:
            m = re.search(r"(-?\d+\.?\d*)", p)
            if m:
                try:
                    result.append(float(m.group(1)))
                except ValueError:
                    pass
    return result


def compute_error(exact: str, approx: str) -> float:
    exact_vals = parse_eigenvalue_str(exact)
    approx_vals = parse_eigenvalue_str(approx)
    if not exact_vals or not approx_vals:
        return 0.0
    n = min(len(exact_vals), len(approx_vals))
    if n == 0:
        return 0.0
    exact_sorted = sorted(exact_vals[:n])
    approx_sorted = sorted(approx_vals[:n])
    errors = [abs(a - b) for a, b in zip(exact_sorted, approx_sorted)]
    max_error = max(errors) if errors else 0.0
    if max_error == 0:
        return 0.0
    denom = max(abs(v) for v in exact_sorted) if exact_sorted else 1.0
    if denom == 0:
        denom = 1.0
    return round(max_error / denom, 6)


def find_duplicate(db: Session, content_hash: str) -> Tuple[Optional[models.QuestionRecord], List[models.QuestionRecord]]:
    same_hash = db.query(models.QuestionRecord).filter(
        models.QuestionRecord.content_hash == content_hash
    ).all()
    if not same_hash:
        return None, []
    primary = min(same_hash, key=lambda r: r.id)
    others = [r for r in same_hash if r.id != primary.id]
    return primary, others


def create_audit_log(db: Session, record_id: int, field_name: str,
                      old_value: str, new_value: str, operator: str = "排课老师",
                      operation: str = "update", comment: str = ""):
    log = models.AuditLog(
        record_id=record_id,
        field_name=field_name,
        old_value=str(old_value),
        new_value=str(new_value),
        operator=operator,
        operation=operation,
        comment=comment,
    )
    db.add(log)
