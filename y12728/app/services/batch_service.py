from typing import List, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.models.models import ImportBatch, ScoreRecord, DataIssue
from app.services.import_service import (
    generate_batch_no, compute_file_hash, read_excel_to_records,
)


def find_duplicate_in_history(db: Session, dedup_key: str, exclude_batch_id: int = None) -> List[ScoreRecord]:
    if not dedup_key:
        return []
    q = db.query(ScoreRecord).filter(
        ScoreRecord.dedup_key == dedup_key,
        ScoreRecord.is_duplicate == False,
    )
    if exclude_batch_id:
        q = q.filter(ScoreRecord.batch_id != exclude_batch_id)
    return q.all()


def find_duplicate_in_same_batch(records_by_key: Dict[str, List[int]], dedup_key: str) -> int:
    if not dedup_key:
        return None
    existing = records_by_key.get(dedup_key)
    if existing and len(existing) > 0:
        return existing[0]
    return None


def persist_import_batch(
    db: Session,
    filename: str,
    content: bytes,
    uploaded_by: str = "system",
    remark: str = None,
) -> Tuple[ImportBatch, List[ScoreRecord], List[DataIssue]]:

    file_hash = compute_file_hash(content)

    existing = db.query(ImportBatch).filter(ImportBatch.file_hash == file_hash).first()
    if existing:
        existing.remark = (existing.remark or "") + f"\n[重复导入尝试] {uploaded_by} @ {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        db.commit()
        db.refresh(existing)
        records = db.query(ScoreRecord).filter(ScoreRecord.batch_id == existing.id).all()
        issues = db.query(DataIssue).filter(DataIssue.batch_id == existing.id).all()
        return existing, records, issues

    batch = ImportBatch(
        batch_no=generate_batch_no(),
        file_name=filename,
        file_hash=file_hash,
        uploaded_by=uploaded_by,
        remark=remark,
    )
    db.add(batch)
    db.flush()

    raw_records, global_issues = read_excel_to_records(content, filename)

    batch.total_rows = len(raw_records)
    valid_count = 0
    dup_count = 0
    issue_count = len(global_issues)

    records_by_key: Dict[str, List[int]] = {}
    persisted_records: List[ScoreRecord] = []
    all_issues: List[DataIssue] = list(global_issues)

    for rec in raw_records:
        row_issues = rec.pop("_row_issues", [])
        issue_count += len(row_issues)

        rec_obj = ScoreRecord(
            batch_id=batch.id,
            row_no=rec.get("row_no"),
            student_id=rec.get("student_id"),
            student_name=rec.get("student_name"),
            class_name=rec.get("class_name"),
            subject=rec.get("subject"),
            unit_name=rec.get("unit_name"),
            unit_missing=rec.get("unit_missing", False),
            score_origin=rec.get("score_origin"),
            score_extrapolated=rec.get("score_extrapolated"),
            alarm_level=rec.get("alarm_level"),
            alarm_flag=rec.get("alarm_flag", False),
            remark_raw=rec.get("remark_raw"),
            remark_clean=rec.get("remark_clean"),
            dedup_key=rec.get("dedup_key", ""),
            status="pending",
        )
        db.add(rec_obj)
        db.flush()

        dedup_key = rec.get("dedup_key", "")
        dup_of = None
        if dedup_key:
            dup_of = find_duplicate_in_same_batch(records_by_key, dedup_key)
            if dup_of is None:
                hist = find_duplicate_in_history(db, dedup_key, exclude_batch_id=batch.id)
                if hist:
                    dup_of = hist[0].id

        if dup_of is not None:
            rec_obj.is_duplicate = True
            rec_obj.duplicate_of_id = dup_of
            rec_obj.status = "duplicate"
            dup_count += 1
            dup_issue = DataIssue(
                batch_id=batch.id,
                record_id=rec_obj.id,
                issue_type="duplicate_record",
                issue_detail=f"与记录ID {dup_of} 重复（同批次或历史数据），已自动标记，需人工确认是否合并",
                row_no=rec.get("row_no"),
            )
            db.add(dup_issue)
            all_issues.append(dup_issue)
            issue_count += 1
        else:
            valid_count += 1
            if dedup_key:
                records_by_key.setdefault(dedup_key, []).append(rec_obj.id)

        for iss in row_issues:
            iss.batch_id = batch.id
            iss.record_id = rec_obj.id
            db.add(iss)
            all_issues.append(iss)

        rec_obj.score_original_value = rec_obj.score_origin
        rec_obj.alarm_original_level = rec_obj.alarm_level

        persisted_records.append(rec_obj)

    batch.valid_rows = valid_count
    batch.duplicate_rows = dup_count
    batch.issue_rows = issue_count

    db.commit()
    db.refresh(batch)
    for r in persisted_records:
        db.refresh(r)
    for i in all_issues:
        if i.id is None:
            db.refresh(i)

    return batch, persisted_records, all_issues
