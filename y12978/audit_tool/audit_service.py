from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional, Dict
from . import models, schemas
from datetime import datetime
import hashlib


def _gen_record_hash(source_table: str, source_row: Optional[int], column_name: str, column_value: str) -> str:
    raw = f"{source_table}|{source_row or 0}|{column_name}|{column_value}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


def run_backup_check(db: Session) -> schemas.BackupCheckResult:
    conclusions = db.query(models.AuditConclusion).filter(
        models.AuditConclusion.audit_type == "backup"
    ).all()

    index_invalid = [c for c in conclusions if c.status == "index_invalid"]
    tz_mismatch = [c for c in conclusions if c.status == "timezone_mismatch"]
    duplicates = [c for c in conclusions if c.is_duplicate]
    supplements = db.query(models.SourceRecord).filter(models.SourceRecord.is_supplement == True).count()

    return schemas.BackupCheckResult(
        total_records=len(conclusions),
        index_invalid_count=len(index_invalid),
        timezone_mismatch_count=len(tz_mismatch),
        duplicate_count=len(duplicates),
        supplement_count=supplements,
        details=[schemas.AuditConclusionItem.model_validate(c) for c in conclusions]
    )


def run_permission_audit(db: Session) -> schemas.PermissionAuditResult:
    conclusions = db.query(models.AuditConclusion).filter(
        models.AuditConclusion.audit_type == "permission"
    ).all()

    all_batches = set()
    unauthorized = []
    auditor_map: Dict[str, int] = {}

    src_records = db.query(models.SourceRecord).all()
    for s in src_records:
        if s.import_batch:
            all_batches.add(s.import_batch)

    processed_batches = set()
    for c in conclusions:
        if c.auditor:
            auditor_map[c.auditor] = auditor_map.get(c.auditor, 0) + 1
        if c.source_record_id:
            src = db.query(models.SourceRecord).filter(models.SourceRecord.id == c.source_record_id).first()
            if src and src.import_batch:
                processed_batches.add(src.import_batch)

    for b in all_batches:
        if b not in processed_batches:
            unauthorized.append(b)

    unverified = db.query(models.SourceRecord).filter(
        and_(
            models.SourceRecord.is_supplement == True,
            ~models.SourceRecord.id.in_(
                db.query(models.AuditConclusion.source_record_id).filter(
                    models.AuditConclusion.source_record_id.isnot(None)
                )
            )
        )
    ).count()

    return schemas.PermissionAuditResult(
        total_records=len(conclusions),
        unauthorized_batches=unauthorized,
        unverified_supplements=unverified,
        auditor_coverage=auditor_map,
        details=[schemas.AuditConclusionItem.model_validate(c) for c in conclusions]
    )


def compare_timezone(db: Session, source_record_id: int) -> Optional[schemas.AuditConclusionItem]:
    src = db.query(models.SourceRecord).filter(models.SourceRecord.id == source_record_id).first()
    if not src:
        return None

    dic = db.query(models.DataDictionary).filter(
        and_(
            models.DataDictionary.table_name == src.source_table,
            models.DataDictionary.column_name == src.column_name
        )
    ).first()

    expected = dic.expected_timezone if dic else None
    detected = src.detected_timezone
    index_valid = True
    status = "pass"
    conclusion_text = "时区字段匹配"

    if src.source_row_number is None:
        index_valid = False
        status = "index_invalid"
        conclusion_text = "原始行号缺失，索引失效"
    elif expected and detected and expected != detected:
        status = "timezone_mismatch"
        conclusion_text = f"时区不匹配: 期望{expected}, 实际{detected}"

    existing = db.query(models.AuditConclusion).filter(
        and_(
            models.AuditConclusion.source_record_id == source_record_id,
            models.AuditConclusion.audit_type == "timezone"
        )
    ).first()

    if existing:
        existing.status = status
        existing.conclusion = conclusion_text
        existing.index_valid = index_valid
        existing.updated_at = datetime.now()
        db.commit()
        db.refresh(existing)
        return schemas.AuditConclusionItem.model_validate(existing)

    new_c = models.AuditConclusion(
        source_record_id=source_record_id,
        dictionary_id=dic.id if dic else None,
        audit_type="timezone",
        status=status,
        conclusion=conclusion_text,
        index_valid=index_valid,
        is_duplicate=False
    )
    db.add(new_c)
    db.commit()
    db.refresh(new_c)
    return schemas.AuditConclusionItem.model_validate(new_c)


