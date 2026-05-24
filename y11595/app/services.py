import os
import hashlib
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from app.models import (
    Batch, BatchStatus, Record, RecordStatus, RecordType,
    ImportSource, Attachment, AuditLog, User, UserRole
)
from app.state_machine import BatchStateMachine, RecordStateMachine, StateTransitionError
from app.schemas import BatchCreate, RecordCreate, ImportResult

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def generate_batch_no() -> str:
    now = datetime.now()
    return f"BATCH-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}"


def get_file_hash(file_content: bytes) -> str:
    return hashlib.sha256(file_content).hexdigest()


def create_batch(db: Session, batch_data: BatchCreate, created_by: str) -> Batch:
    batch = Batch(
        batch_no=generate_batch_no(),
        title=batch_data.title,
        description=batch_data.description,
        created_by=created_by,
        status=BatchStatus.DRAFT
    )
    db.add(batch)
    db.flush()
    
    audit_log = AuditLog(
        batch_id=batch.id,
        action="BATCH_CREATE",
        operator=created_by,
        operator_role=UserRole.OPERATOR.value,
        changes={"title": batch.title, "description": batch.description}
    )
    db.add(audit_log)
    
    db.commit()
    db.refresh(batch)
    return batch


def get_batch(db: Session, batch_id: int) -> Optional[Batch]:
    return db.query(Batch).filter(Batch.id == batch_id).first()


def get_batch_by_no(db: Session, batch_no: str) -> Optional[Batch]:
    return db.query(Batch).filter(Batch.batch_no == batch_no).first()


def list_batches(db: Session, skip: int = 0, limit: int = 100, 
                 status: Optional[BatchStatus] = None) -> Tuple[List[Batch], int]:
    query = db.query(Batch)
    if status:
        query = query.filter(Batch.status == status)
    total = query.count()
    batches = query.order_by(Batch.created_at.desc()).offset(skip).limit(limit).all()
    return batches, total


def update_batch_stats(db: Session, batch: Batch):
    stats = db.query(
        Record.status,
        func.count(Record.id),
        func.sum(Record.compensation_amount)
    ).filter(Record.batch_id == batch.id).group_by(Record.status).all()
    
    stats_dict = {
        "total": 0,
        "by_status": {},
        "total_compensation": 0,
        "correct_compensation": 0,
        "incorrect_compensation": 0
    }
    
    for status, count, amount in stats:
        stats_dict["total"] += count
        stats_dict["by_status"][status.value] = count
        stats_dict["total_compensation"] += amount or 0
    
    correct_stats = db.query(
        func.sum(Record.compensation_amount)
    ).filter(
        Record.batch_id == batch.id,
        Record.is_correct == True
    ).scalar() or 0
    
    incorrect_stats = db.query(
        func.sum(Record.compensation_amount)
    ).filter(
        Record.batch_id == batch.id,
        Record.is_correct == False
    ).scalar() or 0
    
    stats_dict["correct_compensation"] = correct_stats
    stats_dict["incorrect_compensation"] = incorrect_stats
    
    batch.stats = stats_dict
    db.add(batch)


