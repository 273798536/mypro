import hashlib
import re
import uuid
from datetime import datetime
from typing import List, Tuple, Optional, Dict, Any
from io import BytesIO

import pandas as pd
from sqlalchemy.orm import Session

from app.models.models import ImportBatch, ScoreRecord, DataIssue


def generate_batch_no() -> str:
    return f"BATCH{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:6].upper()}"


def compute_file_hash(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def clean_remark(raw: Optional[str]) -> str:
    if raw is None:
        return ""
    text = str(raw).strip()
    text = re.sub(r"\s+", " ", text)
    return text


def parse_numeric_value(val: Any) -> Optional[float]:
    if val is None:
        return None
    if isinstance(val, (int, float)):
        if pd.isna(val):
            return None
        return float(val)
    s = str(val).strip()
    if not s:
        return None
    s = re.sub(r"[^\d.\-]", "", s)
    if not s or s in ("-", ".", "-."):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def normalize_str(val: Any) -> str:
    if val is None:
        return ""
    if isinstance(val, float) and pd.isna(val):
        return ""
    return str(val).strip()


def build_dedup_key(row: Dict[str, Any]) -> str:
    parts = [
        normalize_str(row.get("student_id")) or normalize_str(row.get("学号")) or normalize_str(row.get("学生ID")),
        normalize_str(row.get("subject")) or normalize_str(row.get("科目")) or normalize_str(row.get("学科")),
        normalize_str(row.get("unit_name")) or normalize_str(row.get("单元")) or normalize_str(row.get("章节")),
    ]
    return "||".join(p for p in parts if p)


COLUMN_MAPPING = {
    "student_id": ["学号", "学生ID", "student_id", "id", "学生学号"],
    "student_name": ["姓名", "学生姓名", "student_name", "name"],
    "class_name": ["班级", "class_name", "class"],
    "subject": ["科目", "学科", "subject"],
    "unit_name": ["单元", "章节", "unit", "unit_name", "单元名称"],
    "score_origin": ["原始分", "原始分数", "原分", "score_origin", "original_score"],
    "score_extrapolated": ["外推分", "多项式外推分", "外推分数", "score_extrapolated", "extrapolated_score"],
    "alarm_level": ["警报等级", "预警等级", "alarm_level", "alarm"],
    "alarm_flag": ["警报标记", "是否预警", "警报", "alarm_flag", "flag"],
    "remark_raw": ["备注", "说明", "remark", "remark_raw", "note", "notes"],
}


def _match_column(df_columns: List[str], candidates: List[str]) -> Optional[str]:
    lower_map = {str(c).strip(): c for c in df_columns}
    for cand in candidates:
        if cand in lower_map:
            return lower_map[cand]
        for k in lower_map:
            if cand.lower() == k.lower():
                return lower_map[k]
    return None


def read_excel_to_records(content: bytes, filename: str) -> Tuple[List[Dict[str, Any]], List[DataIssue]]:
    issues: List[DataIssue] = []
    records: List[Dict[str, Any]] = []

    suffix = filename.rsplit(".", 1)[-1].lower() if "." in filename else "xlsx"
    if suffix == "csv":
        df = pd.read_csv(BytesIO(content), dtype=str)
    else:
        df = pd.read_excel(BytesIO(content), dtype=object)

    col_map: Dict[str, str] = {}
    for logical, candidates in COLUMN_MAPPING.items():
        matched = _match_column(list(df.columns), candidates)
        if matched:
            col_map[logical] = matched

    for idx, row in df.iterrows():
        row_no = idx + 2
        rec: Dict[str, Any] = {"row_no": row_no}
        row_issues: List[DataIssue] = []

        for logical, src_col in col_map.items():
            raw_val = row.get(src_col)
            if logical in ("score_origin", "score_extrapolated"):
                rec[logical] = parse_numeric_value(raw_val)
            elif logical == "alarm_flag":
                val = normalize_str(raw_val)
                rec[logical] = val.lower() in ("1", "true", "是", "有", "y", "yes", "报警", "警报", "预警")
            elif logical == "remark_raw":
                rec[logical] = normalize_str(raw_val) or None
                rec["remark_clean"] = clean_remark(rec[logical])
            else:
                rec[logical] = normalize_str(raw_val) or None

        if not rec.get("unit_name"):
            rec["unit_missing"] = True
            row_issues.append(DataIssue(
                issue_type="unit_missing",
                issue_detail="单元名称缺失，验收时需重点追溯",
                column_name="unit_name",
                row_no=row_no,
            ))
        else:
            rec["unit_missing"] = False

        if not rec.get("student_id") and not rec.get("student_name"):
            row_issues.append(DataIssue(
                issue_type="missing_identity",
                issue_detail="学号和姓名同时为空",
                column_name="student_id/student_name",
                row_no=row_no,
            ))

        if rec.get("score_origin") is None and rec.get("score_extrapolated") is None:
            row_issues.append(DataIssue(
                issue_type="missing_score",
                issue_detail="原始分和外推分均为空",
                column_name="score_origin/score_extrapolated",
                row_no=row_no,
            ))

        if rec.get("remark_raw") and re.search(r"[\u4e00-\u9fa5A-Za-z].*\d|\d.*[\u4e00-\u9fa5A-Za-z]", rec["remark_raw"] or ""):
            row_issues.append(DataIssue(
                issue_type="mixed_remark",
                issue_detail=f"备注混写：{rec['remark_raw']}",
                column_name="remark_raw",
                row_no=row_no,
            ))

        rec["dedup_key"] = build_dedup_key(rec)
        rec["_row_issues"] = row_issues
        records.append(rec)

    return records, issues
