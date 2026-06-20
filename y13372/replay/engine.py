from __future__ import annotations
import statistics
from typing import Optional, List
from sqlalchemy.orm import Session

from replay.models import (
    QueueRecord,
    ReplaySession,
    ReplayHistory,
    ExceptionEvent,
    AdjudicationChange,
    MaterialVersion,
    GrayScaleError,
    HumanConfirmation,
)


def detect_outliers(db: Session, session_id: int, threshold: float = 2.0) -> List[QueueRecord]:
    records = db.query(QueueRecord).filter(
        QueueRecord.session_id == session_id,
        QueueRecord.metric_value.isnot(None),
    ).all()

    if len(records) < 3:
        return []

    values = [r.metric_value for r in records]
    mean = statistics.mean(values)
    stdev = statistics.stdev(values)

    if stdev == 0:
        return []

    outliers = []
    for r in records:
        z = abs(r.metric_value - mean) / stdev
        if z > threshold:
            r.is_outlier = True
            outliers.append(r)

    db.commit()
    return outliers


def build_trace(db: Session, record_id: int) -> dict:
    record = db.query(QueueRecord).filter(QueueRecord.id == record_id).first()
    if not record:
        return {}

    exceptions = db.query(ExceptionEvent).filter(ExceptionEvent.record_id == record_id).all()
    adjudications = db.query(AdjudicationChange).filter(
        AdjudicationChange.record_id == record_id
    ).order_by(AdjudicationChange.created_at).all()
    materials = db.query(MaterialVersion).filter(
        MaterialVersion.record_id == record_id
    ).order_by(MaterialVersion.version).all()
    gs_errors = db.query(GrayScaleError).filter(GrayScaleError.record_id == record_id).all()
    confirmations = db.query(HumanConfirmation).filter(
        HumanConfirmation.record_id == record_id
    ).order_by(HumanConfirmation.created_at).all()

    return {
        "record": record,
        "exceptions": exceptions,
        "adjudications": adjudications,
        "materials": materials,
        "grayscale_errors": gs_errors,
        "confirmations": confirmations,
    }


def add_history(
    db: Session,
    session_id: int,
    event_type: str,
    event_detail: Optional[dict] = None,
    record_id: Optional[int] = None,
) -> ReplayHistory:
    entry = ReplayHistory(
        session_id=session_id,
        record_id=record_id,
        event_type=event_type,
        event_detail=event_detail,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def rerun_session(db: Session, session_id: int) -> Optional[ReplaySession]:
    session = db.query(ReplaySession).filter(ReplaySession.id == session_id).first()
    if not session:
        return None

    session.status = "running"
    db.commit()

    records = db.query(QueueRecord).filter(QueueRecord.session_id == session_id).all()
    for r in records:
        r.status = "pending"
        r.final_verdict = None
        r.is_outlier = False

    db.commit()

    add_history(
        db,
        session_id=session_id,
        event_type="rerun",
        event_detail={"triggered_by": "api"},
    )

    return session


def finish_session(db: Session, session_id: int) -> Optional[ReplaySession]:
    from datetime import datetime, timezone

    session = db.query(ReplaySession).filter(ReplaySession.id == session_id).first()
    if not session:
        return None

    session.status = "completed"
    session.completed_at = datetime.now(timezone.utc)
    db.commit()

    add_history(
        db,
        session_id=session_id,
        event_type="session_completed",
    )

    return session