def import_records(db: Session, batch: Batch, record_type: RecordType,
                   records_data: List[Dict[str, Any]], source_file: str,
                   imported_by: str, sheet_name: Optional[str] = None) -> ImportResult:
    if batch.status not in [BatchStatus.DRAFT, BatchStatus.IMPORTING]:
        raise StateTransitionError(f"Cannot import records in status: {batch.status.value}")
    
    sm = BatchStateMachine(db, batch, imported_by)
    if batch.status == BatchStatus.DRAFT:
        sm.transition_to(BatchStatus.IMPORTING, reason=f"Start importing {record_type.value}")
    
    import_source = ImportSource(
        batch_id=batch.id,
        file_name=source_file,
        record_type=record_type,
        total_rows=len(records_data),
        imported_by=imported_by,
        sheet_name=sheet_name
    )
    db.add(import_source)
    db.flush()
    
    success_count = 0
    failed_count = 0
    duplicate_count = 0
    failed_records = []
    parse_errors = []
    
    existing_keys = set()
    if record_type == RecordType.CHANGE_ORDER:
        existing = db.query(Record.unique_key).filter(
            Record.batch_id == batch.id,
            Record.record_type == RecordType.CHANGE_ORDER
        ).all()
        existing_keys = {r[0] for r in existing if r[0]}
    
    for idx, row_data in enumerate(records_data, start=2):
        try:
            parsed_data, unique_key = parse_record_data(record_type, row_data)
            
            is_duplicate = False
            duplicate_of_id = None
            if unique_key and unique_key in existing_keys:
                is_duplicate = True
                duplicate_count += 1
                existing_record = db.query(Record).filter(
                    Record.batch_id == batch.id,
                    Record.unique_key == unique_key
                ).first()
                if existing_record:
                    duplicate_of_id = existing_record.id
            elif unique_key:
                existing_keys.add(unique_key)
            
            record = Record(
                batch_id=batch.id,
                record_type=record_type,
                unique_key=unique_key,
                original_data=row_data,
                parsed_data=parsed_data,
                source_file=source_file,
                source_row=idx,
                source_sheet=sheet_name,
                is_duplicate=is_duplicate,
                duplicate_of_id=duplicate_of_id,
                status=RecordStatus.DUPLICATE if is_duplicate else RecordStatus.PENDING
            )
            
            if record_type == RecordType.CHANGE_ORDER:
                record.change_order_no = parsed_data.get("change_order_no")
                record.cs_agent_id = parsed_data.get("cs_agent_id")
                record.cs_agent_name = parsed_data.get("cs_agent_name")
                record.store_id = parsed_data.get("store_id")
                record.store_name = parsed_data.get("store_name")
                record.compensation_amount = parsed_data.get("compensation_amount", 0) or 0
            elif record_type == RecordType.AUDIT_OPINION:
                record.audit_opinion_no = parsed_data.get("audit_opinion_no")
                record.change_order_no = parsed_data.get("change_order_no")
            elif record_type == RecordType.CS_REFERENCE:
                record.cs_reference_no = parsed_data.get("cs_reference_no")
                record.change_order_no = parsed_data.get("change_order_no")
                record.cs_agent_id = parsed_data.get("cs_agent_id")
            
            if is_duplicate:
                record.warning_message = f"Duplicate of unique key: {unique_key}"
            
            db.add(record)
            success_count += 1
            
        except Exception as e:
            failed_count += 1
            parse_errors.append({
                "row": idx,
                "error": str(e),
                "data": str(row_data)[:500]
            })
            failed_records.append({
                "row": idx,
                "error": str(e),
                "source_file": source_file
            })
    
    import_source.success_count = success_count
    import_source.failed_count = failed_count
    import_source.parse_errors = parse_errors
    db.add(import_source)
    
    db.flush()
    update_batch_stats(db, batch)
    
    sm.transition_to(BatchStatus.IMPORTED, reason=f"Import completed: {success_count} success, {failed_count} failed")
    
    db.commit()
    db.refresh(batch)
    
    return ImportResult(
        batch_id=batch.id,
        batch_no=batch.batch_no,
        total_records=len(records_data),
        success_count=success_count,
        failed_count=failed_count,
        duplicate_count=duplicate_count,
        failed_records=failed_records,
        import_sources=[import_source]
    )


