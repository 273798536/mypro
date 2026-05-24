from sqlalchemy.orm import Session
from app.models import ChangeLog
from app.enums import ChangeType
from datetime import datetime


def log_change(
    db: Session,
    change_type: ChangeType,
    batch_id: int = None,
    work_order_id: int = None,
    field_name: str = None,
    old_value: str = None,
    new_value: str = None,
    change_reason: str = None,
    changed_by: str = None,
):
    db_change = ChangeLog(
        batch_id=batch_id,
        work_order_id=work_order_id,
        change_type=change_type.value,
        field_name=field_name,
        old_value=str(old_value) if old_value is not None else None,
        new_value=str(new_value) if new_value is not None else None,
        change_reason=change_reason,
        changed_by=changed_by,
    )
    db.add(db_change)
    db.flush()
    return db_change


def get_change_logs_by_batch(db: Session, batch_id: int, skip: int = 0, limit: int = 100):
    return db.query(ChangeLog).filter(ChangeLog.batch_id == batch_id).order_by(ChangeLog.created_at.desc()).offset(skip).limit(limit).all()


def get_change_logs_by_work_order(db: Session, work_order_id: int, skip: int = 0, limit: int = 100):
    return db.query(ChangeLog).filter(ChangeLog.work_order_id == work_order_id).order_by(ChangeLog.created_at.desc()).offset(skip).limit(limit).all()


def get_all_change_logs(db: Session, skip: int = 0, limit: int = 100):
    return db.query(ChangeLog).order_by(ChangeLog.created_at.desc()).offset(skip).limit(limit).all()
