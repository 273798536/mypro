from __future__ import annotations
from typing import Optional, List
from sqlalchemy.orm import Session

from replay.models import AdjudicationChange, QueueRecord
from replay.engine import add_history


def create_adjudication(
    db: Session,
    record_id: int,
    new_verdict: str,
    source: str,
    source_id: Optional[int] = None,
    operator: Optional[str] = None,
    reason: Optional[str] = None,
) -> AdjudicationChange:
    record = db.query(QueueRecord).filter(QueueRecord.id == record_id).first()
    if not record:
        raise ValueError(f"QueueRecord {record_id} not found")

    old_verdict = record.final_verdict or record.original_verdict

    change = AdjudicationChange(
        record_id=record_id,
        old_verdict=old_verdict,
        new_verdict=new_verdict,
        source=source,
        source_id=source_id,
        operator=operator,
        reason=reason,
    )
    db.add(change)

    record.final_verdict = new_verdict
    record.status = "adjudicated"
    db.commit()
    db.refresh(change)

    add_history(
        db,
        session_id=record.session_id,
        event_type="adjudication_change",
        event_detail={
            "record_id": record_id,
            "old_verdict": old_verdict,
            "new_verdict": new_verdict,
            "source": source,
            "source_id": source_id,
            "operator": operator,
        },
        record_id=record_id,
    )

    return change


def list_adjudications(db: Session, record_id: int) -> List[AdjudicationChange]:
    return (
        db.query(AdjudicationChange)
        .filter(AdjudicationChange.record_id == record_id)
        .order_by(AdjudicationChange.created_at)
        .all()
    )