def parse_record_data(record_type: RecordType, row_data: Dict[str, Any]) -> Tuple[Dict[str, Any], Optional[str]]:
    parsed = {}
    unique_key = None
    
    def safe_get(key: str, default=None):
        val = row_data.get(key) or row_data.get(key.lower()) or row_data.get(key.replace("_", " "))
        return val if val is not None else default
    
    if record_type == RecordType.CHANGE_ORDER:
        change_order_no = safe_get("change_order_no") or safe_get("变更单号") or safe_get("单号")
        if not change_order_no:
            raise ValueError("Missing required field: change_order_no")
        
        parsed["change_order_no"] = str(change_order_no).strip()
        parsed["cs_agent_id"] = safe_get("cs_agent_id") or safe_get("客服ID") or safe_get("坐席ID")
        parsed["cs_agent_name"] = safe_get("cs_agent_name") or safe_get("客服姓名") or safe_get("坐席姓名")
        parsed["store_id"] = safe_get("store_id") or safe_get("门店ID")
        parsed["store_name"] = safe_get("store_name") or safe_get("门店名称")
        
        amount = safe_get("compensation_amount") or safe_get("赔付金额") or safe_get("金额") or 0
        try:
            parsed["compensation_amount"] = float(amount) if amount else 0
        except (ValueError, TypeError):
            parsed["compensation_amount"] = 0
        
        parsed["issue_description"] = safe_get("issue_description") or safe_get("问题描述")
        parsed["old_answer"] = safe_get("old_answer") or safe_get("旧答案")
        parsed["new_answer"] = safe_get("new_answer") or safe_get("新答案")
        parsed["occurred_at"] = safe_get("occurred_at") or safe_get("发生时间")
        
        unique_key = f"CO:{parsed['change_order_no']}"
    
    elif record_type == RecordType.AUDIT_OPINION:
        audit_opinion_no = safe_get("audit_opinion_no") or safe_get("审核意见号")
        if not audit_opinion_no:
            raise ValueError("Missing required field: audit_opinion_no")
        
        parsed["audit_opinion_no"] = str(audit_opinion_no).strip()
        parsed["change_order_no"] = safe_get("change_order_no") or safe_get("变更单号")
        parsed["auditor"] = safe_get("auditor") or safe_get("审核人")
        parsed["opinion"] = safe_get("opinion") or safe_get("审核意见")
        parsed["audit_result"] = safe_get("audit_result") or safe_get("审核结果")
        parsed["audit_time"] = safe_get("audit_time") or safe_get("审核时间")
        
        unique_key = f"AUD:{parsed['audit_opinion_no']}"
    
    elif record_type == RecordType.CS_REFERENCE:
        cs_ref_no = safe_get("cs_reference_no") or safe_get("引用记录号") or safe_get("记录号")
        if not cs_ref_no:
            raise ValueError("Missing required field: cs_reference_no")
        
        parsed["cs_reference_no"] = str(cs_ref_no).strip()
        parsed["change_order_no"] = safe_get("change_order_no") or safe_get("变更单号")
        parsed["cs_agent_id"] = safe_get("cs_agent_id") or safe_get("客服ID")
        parsed["cs_agent_name"] = safe_get("cs_agent_name") or safe_get("客服姓名")
        parsed["reference_time"] = safe_get("reference_time") or safe_get("引用时间")
        parsed["conversation_id"] = safe_get("conversation_id") or safe_get("会话ID")
        parsed["customer_id"] = safe_get("customer_id") or safe_get("客户ID")
        
        unique_key = f"CSR:{parsed['cs_reference_no']}"
    
    elif record_type == RecordType.HANDOVER_PAPER:
        paper_no = safe_get("paper_no") or safe_get("交接单号")
        if not paper_no:
            raise ValueError("Missing required field: paper_no")
        
        parsed["paper_no"] = str(paper_no).strip()
        parsed["change_order_no"] = safe_get("change_order_no") or safe_get("变更单号")
        parsed["store_id"] = safe_get("store_id") or safe_get("门店ID")
        parsed["handover_person"] = safe_get("handover_person") or safe_get("交接人")
        parsed["handover_time"] = safe_get("handover_time") or safe_get("交接时间")
        parsed["content"] = safe_get("content") or safe_get("交接内容")
        
        unique_key = f"HOP:{parsed['paper_no']}"
    
    return parsed, unique_key


def get_record(db: Session, record_id: int) -> Optional[Record]:
    return db.query(Record).filter(Record.id == record_id).first()


def list_records(db: Session, batch_id: Optional[int] = None, 
                 status: Optional[RecordStatus] = None,
                 skip: int = 0, limit: int = 100) -> Tuple[List[Record], int]:
    query = db.query(Record)
    if batch_id:
        query = query.filter(Record.batch_id == batch_id)
    if status:
        query = query.filter(Record.status == status)
    total = query.count()
    records = query.order_by(Record.created_at.desc()).offset(skip).limit(limit).all()
    return records, total


def correct_record(db: Session, record: Record, new_status: RecordStatus,
                   correction_note: str, operator: str,
                   review_reason: Optional[str] = None,
                   is_correct: Optional[bool] = None,
                   compensation_amount: Optional[float] = None) -> Record:
    batch = db.query(Batch).filter(Batch.id == record.batch_id).first()
    if batch.status == BatchStatus.FROZEN:
        raise StateTransitionError("Cannot correct record: batch is frozen")
    
    sm = RecordStateMachine(db, record, operator)
    record = sm.transition_to(
        new_status,
        reason=review_reason,
        correction_note=correction_note,
        is_correct=is_correct,
        compensation_amount=compensation_amount
    )
    
    update_batch_stats(db, batch)
    db.commit()
    db.refresh(record)
    return record


