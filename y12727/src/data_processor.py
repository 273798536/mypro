from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any, Tuple
import pandas as pd
import numpy as np
import uuid
from datetime import datetime
from .power_calc import (
    PowerResult,
    sample_size_proportion,
    power_proportion,
    sample_size_mean,
    power_mean,
    VALID_PARAM_RANGES,
    _check_extrapolation as _calc_check_extrapolation,
)


@dataclass
class StudentRecord:
    record_id: str
    student_id: str
    question_id: str
    test_type: str
    params: Dict[str, Any]
    status: str = "pending"
    result: Optional[PowerResult] = None
    error_msg: str = ""
    warnings: List[str] = field(default_factory=list)
    extrapolation_warning: str = ""
    history_ref: str = ""
    editor_note: str = ""
    sort_key: int = 0


REQUIRED_COLUMNS = {
    "proportion": ["p1", "p2"],
    "mean": ["delta", "sd"],
}


def _check_extrapolation(param_name: str, value: float) -> str:
    return _calc_check_extrapolation(param_name, value)


def _validate_row(row: pd.Series) -> Tuple[bool, List[str], str]:
    test_type = str(row.get("test_type", "")).strip().lower()
    missing = []
    if test_type not in REQUIRED_COLUMNS:
        return False, [f"未知 test_type: {test_type}"], "test_type 无效"
    for col in REQUIRED_COLUMNS[test_type]:
        if col not in row or pd.isna(row[col]):
            missing.append(col)
    if missing:
        return False, missing, f"缺少必需列: {', '.join(missing)}"
    return True, [], ""


def parse_student_dataframe(df: pd.DataFrame) -> Tuple[List[StudentRecord], List[Dict]]:
    records: List[StudentRecord] = []
    gap_list: List[Dict] = []

    default_cols = {"alpha": 0.05, "power": 0.8, "alternative": "two-sided",
                    "allocation_ratio": 1.0, "calc_mode": "sample_size"}

    for idx, row in df.iterrows():
        record_id = str(row.get("record_id", "")) or str(uuid.uuid4())[:8]
        student_id = str(row.get("student_id", "")) or "未知学生"
        question_id = str(row.get("question_id", "")) or "未知题目"
        test_type = str(row.get("test_type", "proportion")).strip().lower()

        valid, issues, err = _validate_row(row)
        sort_key = int(row.get("sort_key", idx)) if "sort_key" in row and not pd.isna(row.get("sort_key")) else idx

        params: Dict[str, Any] = {}
        for k, v in default_cols.items():
            params[k] = row[k] if k in row and not pd.isna(row[k]) else v
        for col in REQUIRED_COLUMNS.get(test_type, []):
            if col in row and not pd.isna(row[col]):
                try:
                    params[col] = float(row[col])
                except (ValueError, TypeError):
                    issues.append(f"{col} 不是数字")
                    valid = False

        if not valid:
            gap_list.append({
                "record_id": record_id,
                "student_id": student_id,
                "question_id": question_id,
                "row_index": idx,
                "missing_fields": issues,
                "error": err,
            })
            records.append(StudentRecord(
                record_id=record_id,
                student_id=student_id,
                question_id=question_id,
                test_type=test_type,
                params=params,
                status="missing_data",
                error_msg=err,
                warnings=issues,
                sort_key=sort_key,
            ))
            continue

        records.append(StudentRecord(
            record_id=record_id,
            student_id=student_id,
            question_id=question_id,
            test_type=test_type,
            params=params,
            sort_key=sort_key,
        ))

    return records, gap_list


def process_records(records: List[StudentRecord]) -> List[StudentRecord]:
    for rec in records:
        if rec.status == "missing_data":
            continue
        try:
            extra_list = []
            for pname, pval in rec.params.items():
                if isinstance(pval, (int, float)) and not isinstance(pval, bool):
                    ew = _check_extrapolation(pname, float(pval))
                    if ew:
                        extra_list.append(ew)
            if extra_list:
                rec.extrapolation_warning = "; ".join(extra_list)

            if rec.test_type == "proportion":
                if rec.params.get("calc_mode", "sample_size") == "sample_size":
                    r = sample_size_proportion(
                        p1=rec.params["p1"],
                        p2=rec.params["p2"],
                        alpha=rec.params.get("alpha", 0.05),
                        power=rec.params.get("power", 0.8),
                        alternative=rec.params.get("alternative", "two-sided"),
                        allocation_ratio=rec.params.get("allocation_ratio", 1.0),
                    )
                else:
                    n1 = int(rec.params.get("n1", 50))
                    n2 = int(rec.params.get("n2", n1))
                    r = power_proportion(
                        p1=rec.params["p1"],
                        p2=rec.params["p2"],
                        n1=n1, n2=n2,
                        alpha=rec.params.get("alpha", 0.05),
                        alternative=rec.params.get("alternative", "two-sided"),
                    )
            else:
                if rec.params.get("calc_mode", "sample_size") == "sample_size":
                    r = sample_size_mean(
                        delta=rec.params["delta"],
                        sd=rec.params["sd"],
                        alpha=rec.params.get("alpha", 0.05),
                        power=rec.params.get("power", 0.8),
                        alternative=rec.params.get("alternative", "two-sided"),
                        allocation_ratio=rec.params.get("allocation_ratio", 1.0),
                    )
                else:
                    n1 = int(rec.params.get("n1", 50))
                    n2 = int(rec.params.get("n2", n1))
                    r = power_mean(
                        delta=rec.params["delta"],
                        sd=rec.params["sd"],
                        n1=n1, n2=n2,
                        alpha=rec.params.get("alpha", 0.05),
                        alternative=rec.params.get("alternative", "two-sided"),
                    )
            rec.result = r
            rec.warnings = list(set(rec.warnings + r.warnings))
            rec.status = "success" if not rec.warnings else "warning"
        except Exception as e:
            rec.status = "error"
            rec.error_msg = str(e)
    return records


def stable_sort_records(records: List[StudentRecord]) -> List[StudentRecord]:
    def _sort_tuple(r):
        return (
            r.sort_key,
            r.student_id,
            r.question_id,
            r.record_id,
        )
    result = list(records)
    result.sort(key=_sort_tuple)
    return result


def records_to_dataframe(records: List[StudentRecord]) -> pd.DataFrame:
    rows = []
    for r in records:
        row = {
            "record_id": r.record_id,
            "student_id": r.student_id,
            "question_id": r.question_id,
            "test_type": r.test_type,
            "status": r.status,
            "sort_key": r.sort_key,
            "effect_size": r.result.effect_size if r.result else None,
            "alpha": r.result.alpha if r.result else None,
            "sample_size_n1": r.result.n1 if r.result else None,
            "sample_size_n2": r.result.n2 if r.result else None,
            "power": r.result.power if r.result else None,
            "alternative": r.result.alternative if r.result else None,
            "warnings": "; ".join(r.warnings),
            "extrapolation_warning": r.extrapolation_warning,
            "error_msg": r.error_msg,
            "history_ref": r.history_ref,
            "editor_note": r.editor_note,
            "calc_notes": "; ".join(r.result.notes) if r.result else "",
        }
        row.update(r.params)
        rows.append(row)
    return pd.DataFrame(rows)
