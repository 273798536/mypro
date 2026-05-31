from typing import Optional
from sqlalchemy.orm import Session

from app.models import Arrival, AuditLog, DataStatus


def log_change(
    db: Session,
    arrival_id: int,
    field_name: str,
    old_value: Optional[str],
    new_value: Optional[str],
    operator: str = "system",
    change_reason: Optional[str] = None
) -> AuditLog:
    log = AuditLog(
        arrival_id=arrival_id,
        field_name=field_name,
        old_value=str(old_value) if old_value is not None else None,
        new_value=str(new_value) if new_value is not None else None,
        operator=operator,
        change_reason=change_reason
    )
    db.add(log)
    db.flush()
    return log


def update_arrival_with_audit(
    db: Session,
    arrival: Arrival,
    field_name: str,
    new_value,
    operator: str = "system",
    change_reason: Optional[str] = None
) -> bool:
    old_value = getattr(arrival, field_name)
    
    if old_value == new_value:
        return False
    
    old_str = str(old_value) if old_value is not None else None
    new_str = str(new_value) if new_value is not None else None
    
    setattr(arrival, field_name, new_value)
    
    log_change(db, arrival.id, field_name, old_str, new_str, operator, change_reason)
    
    if field_name == "magnitude_remark" and old_value is None and new_value is not None:
        arrival.has_magnitude_update = True
    
    return True


def get_arrival_changes(db: Session, arrival_id: int) -> list:
    return db.query(AuditLog).filter(
        AuditLog.arrival_id == arrival_id
    ).order_by(AuditLog.created_at.desc()).all()


def get_magnitude_updates(db: Session, event_tag: Optional[str] = None) -> list:
    query = db.query(Arrival).filter(Arrival.has_magnitude_update == True)
    if event_tag:
        query = query.filter(Arrival.event_tag == event_tag)
    return query.order_by(Arrival.updated_at.desc()).all()


def get_status_flow(db: Session, arrival_id: int) -> list:
    return db.query(AuditLog).filter(
        AuditLog.arrival_id == arrival_id,
        AuditLog.field_name == "status"
    ).order_by(AuditLog.created_at.asc()).all()
