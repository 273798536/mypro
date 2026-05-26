from datetime import datetime
from typing import Optional, List
from sqlalchemy import and_
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


def get_contract_full_history(db, contract_ids: List[int], gps_order_ids: List[int] = None, limit: int = 200):
    from sqlalchemy import or_
    filters = [
        and_(AuditLog.entity_type == "Contract", AuditLog.entity_id == cid)
        for cid in contract_ids
    ]
    if gps_order_ids:
        filters.extend([
            and_(AuditLog.entity_type == "GpsWorkOrder", AuditLog.entity_id == gid)
            for gid in gps_order_ids
        ])

    return (
        db.query(AuditLog)
        .filter(or_(*filters))
        .order_by(AuditLog.created_at.asc())
        .limit(limit)
        .all()
    )
