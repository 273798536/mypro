from typing import List, Optional, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.models import (
    User, Batch, Receipt, Attachment, DirtyRecord,
    ReceiptStatus, UserRole, AuditAction, AuditLog
)
from app.schemas import (
    BatchCreate, ReceiptCreate, ReceiptUpdate
)
from app.state_machine import DirtyRecordDetector


def generate_batch_no() -> str:
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    return f"BATCH{timestamp}"


def generate_receipt_no() -> str:
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S%f")[:-3]
    return f"RCPT{timestamp}"


def write_audit_log(
    db: Session,
    operator: User,
    action: AuditAction,
    receipt_id: Optional[int] = None,
    details: Optional[dict] = None,
):
    audit = AuditLog(
        receipt_id=receipt_id,
        action=action,
        operator_id=operator.id,
        details=details or {},
    )
    db.add(audit)
    db.flush()
    return audit


def create_batch(db: Session, batch_in: BatchCreate, creator: User) -> Batch:
    batch = Batch(
        batch_no=generate_batch_no(),
        name=batch_in.name,
        description=batch_in.description,
        created_by=creator.id,
    )
    db.add(batch)
    db.flush()
    
    write_audit_log(db, creator, AuditAction.CREATE, details={
        "entity": "batch",
        "batch_no": batch.batch_no,
        "name": batch.name,
    })
    
    return batch


def get_batch(db: Session, batch_id: int) -> Optional[Batch]:
    return db.query(Batch).filter(Batch.id == batch_id).first()


def get_batches(db: Session, skip: int = 0, limit: int = 100) -> Tuple[List[Batch], int]:
    query = db.query(Batch)
    total = query.count()
    batches = query.order_by(Batch.created_at.desc()).offset(skip).limit(limit).all()
    return batches, total


def create_receipt(db: Session, receipt_in: ReceiptCreate, creator: User) -> Receipt:
    receipt = Receipt(
        receipt_no=generate_receipt_no(),
        batch_id=receipt_in.batch_id,
        material_id=receipt_in.material_id,
        material_name=receipt_in.material_name,
        original_material_name=receipt_in.material_name,
        platform=receipt_in.platform,
        review_result=receipt_in.review_result,
        review_comment=receipt_in.review_comment,
        daily_cost=receipt_in.daily_cost,
        daily_impressions=receipt_in.daily_impressions,
        daily_clicks=receipt_in.daily_clicks,
        secondary_confirmation=receipt_in.secondary_confirmation,
        confirmation_date=receipt_in.confirmation_date,
        report_date=receipt_in.report_date,
        cost_amount=receipt_in.cost_amount,
        raw_data=receipt_in.raw_data,
        created_by=creator.id,
    )
    db.add(receipt)
    db.flush()
    
    detector = DirtyRecordDetector(receipt, db)
    dirty_records = detector.detect_all()
    for dr in dirty_records:
        db.add(dr)
    
    if receipt_in.batch_id:
        batch = get_batch(db, receipt_in.batch_id)
        if batch:
            batch.total_count += 1
    
    write_audit_log(db, creator, AuditAction.CREATE, receipt_id=receipt.id, details={
        "entity": "receipt",
        "receipt_no": receipt.receipt_no,
        "material_id": receipt.material_id,
        "has_dirty": receipt.has_dirty,
        "dirty_types": receipt.dirty_types,
    })
    
    return receipt


def batch_create_receipts(db: Session, batch_id: int, receipts_in: List[ReceiptCreate], creator: User) -> List[Receipt]:
    receipts = []
    for receipt_in in receipts_in:
        receipt_in.batch_id = batch_id
        receipt = create_receipt(db, receipt_in, creator)
        receipts.append(receipt)
    return receipts


def get_receipt(db: Session, receipt_id: int) -> Optional[Receipt]:
    return db.query(Receipt).filter(Receipt.id == receipt_id).first()


def get_receipt_by_no(db: Session, receipt_no: str) -> Optional[Receipt]:
    return db.query(Receipt).filter(Receipt.receipt_no == receipt_no).first()


