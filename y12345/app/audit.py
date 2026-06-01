from typing import Optional
from sqlalchemy.orm import Session
from app.models import AuditLog


def log_change(
    db: Session,
    experiment_id: Optional[int],
    entity_type: str,
    entity_id: int,
    field_changed: str,
    old_value: Optional[str],
    new_value: Optional[str],
    reason: Optional[str] = None,
) -> AuditLog:
    entry = AuditLog(
        experiment_id=experiment_id,
        entity_type=entity_type,
        entity_id=entity_id,
        field_changed=field_changed,
        old_value=str(old_value) if old_value is not None else None,
        new_value=str(new_value) if new_value is not None else None,
        reason=reason,
    )
    db.add(entry)
    db.flush()
    return entry
