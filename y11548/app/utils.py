from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import inspect
from .models import (
    OperationLog, User, ExhibitionBatch, Material, LogisticsReceipt, 
    BorrowRecord, ScanRecord, BatchStatus, RecordStatus
)
import json
import uuid


def generate_no(prefix: str) -> str:
    return f"{prefix}{uuid.uuid4().hex[:8].upper()}"


def object_to_dict(obj) -> dict:
    if obj is None:
        return {}
    return {c.key: getattr(obj, c.key) for c in inspect(obj).mapper.column_attrs}


def serialize_value(value):
    if isinstance(value, datetime):
        return value.isoformat()
    if hasattr(value, 'value'):
        return value.value
    return value


def log_operation(
    db: Session,
    operation_type: str,
    table_name: str,
    record_id: int = None,
    old_value: dict = None,
    new_value: dict = None,
    created_by: int = None,
    ip_address: str = None,
    user_agent: str = None
):
    old_serialized = {k: serialize_value(v) for k, v in (old_value or {}).items()}
    new_serialized = {k: serialize_value(v) for k, v in (new_value or {}).items()}
    
    log = OperationLog(
        operation_type=operation_type,
        table_name=table_name,
        record_id=record_id,
        old_value=old_serialized if old_serialized else None,
        new_value=new_serialized if new_serialized else None,
        created_by=created_by,
        ip_address=ip_address,
        user_agent=user_agent
    )
    db.add(log)
    db.commit()


def is_batch_frozen(db: Session, batch_id: int) -> bool:
    batch = db.query(ExhibitionBatch).filter(ExhibitionBatch.id == batch_id).first()
    if not batch:
        return False
    return batch.status in [BatchStatus.FROZEN, BatchStatus.COMPLETED]


def can_modify_record(db: Session, batch_id: int, record_status: RecordStatus) -> bool:
    if is_batch_frozen(db, batch_id):
        return False
    return record_status not in [RecordStatus.FROZEN, RecordStatus.REVIEWED]


BATCH_STATUS_TRANSITIONS = {
    BatchStatus.DRAFT: [BatchStatus.IN_PROGRESS, BatchStatus.FROZEN],
    BatchStatus.IN_PROGRESS: [BatchStatus.REVIEWING, BatchStatus.FROZEN],
    BatchStatus.REVIEWING: [BatchStatus.IN_PROGRESS, BatchStatus.FROZEN, BatchStatus.COMPLETED],
    BatchStatus.FROZEN: [BatchStatus.IN_PROGRESS],
    BatchStatus.COMPLETED: []
}


RECORD_STATUS_TRANSITIONS = {
    RecordStatus.DRAFT: [RecordStatus.SUBMITTED, RecordStatus.FROZEN],
    RecordStatus.SUBMITTED: [RecordStatus.REVIEWED, RecordStatus.REJECTED, RecordStatus.FROZEN],
    RecordStatus.REVIEWED: [RecordStatus.FROZEN],
    RecordStatus.REJECTED: [RecordStatus.DRAFT, RecordStatus.FROZEN],
    RecordStatus.FROZEN: [RecordStatus.DRAFT]
}


def can_transition_batch_status(current: BatchStatus, target: BatchStatus) -> bool:
    return target in BATCH_STATUS_TRANSITIONS.get(current, [])


def can_transition_record_status(current: RecordStatus, target: RecordStatus) -> bool:
    return target in RECORD_STATUS_TRANSITIONS.get(current, [])


def get_table_model(table_name: str):
    table_map = {
        "exhibition_batches": ExhibitionBatch,
        "materials": Material,
        "logistics_receipts": LogisticsReceipt,
        "borrow_records": BorrowRecord,
        "scan_records": ScanRecord,
    }
    return table_map.get(table_name)
