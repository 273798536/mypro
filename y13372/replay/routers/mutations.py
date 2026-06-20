from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from replay.database import get_db
from replay.models import QueueRecord, ExceptionEvent
from replay.schemas import (
    QueueRecordCreate,
    QueueRecordOut,
    ExceptionEventCreate,
    ExceptionEventOut,
    AdjudicationChangeCreate,
    AdjudicationChangeOut,
    MaterialVersionCreate,
    MaterialVersionOut,
    GrayScaleErrorCreate,
    GrayScaleErrorOut,
    HumanConfirmationCreate,
    HumanConfirmationOut,
)
from replay.engine import add_history
from replay.services.adjudication import create_adjudication
from replay.services.material import add_material
from replay.services.grayscale import report_grayscale_error
from replay.services.confirmation import create_confirmation

router = APIRouter(tags=["mutations"])


@router.post(
    "/sessions/{session_id}/records",
    response_model=QueueRecordOut,
)
def create_record(session_id: int, payload: QueueRecordCreate, db: Session = Depends(get_db)):
    record = QueueRecord(
        session_id=session_id,
        sample_id=payload.sample_id,
        original_verdict=payload.original_verdict,
        final_verdict=payload.original_verdict,
        metric_value=payload.metric_value,
        status="pending",
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    add_history(
        db,
        session_id=session_id,
        event_type="record_created",
        event_detail={"sample_id": payload.sample_id},
        record_id=record.id,
    )

    return record


@router.post(
    "/records/{record_id}/exceptions",
    response_model=ExceptionEventOut,
)
def add_exception(record_id: int, payload: ExceptionEventCreate, db: Session = Depends(get_db)):
    record = db.query(QueueRecord).filter(QueueRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    event = ExceptionEvent(
        record_id=record_id,
        exception_type=payload.exception_type,
        exception_detail=payload.exception_detail,
        source_line=payload.source_line,
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    add_history(
        db,
        session_id=record.session_id,
        event_type="exception_detected",
        event_detail={
            "exception_type": payload.exception_type,
            "source_line": payload.source_line,
        },
        record_id=record_id,
    )

    return event


@router.post(
    "/records/{record_id}/adjudications",
    response_model=AdjudicationChangeOut,
)
def add_adjudication(record_id: int, payload: AdjudicationChangeCreate, db: Session = Depends(get_db)):
    try:
        change = create_adjudication(
            db,
            record_id=record_id,
            new_verdict=payload.new_verdict,
            source=payload.source,
            source_id=payload.source_id,
            operator=payload.operator,
            reason=payload.reason,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return change


@router.post(
    "/records/{record_id}/materials",
    response_model=MaterialVersionOut,
)
def add_material_version(record_id: int, payload: MaterialVersionCreate, db: Session = Depends(get_db)):
    try:
        material = add_material(
            db,
            record_id=record_id,
            material_type=payload.material_type,
            content=payload.content,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return material


@router.post(
    "/records/{record_id}/grayscale-errors",
    response_model=GrayScaleErrorOut,
)
def add_grayscale_error(record_id: int, payload: GrayScaleErrorCreate, db: Session = Depends(get_db)):
    try:
        error = report_grayscale_error(
            db,
            record_id=record_id,
            expected_ratio=payload.expected_ratio,
            actual_ratio=payload.actual_ratio,
            impact_scope=payload.impact_scope,
            source_line=payload.source_line,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return error


@router.post(
    "/records/{record_id}/confirmations",
    response_model=HumanConfirmationOut,
)
def add_confirmation(record_id: int, payload: HumanConfirmationCreate, db: Session = Depends(get_db)):
    try:
        confirmation = create_confirmation(
            db,
            record_id=record_id,
            confirmer=payload.confirmer,
            after_status=payload.after_status,
            before_status=payload.before_status,
            note=payload.note,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return confirmation
