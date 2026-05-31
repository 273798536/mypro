from __future__ import annotations
from sqlalchemy.orm import Session
from app.models import AuditTrail
from app.schemas import AuditTrailOut


def list_audits(db: Session, allocation_id: int | None = None) -> list[AuditTrail]:
    q = db.query(AuditTrail)
    if allocation_id:
        q = q.filter(AuditTrail.allocation_id == allocation_id)
    return q.order_by(AuditTrail.created_at.desc()).all()
