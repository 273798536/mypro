from datetime import datetime
from typing import Optional
from .models import AuditLog


def log_action(
    db,
    entity_type: str,
    entity_id: int,
    action: str,
    field_name: Optional[str] = None,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
    source: Optional[str] = None,
    operator: Optional[str] = None,
    remark: Optional[str] = None,
):
    log = AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        field_name=field_name,
        old_value=str(old_value) if old_value is not None else None,
        new_value=str(new_value) if new_value is not None else None,
        source=source,
        operator=operator,
        remark=remark,
    )
    db.add(log)


def log_creation(db, entity_type: str, entity_id: int, source: str = None, operator: str = None):
    log_action(db, entity_type, entity_id, "create", source=source, operator=operator)


def log_update(
    db,
    entity_type: str,
    entity_id: int,
    field_name: str,
    old_value,
    new_value,
    source: str = None,
    operator: str = None,
    remark: str = None,
):
    if old_value != new_value:
        log_action(
            db,
            entity_type,
            entity_id,
            "update",
            field_name=field_name,
            old_value=old_value,
            new_value=new_value,
            source=source,
            operator=operator,
            remark=remark,
        )


def get_entity_history(db, entity_type: str, entity_id: int, limit: int = 100):
    return (
        db.query(AuditLog)
        .filter(AuditLog.entity_type == entity_type, AuditLog.entity_id == entity_id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )
