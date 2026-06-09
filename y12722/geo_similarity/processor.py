import os
import csv
from typing import List, Optional, Tuple

from .models import Triangle, JudgementRecord, ProcessingRecord
from .judgement import auto_judge, judge_sss, judge_sas, judge_aa, DEFAULT_TOLERANCE, DEFAULT_ANGLE_TOLERANCE


REQUIRED_COLUMNS = ["t1_a", "t1_b", "t1_c", "t2_a", "t2_b", "t2_c"]
OPTIONAL_COLUMNS = [
    "t1_angle_A", "t1_angle_B", "t1_angle_C",
    "t2_angle_A", "t2_angle_B", "t2_angle_C",
    "t1_label", "t2_label", "unit", "method",
]


def _to_float(val: str) -> Optional[float]:
    if val is None:
        return None
    s = str(val).strip()
    if s == "" or s.lower() in ("na", "nan", "none", "null"):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def parse_csv(file_path: str) -> Tuple[List[dict], List[str]]:
    rows = []
    errors = []
    if not os.path.exists(file_path):
        return rows, [f"文件不存在: {file_path}"]
    with open(file_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None:
            return rows, ["CSV 文件为空或缺少表头"]
        missing = [c for c in REQUIRED_COLUMNS if c not in reader.fieldnames]
        if missing:
            return rows, [f"CSV 缺少必要列: {', '.join(missing)}。必要列: {', '.join(REQUIRED_COLUMNS)}"]
        for i, row in enumerate(reader, start=2):
            try:
                parsed = {}
                for c in REQUIRED_COLUMNS + OPTIONAL_COLUMNS:
                    if c in row:
                        parsed[c] = row[c]
                parsed["_row"] = i
                rows.append(parsed)
            except Exception as e:
                errors.append(f"第 {i} 行解析失败: {e}")
    return rows, errors


def _build_triangle(row: dict, prefix: str) -> Triangle:
    return Triangle(
        a=_to_float(row.get(f"{prefix}_a", 0)) or 0.0,
        b=_to_float(row.get(f"{prefix}_b", 0)) or 0.0,
        c=_to_float(row.get(f"{prefix}_c", 0)) or 0.0,
        angle_A=_to_float(row.get(f"{prefix}_angle_A")),
        angle_B=_to_float(row.get(f"{prefix}_angle_B")),
        angle_C=_to_float(row.get(f"{prefix}_angle_C")),
        label=str(row.get(f"{prefix}_label", "") or ""),
        unit=str(row.get("unit", "cm") or "cm"),
    )


def process_csv(file_path: str, tolerance: float = DEFAULT_TOLERANCE,
                angle_tolerance: float = DEFAULT_ANGLE_TOLERANCE,
                force_method: Optional[str] = None) -> ProcessingRecord:
    pr = ProcessingRecord(
        source_file=os.path.abspath(file_path),
        tolerance=tolerance,
        angle_tolerance=angle_tolerance,
        status="processing",
    )
    rows, errors = parse_csv(file_path)
    for row in rows:
        t1 = _build_triangle(row, "t1")
        t2 = _build_triangle(row, "t2")
        method = (row.get("method") or force_method or "AUTO").upper()
        if method == "SSS":
            result = judge_sss(t1, t2, tolerance)
        elif method == "SAS":
            result = judge_sas(t1, t2, tolerance, angle_tolerance)
        elif method == "AA":
            result = judge_aa(t1, t2, angle_tolerance)
        else:
            result = auto_judge(t1, t2, tolerance, angle_tolerance)
        rec = JudgementRecord(
            triangle_1=t1,
            triangle_2=t2,
            result=result,
            source_row=row.get("_row"),
            source_file=os.path.abspath(file_path),
        )
        pr.judgement_records.append(rec)
    if errors:
        pr.status = "partial"
    else:
        pr.status = "done"
    return pr
