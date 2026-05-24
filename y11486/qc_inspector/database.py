import os
from contextlib import contextmanager
from datetime import datetime
from typing import Optional
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from .models import Base, AuditLog, ReworkRecord, InspectionRecord, ShiftRecord, SupplierRecord, ApprovalRecord

DB_PATH = os.environ.get("QC_INSPECTOR_DB", "qc_inspector.db")
DB_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DB_URL, echo=False, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    Base.metadata.create_all(bind=engine)


@contextmanager
def get_db():
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def log_audit(
    db: Session,
    action: str,
    operator: str,
    reason: str,
    field_name: Optional[str] = None,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
    rework_id: Optional[int] = None,
    inspection_id: Optional[int] = None,
    shift_id: Optional[int] = None,
    supplier_id: Optional[int] = None,
    approval_id: Optional[int] = None,
    change_source: str = "manual"
):
    audit = AuditLog(
        rework_record_id=rework_id,
        inspection_record_id=inspection_id,
        shift_record_id=shift_id,
        supplier_record_id=supplier_id,
        approval_record_id=approval_id,
        action=action,
        field_name=field_name,
        old_value=str(old_value) if old_value is not None else None,
        new_value=str(new_value) if new_value is not None else None,
        operator=operator,
        reason=reason,
        change_source=change_source,
        created_at=datetime.now()
    )
    db.add(audit)


def update_record_with_audit(
    db: Session,
    record,
    field_name: str,
    new_value,
    operator: str,
    reason: str,
    change_source: str = "manual"
):
    old_value = getattr(record, field_name)
    if old_value == new_value:
        return False

    setattr(record, field_name, new_value)

    rework_id = None
    inspection_id = None
    shift_id = None
    supplier_id = None
    approval_id = None

    if isinstance(record, ReworkRecord):
        rework_id = record.id
    elif isinstance(record, InspectionRecord):
        inspection_id = record.id
    elif isinstance(record, ShiftRecord):
        shift_id = record.id
    elif isinstance(record, SupplierRecord):
        supplier_id = record.id
    elif isinstance(record, ApprovalRecord):
        approval_id = record.id

    log_audit(
        db=db,
        action="UPDATE",
        operator=operator,
        reason=reason,
        field_name=field_name,
        old_value=old_value,
        new_value=new_value,
        rework_id=rework_id,
        inspection_id=inspection_id,
        shift_id=shift_id,
        supplier_id=supplier_id,
        approval_id=approval_id,
        change_source=change_source
    )
    return True
