from __future__ import annotations
from typing import Optional, List
from sqlalchemy.orm import Session

from replay.models import GrayScaleError, QueueRecord
from replay.engine import add_history


def report_grayscale_error(
    db: Session,
    record_id: int,
    expected_ratio: Optional[float] = None,
    actual_ratio: Optional[float] = None,
    impact_scope: Optional[str] = None,
    source_line: Optional[str] = None,
) -> GrayScaleError:
    record = db.query(QueueRecord).filter(QueueRecord.id == record_id).first()
    if not record:
        raise ValueError(f"QueueRecord {record_id} not found")

    error = GrayScaleError(
        record_id=record_id,
        expected_ratio=expected_ratio,
        actual_ratio=actual_ratio,
        impact_scope=impact_scope,
        source_line=source_line,
    )
    db.add(error)
    db.commit()
    db.refresh(error)

    add_history(
        db,
        session_id=record.session_id,
        event_type="grayscale_error_reported",
        event_detail={
            "record_id": record_id,
            "expected_ratio": expected_ratio,
            "actual_ratio": actual_ratio,
            "impact_scope": impact_scope,
            "source_line": source_line,
        },
        record_id=record_id,
    )

    return error


def list_grayscale_errors(db: Session, record_id: int) -> List[GrayScaleError]:
    return (
        db.query(GrayScaleError)
        .filter(GrayScaleError.record_id == record_id)
        .all()
    )


def list_session_grayscale_errors(db: Session, session_id: int) -> List[GrayScaleError]:
    record_ids = [
        r.id
        for r in db.query(QueueRecord).filter(QueueRecord.session_id == session_id).all()
    ]
    if not record_ids:
        return []
    return (
        db.query(GrayScaleError)
        .filter(GrayScaleError.record_id.in_(record_ids))
        .all()
    )