def review_batch(db: Session, batch: Batch, action: str, opinion: str,
                 operator: str, record_results: Optional[Dict[int, Dict[str, Any]]] = None) -> Batch:
    if batch.status not in [BatchStatus.IMPORTED, BatchStatus.REVIEWING]:
        raise StateTransitionError(f"Cannot review batch in status: {batch.status.value}")
    
    sm = BatchStateMachine(db, batch, operator, UserRole.REVIEWER.value)
    
    if batch.status == BatchStatus.IMPORTED:
        sm.transition_to(BatchStatus.REVIEWING, reason="Start reviewing")
    
    if record_results:
        for record_id, result in record_results.items():
            record = db.query(Record).filter(Record.id == record_id).first()
            if record and record.batch_id == batch.id:
                record_sm = RecordStateMachine(db, record, operator, UserRole.REVIEWER.value)
                status_str = result.get("status", "verified")
                status = RecordStatus(status_str) if status_str else RecordStatus.VERIFIED
                record_sm.transition_to(
                    status,
                    reason=result.get("reason"),
                    is_correct=result.get("is_correct")
                )
    
    batch.review_opinion = opinion
    batch.reviewed_by = operator
    batch.reviewed_at = datetime.utcnow()
    
    target_status = BatchStatus.APPROVED if action == "approve" else BatchStatus.REJECTED
    sm.transition_to(target_status, reason=opinion)
    
    update_batch_stats(db, batch)
    db.commit()
    db.refresh(batch)
    return batch


def freeze_batch(db: Session, batch: Batch, reason: str, operator: str) -> Batch:
    if batch.status == BatchStatus.FROZEN:
        raise StateTransitionError("Batch is already frozen")
    
    sm = BatchStateMachine(db, batch, operator, UserRole.ADMIN.value)
    sm.transition_to(BatchStatus.FROZEN, reason=reason)
    
    db.commit()
    db.refresh(batch)
    return batch


def unfreeze_batch(db: Session, batch: Batch, operator: str) -> Batch:
    sm = BatchStateMachine(db, batch, operator, UserRole.ADMIN.value)
    batch = sm.unfreeze()
    
    db.commit()
    db.refresh(batch)
    return batch


def withdraw_batch(db: Session, batch: Batch, reason: str, operator: str) -> Batch:
    sm = BatchStateMachine(db, batch, operator)
    sm.transition_to(BatchStatus.WITHDRAWN, reason=reason)
    
    batch.withdrawn_at = datetime.utcnow()
    batch.withdrawn_by = operator
    batch.withdrawn_reason = reason
    
    db.commit()
    db.refresh(batch)
    return batch


def resubmit_batch(db: Session, batch: Batch, operator: str) -> Batch:
    if batch.status != BatchStatus.WITHDRAWN:
        raise StateTransitionError("Only withdrawn batches can be resubmitted")
    
    sm = BatchStateMachine(db, batch, operator)
    sm.transition_to(BatchStatus.DRAFT, reason="Resubmit withdrawn batch")
    
    db.commit()
    db.refresh(batch)
    return batch


def settle_batch(db: Session, batch: Batch, operator: str) -> Batch:
    sm = BatchStateMachine(db, batch, operator, UserRole.SETTLEMENT.value)
    sm.transition_to(BatchStatus.SETTLED, reason="Batch settled")
    
    batch.settled_at = datetime.utcnow()
    batch.settled_by = operator
    
    db.commit()
    db.refresh(batch)
    return batch


def archive_batch(db: Session, batch: Batch, operator: str) -> Batch:
    sm = BatchStateMachine(db, batch, operator, UserRole.ADMIN.value)
    sm.transition_to(BatchStatus.ARCHIVED, reason="Batch archived")
    
    batch.archived_at = datetime.utcnow()
    batch.archived_by = operator
    
    db.commit()
    db.refresh(batch)
    return batch


