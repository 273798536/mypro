import uuid
import hashlib
import json
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from sqlalchemy.orm import Session

from .. import models, schemas


def generate_batch_id() -> str:
    return f"BATCH-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"


def generate_report_id() -> str:
    return f"REPORT-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"


def detect_mixed_notes(notes: Optional[str]) -> bool:
    if not notes:
        return False
    mixed_patterns = ["；", ";", ",", "，", "|", "/", "备注", "说明", "问题"]
    count = sum(1 for p in mixed_patterns if p in notes)
    return count >= 2


def parse_row(row: Dict[str, Any]) -> Tuple[Dict[str, Any], List[str]]:
    cleaned = {}
    warnings = []

    barcode = str(row.get("barcode") or row.get("样本条码") or row.get("Barcode") or "").strip()
    sample_name = str(row.get("sample_name") or row.get("样本名称") or row.get("SampleName") or "").strip()
    material_source = str(row.get("material_source") or row.get("材料来源") or row.get("Material") or "").strip()
    culture_record = str(row.get("culture_record") or row.get("培养记录") or row.get("Culture") or "").strip()
    time_point = str(row.get("time_point") or row.get("时间点") or row.get("TimePoint") or "").strip()
    notes = str(row.get("notes") or row.get("备注") or row.get("Notes") or "").strip()

    if not barcode:
        warnings.append("样本条码为空")
    if not sample_name:
        warnings.append("样本名称为空")
    if not time_point:
        warnings.append("时间点缺失")
    if detect_mixed_notes(notes):
        warnings.append("备注字段混写（包含多种分隔符或说明文字）")

    cleaned = {
        "barcode": barcode if barcode else None,
        "sample_name": sample_name if sample_name else None,
        "material_source": material_source if material_source else None,
        "culture_record": culture_record if culture_record else None,
        "time_point": time_point if time_point else None,
        "notes": notes if notes else None,
        "raw_notes": notes if notes else None,
    }
    return cleaned, warnings


def import_samples(
    db: Session,
    rows: List[Dict[str, Any]],
    imported_by: str = "system",
    file_name: Optional[str] = None,
) -> schemas.ImportResult:
    batch_id = generate_batch_id()
    total = len(rows)
    imported = 0
    skipped = 0
    duplicate_barcodes: List[str] = []
    empty_field_samples: List[Dict[str, Any]] = []
    mixed_notes_samples: List[Dict[str, Any]] = []
    all_warnings: List[str] = []

    seen_barcodes_in_batch: set = set()

    for idx, row in enumerate(rows):
        cleaned, row_warnings = parse_row(row)
        barcode = cleaned.get("barcode")

        if not barcode:
            skipped += 1
            empty_field_samples.append({
                "row_index": idx + 1,
                "sample_name": cleaned.get("sample_name"),
                "missing_fields": ["barcode"] + [w for w in row_warnings if "为空" in w or "缺失" in w],
                "warnings": row_warnings,
            })
            continue

        existing = db.query(models.Sample).filter(models.Sample.barcode == barcode).first()
        if existing or barcode in seen_barcodes_in_batch:
            skipped += 1
            duplicate_barcodes.append(barcode)
            all_warnings.append(f"行{idx + 1}: 条码 {barcode} 重复（已存在于数据库或当前批次）")
            continue

        has_empty = any(v is None or v == "" for k, v in cleaned.items()
                        if k in ["sample_name", "material_source", "time_point"])
        has_mixed_notes = detect_mixed_notes(cleaned.get("notes"))

        if has_empty:
            empty_field_samples.append({
                "row_index": idx + 1,
                "barcode": barcode,
                "sample_name": cleaned.get("sample_name"),
                "missing_fields": [k for k in ["sample_name", "material_source", "time_point"]
                                   if not cleaned.get(k)],
                "warnings": row_warnings,
            })

        if has_mixed_notes:
            mixed_notes_samples.append({
                "row_index": idx + 1,
                "barcode": barcode,
                "notes": cleaned.get("notes"),
                "warnings": row_warnings,
            })

        sample = models.Sample(
            barcode=barcode,
            sample_name=cleaned.get("sample_name"),
            material_source=cleaned.get("material_source"),
            batch_id=batch_id,
            culture_record=cleaned.get("culture_record"),
            time_point=cleaned.get("time_point"),
            notes=cleaned.get("notes"),
            raw_notes=cleaned.get("raw_notes"),
            import_batch_id=batch_id,
            review_status="imported",
            needs_teacher_review=has_empty or has_mixed_notes,
        )
        db.add(sample)
        seen_barcodes_in_batch.add(barcode)
        imported += 1
        all_warnings.extend([f"行{idx + 1}: {w}" for w in row_warnings])

    batch_record = models.ImportBatch(
        batch_id=batch_id,
        file_name=file_name,
        total_samples=total,
        valid_samples=imported,
        duplicate_barcodes=duplicate_barcodes,
        empty_field_samples=empty_field_samples,
        mixed_notes_samples=mixed_notes_samples,
        imported_by=imported_by,
    )
    db.add(batch_record)
    db.commit()

    return schemas.ImportResult(
        batch_id=batch_id,
        total=total,
        imported=imported,
        skipped=skipped,
        duplicate_barcodes=duplicate_barcodes,
        empty_field_samples=empty_field_samples,
        mixed_notes_samples=mixed_notes_samples,
        warnings=all_warnings,
    )


def get_samples(
    db: Session,
    status: Optional[str] = None,
    batch_id: Optional[str] = None,
    can_use_directly: Optional[bool] = None,
    needs_teacher_review: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[models.Sample]:
    query = db.query(models.Sample)
    if status:
        query = query.filter(models.Sample.review_status == status)
    if batch_id:
        query = query.filter(models.Sample.import_batch_id == batch_id)
    if can_use_directly is not None:
        query = query.filter(models.Sample.can_use_directly == can_use_directly)
    if needs_teacher_review is not None:
        query = query.filter(models.Sample.needs_teacher_review == needs_teacher_review)
    return query.order_by(models.Sample.created_at.desc()).offset(skip).limit(limit).all()


def get_sample_detail(db: Session, sample_id: int) -> Optional[models.Sample]:
    sample = db.query(models.Sample).filter(models.Sample.id == sample_id).first()
    if sample:
        return sample
    return None


def get_import_batches(db: Session, skip: int = 0, limit: int = 50) -> List[models.ImportBatch]:
    return db.query(models.ImportBatch).order_by(models.ImportBatch.created_at.desc()).offset(skip).limit(limit).all()


def get_import_batch(db: Session, batch_id: str) -> Optional[models.ImportBatch]:
    return db.query(models.ImportBatch).filter(models.ImportBatch.batch_id == batch_id).first()
