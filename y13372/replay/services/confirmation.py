from __future__ import annotations
from typing import Optional, List
from sqlalchemy.orm import Session

from replay.models import HumanConfirmation, QueueRecord
from replay.engine import add_history


def create_confirmation(
    db: Session,
    record_id: int,
    confirmer: str,
    after_status: str,
    before_status: Optional[str] = None,
    note: Optional[str] = None,
) -> HumanConfirmation:
    record = db.query(QueueRecord).filter(QueueRecord.id == record_id).first()
    if not record:
        raise ValueError(f"QueueRecord {record_id} not found")

    if before_status is None:
        before_status = record.status

    confirmation = HumanConfirmation(
        record_id=record_id,
        confirmer=confirmer,
        before_status=before_status,
        after_status=after_status,
        note=note,
    )
    db.add(confirmation)

    record.status = after_status
    db.commit()
    db.refresh(confirmation)

    add_history(
        db,
        session_id=record.session_id,
        event_type="human_confirmation",
        event_detail={
            "record_id": record_id,
            "confirmer": confirmer,
            "before_status": before_status,
            "after_status": after_status,
            "note": note,
        },
        record_id=record_id,
    )

    return confirmation


def list_confirmations(db: Session, record_id: int) -> List[HumanConfirmation]:
    return (
        db.query(HumanConfirmation)
        .filter(HumanConfirmation.record_id == record_id)
        .order_by(HumanConfirmation.created_at)
        .all()
    )