def add_attachment(db: Session, batch_id: Optional[int], record_id: Optional[int],
                   file_name: str, file_content: bytes, mime_type: str,
                   uploaded_by: str, attachment_type: str = "general",
                   description: Optional[str] = None) -> Attachment:
    file_hash = get_file_hash(file_content)
    file_path = os.path.join(UPLOAD_DIR, f"{file_hash}_{file_name}")
    
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    attachment = Attachment(
        batch_id=batch_id,
        record_id=record_id,
        file_name=file_name,
        file_path=file_path,
        file_hash=file_hash,
        file_size=len(file_content),
        mime_type=mime_type,
        attachment_type=attachment_type,
        description=description,
        uploaded_by=uploaded_by
    )
    db.add(attachment)
    
    if batch_id:
        batch = db.query(Batch).filter(Batch.id == batch_id).first()
        if batch:
            audit_log = AuditLog(
                batch_id=batch_id,
                action="ATTACHMENT_ADD",
                operator=uploaded_by,
                operator_role=UserRole.OPERATOR.value,
                changes={"file_name": file_name, "attachment_type": attachment_type}
            )
            db.add(audit_log)
    
    db.commit()
    db.refresh(attachment)
    return attachment


def get_audit_logs(db: Session, batch_id: Optional[int] = None,
                   record_id: Optional[int] = None,
                   skip: int = 0, limit: int = 100) -> Tuple[List[AuditLog], int]:
    query = db.query(AuditLog)
    if batch_id:
        query = query.filter(AuditLog.batch_id == batch_id)
    if record_id:
        query = query.filter(AuditLog.record_id == record_id)
    total = query.count()
    logs = query.order_by(AuditLog.operated_at.desc()).offset(skip).limit(limit).all()
    return logs, total


def get_export_summary(db: Session, batch_id: int, exported_by: str) -> Dict[str, Any]:
    batch = get_batch(db, batch_id)
    if not batch:
        raise ValueError("Batch not found")
    
    records = db.query(Record).filter(Record.batch_id == batch_id).all()
    
    status_counts = {}
    for status in RecordStatus:
        status_counts[status.value] = 0
    
    total_compensation = 0
    correct_compensation = 0
    incorrect_compensation = 0
    
    for r in records:
        status_counts[r.status.value] += 1
        total_compensation += r.compensation_amount or 0
        if r.is_correct:
            correct_compensation += r.compensation_amount or 0
        elif r.is_correct is False:
            incorrect_compensation += r.compensation_amount or 0
    
    return {
        "batch_id": batch.id,
        "batch_no": batch.batch_no,
        "batch_title": batch.title,
        "status_before_frozen": batch.status_before_frozen.value if batch.status_before_frozen else None,
        "status_after_frozen": batch.status.value,
        "frozen_reason": batch.frozen_reason,
        "total_records": len(records),
        "verified_count": status_counts["verified"],
        "corrected_count": status_counts["corrected"],
        "waived_count": status_counts["waived"],
        "invalid_count": status_counts["invalid"],
        "duplicate_count": status_counts["duplicate"],
        "pending_count": status_counts["pending"],
        "total_compensation": total_compensation,
        "correct_compensation": correct_compensation,
        "incorrect_compensation": incorrect_compensation,
        "export_at": datetime.utcnow(),
        "exported_by": exported_by
    }


def export_records(db: Session, batch_id: int) -> List[Dict[str, Any]]:
    records = db.query(Record).filter(Record.batch_id == batch_id).all()
    result = []
    for r in records:
        result.append({
            "id": r.id,
            "record_type": r.record_type.value,
            "status": r.status.value,
            "unique_key": r.unique_key,
            "source_file": r.source_file,
            "source_row": r.source_row,
            "change_order_no": r.change_order_no,
            "cs_agent_id": r.cs_agent_id,
            "cs_agent_name": r.cs_agent_name,
            "store_id": r.store_id,
            "store_name": r.store_name,
            "compensation_amount": r.compensation_amount,
            "is_correct": r.is_correct,
            "review_result": r.review_result,
            "review_reason": r.review_reason,
            "reviewer": r.reviewer,
            "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None,
            "correction_note": r.correction_note,
            "corrected_by": r.corrected_by,
            "corrected_at": r.corrected_at.isoformat() if r.corrected_at else None,
            "is_duplicate": r.is_duplicate,
            "original_data": r.original_data,
            "parsed_data": r.parsed_data,
            "error_message": r.error_message,
            "created_at": r.created_at.isoformat(),
            "updated_at": r.updated_at.isoformat()
        })
    return result