def detect_duplicate_conclusions(db: Session) -> int:
    records = db.query(models.SourceRecord).all()
    dup_count = 0

    for src in records:
        conclusions = db.query(models.AuditConclusion).filter(
            and_(
                models.AuditConclusion.source_record_id == src.id,
                models.AuditConclusion.audit_type.in_(["backup", "timezone"])
            )
        ).order_by(models.AuditConclusion.created_at.asc()).all()

        if len(conclusions) > 1:
            first = conclusions[0]
            for c in conclusions[1:]:
                if c.status == first.status and not c.is_duplicate:
                    c.is_duplicate = True
                    c.duplicate_of_id = first.id
                    dup_count += 1
    db.commit()
    return dup_count


def build_trace_chain(db: Session, conclusion_id: int) -> Optional[schemas.TraceChain]:
    conclusion = db.query(models.AuditConclusion).filter(models.AuditConclusion.id == conclusion_id).first()
    if not conclusion:
        return None

    source_record = db.query(models.SourceRecord).filter(
        models.SourceRecord.id == conclusion.source_record_id
    ).first() if conclusion.source_record_id else None

    dictionary = db.query(models.DataDictionary).filter(
        models.DataDictionary.id == conclusion.dictionary_id
    ).first() if conclusion.dictionary_id else None

    process_logs: List[models.ProcessLog] = []
    if source_record:
        process_logs = db.query(models.ProcessLog).filter(
            models.ProcessLog.source_record_id == source_record.id
        ).order_by(models.ProcessLog.created_at.asc()).all()

    return schemas.TraceChain(
        conclusion=schemas.AuditConclusionItem.model_validate(conclusion),
        source_record=schemas.SourceRecordItem.model_validate(source_record) if source_record else schemas.SourceRecordItem(
            id=0, source_table="UNKNOWN", created_at=datetime.now()
        ),
        dictionary=schemas.DataDictionaryItem.model_validate(dictionary) if dictionary else None,
        process_logs=[schemas.ProcessLogItem.model_validate(p) for p in process_logs]
    )


def list_conclusions(
    db: Session,
    status: Optional[str] = None,
    audit_type: Optional[str] = None,
    source_table: Optional[str] = None
) -> List[schemas.AuditConclusionItem]:
    q = db.query(models.AuditConclusion)
    if status:
        q = q.filter(models.AuditConclusion.status == status)
    if audit_type:
        q = q.filter(models.AuditConclusion.audit_type == audit_type)
    if source_table:
        q = q.join(models.SourceRecord).filter(models.SourceRecord.source_table == source_table)
    return [schemas.AuditConclusionItem.model_validate(c) for c in q.all()]


def list_source_records(
    db: Session,
    source_table: Optional[str] = None,
    import_batch: Optional[str] = None
) -> List[schemas.SourceRecordItem]:
    q = db.query(models.SourceRecord)
    if source_table:
        q = q.filter(models.SourceRecord.source_table == source_table)
    if import_batch:
        q = q.filter(models.SourceRecord.import_batch == import_batch)
    return [schemas.SourceRecordItem.model_validate(s) for s in q.all()]


def list_dictionary(
    db: Session,
    table_name: Optional[str] = None
) -> List[schemas.DataDictionaryItem]:
    q = db.query(models.DataDictionary)
    if table_name:
        q = q.filter(models.DataDictionary.table_name == table_name)
    return [schemas.DataDictionaryItem.model_validate(d) for d in q.all()]