def get_receipts(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: Optional[ReceiptStatus] = None,
    material_id: Optional[str] = None,
    platform: Optional[str] = None,
    has_dirty: Optional[bool] = None,
) -> Tuple[List[Receipt], int]:
    query = db.query(Receipt)
    
    if status:
        query = query.filter(Receipt.status == status)
    if material_id:
        query = query.filter(Receipt.material_id == material_id)
    if platform:
        query = query.filter(Receipt.platform == platform)
    if has_dirty is not None:
        query = query.filter(Receipt.has_dirty == has_dirty)
    
    total = query.count()
    receipts = query.order_by(Receipt.created_at.desc()).offset(skip).limit(limit).all()
    return receipts, total


def update_receipt(db: Session, receipt: Receipt, receipt_in: ReceiptUpdate, operator: User) -> Receipt:
    update_data = receipt_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(receipt, field, value)
    
    db.query(DirtyRecord).filter(
        DirtyRecord.receipt_id == receipt.id,
        DirtyRecord.is_fixed == False
    ).delete(synchronize_session=False)
    
    detector = DirtyRecordDetector(receipt, db)
    dirty_records = detector.detect_all()
    for dr in dirty_records:
        db.add(dr)
    
    write_audit_log(db, operator, AuditAction.UPDATE, receipt_id=receipt.id, details={
        "entity": "receipt",
        "receipt_no": receipt.receipt_no,
        "updated_fields": list(update_data.keys()),
        "has_dirty": receipt.has_dirty,
    })
    
    db.flush()
    return receipt


def create_attachment(
    db: Session,
    receipt_id: int,
    file_name: str,
    file_path: str,
    file_size: int,
    file_type: str,
    uploader: User,
) -> Attachment:
    attachment = Attachment(
        receipt_id=receipt_id,
        file_name=file_name,
        file_path=file_path,
        file_size=file_size,
        file_type=file_type,
        uploaded_by=uploader.id,
    )
    db.add(attachment)
    db.flush()
    
    write_audit_log(db, uploader, AuditAction.UPLOAD_ATTACHMENT, receipt_id=receipt_id, details={
        "entity": "attachment",
        "file_name": file_name,
        "file_size": file_size,
        "file_type": file_type,
    })
    
    return attachment


def get_attachments(db: Session, receipt_id: int) -> List[Attachment]:
    return db.query(Attachment).filter(Attachment.receipt_id == receipt_id).all()


def get_dirty_records(db: Session, receipt_id: int) -> List[DirtyRecord]:
    return db.query(DirtyRecord).filter(DirtyRecord.receipt_id == receipt_id).all()


def fix_dirty_record(
    db: Session,
    receipt: Receipt,
    dirty_record: DirtyRecord,
    fix_note: Optional[str],
    fixed_by: User,
) -> DirtyRecord:
    dirty_record.is_fixed = True
    dirty_record.fixed_by = fixed_by.id
    dirty_record.fixed_at = datetime.now()
    dirty_record.fix_note = fix_note
    db.flush()
    
    remaining_unfixed = db.query(DirtyRecord).filter(
        DirtyRecord.receipt_id == receipt.id,
        DirtyRecord.is_fixed == False
    ).count()
    
    if remaining_unfixed == 0:
        detector = DirtyRecordDetector(receipt, db)
        new_dirty = detector.detect_all()
        for dr in new_dirty:
            db.add(dr)
        db.flush()
    
    receipt.has_dirty = (db.query(DirtyRecord).filter(
        DirtyRecord.receipt_id == receipt.id,
        DirtyRecord.is_fixed == False
    ).count() > 0)
    
    write_audit_log(db, fixed_by, AuditAction.FIX_DIRTY, receipt_id=receipt.id, details={
        "entity": "dirty_record",
        "dirty_id": dirty_record.id,
        "dirty_type": dirty_record.dirty_type.value,
        "field_name": dirty_record.field_name,
        "fix_note": fix_note,
        "remaining_dirty": receipt.has_dirty,
    })
    
    db.flush()
    return dirty_record


def get_supervisor_view(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: Optional[ReceiptStatus] = None,
    has_dirty: Optional[bool] = None,
) -> Tuple[List[Receipt], int]:
    query = db.query(Receipt)
    
    if status:
        query = query.filter(Receipt.status == status)
    if has_dirty is not None:
        query = query.filter(Receipt.has_dirty == has_dirty)
    
    total = query.count()
    receipts = query.order_by(Receipt.created_at.desc()).offset(skip).limit(limit).all()
    return receipts, total


def get_material_history(db: Session, material_id: str) -> List[Receipt]:
    return db.query(Receipt).filter(
        Receipt.material_id == material_id
    ).order_by(Receipt.report_date.desc()).all()
