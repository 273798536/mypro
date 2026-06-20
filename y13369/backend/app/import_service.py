import os
import io
import pandas as pd
from sqlalchemy.orm import Session
from typing import Tuple, List, Dict
from fastapi import UploadFile, HTTPException

from .models import EvaluationRun, EvaluationRecord, FieldMapping, AnomalyRecord
from .field_normalizer import (
    detect_field_mapping,
    parse_list_field,
    parse_metrics_from_row,
    extract_original_fields,
    detect_anomalies,
)


UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def read_upload_to_df(file: UploadFile) -> pd.DataFrame:
    content = file.file.read()
    filename = file.filename.lower()
    if filename.endswith(".csv"):
        try:
            df = pd.read_csv(io.BytesIO(content))
        except UnicodeDecodeError:
            df = pd.read_csv(io.BytesIO(content), encoding="gbk")
    elif filename.endswith((".xlsx", ".xls")):
        df = pd.read_excel(io.BytesIO(content))
    else:
        raise HTTPException(status_code=400, detail="仅支持 CSV/Excel 文件")
    return df


def save_upload_file(file: UploadFile, run_id: int) -> str:
    ext = os.path.splitext(file.filename)[1]
    safe_name = f"run_{run_id}_{file.filename}"
    dest = os.path.join(UPLOAD_DIR, safe_name)
    return dest


def process_import(
    db: Session,
    file: UploadFile,
    model_version: str,
    evaluator: str,
    notes: str = "",
) -> Tuple[int, int, List[str], List[Dict[str, str]]]:
    df = read_upload_to_df(file)

    run = EvaluationRun(
        model_version=model_version,
        evaluator=evaluator,
        source_file="",
        original_filename=file.filename,
        status="processing",
        notes=notes,
    )
    db.add(run)
    db.flush()

    saved_path = save_upload_file(file, run.id)
    run.source_file = saved_path

    mapping, warnings = detect_field_mapping(list(df.columns))

    auto_mapped = [{"source": v, "standard": k} for k, v in mapping.items()]

    for std_field, src_field in mapping.items():
        fm = FieldMapping(
            run_id=run.id,
            source_field=src_field,
            standard_field=std_field,
            is_global=False,
        )
        db.add(fm)

    if "query_id" not in mapping:
        warnings.append("未找到 query_id 字段，将使用行号作为 query_id")

    record_count = 0
    for idx, row in df.iterrows():
        qid_val = ""
        if "query_id" in mapping and mapping["query_id"] in row.index:
            qid_val = str(row[mapping["query_id"]]) if not pd.isna(row[mapping["query_id"]]) else f"row_{idx}"
        else:
            qid_val = f"row_{idx}"

        query_text = ""
        if "query_text" in mapping and mapping["query_text"] in row.index:
            query_text = str(row[mapping["query_text"]]) if not pd.isna(row[mapping["query_text"]]) else ""

        expected = []
        if "expected_docs" in mapping and mapping["expected_docs"] in row.index:
            expected = parse_list_field(row[mapping["expected_docs"]])

        recalled = []
        if "recalled_docs" in mapping and mapping["recalled_docs"] in row.index:
            recalled = parse_list_field(row[mapping["recalled_docs"]])

        metrics = parse_metrics_from_row(row, mapping)
        original_fields = extract_original_fields(row, mapping)
        anomaly_flag, anomaly_desc = detect_anomalies(row, mapping)

        rec = EvaluationRecord(
            run_id=run.id,
            query_id=qid_val,
            query_text=query_text,
            expected_docs=expected,
            recalled_docs=recalled,
            metrics=metrics,
            original_fields=original_fields,
            original_row_index=idx,
            anomaly_flag=anomaly_flag,
            anomaly_desc=anomaly_desc,
            is_archived=False,
        )
        db.add(rec)
        db.flush()

        if anomaly_flag:
            ar = AnomalyRecord(
                record_id=rec.id,
                anomaly_type=anomaly_flag,
                original_description=anomaly_desc or file.filename,
                status="open",
            )
            db.add(ar)

        record_count += 1

    run.status = "completed"
    db.commit()
    db.refresh(run)

    return run.id, record_count, warnings, auto_mapped
