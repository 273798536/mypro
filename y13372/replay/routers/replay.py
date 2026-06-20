from __future__ import annotations
import csv
import io
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from replay.database import get_db
from replay.models import QueueRecord, ExceptionEvent, AdjudicationChange, MaterialVersion, GrayScaleError, HumanConfirmation
from replay.schemas import (
    QueueRecordOut,
    RecordTraceOut,
    OutlierAnalysisOut,
    ExceptionEventOut,
    AdjudicationChangeOut,
    MaterialVersionOut,
    GrayScaleErrorOut,
    HumanConfirmationOut,
)
from replay.engine import detect_outliers, build_trace

router = APIRouter(prefix="/sessions/{session_id}/records", tags=["records"])


@router.get("/", response_model=List[QueueRecordOut])
def list_records(session_id: int, status: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(QueueRecord).filter(QueueRecord.session_id == session_id)
    if status:
        q = q.filter(QueueRecord.status == status)
    return q.all()


@router.get("/outliers", response_model=OutlierAnalysisOut)
def analyze_outliers(session_id: int, threshold: float = Query(default=2.0), db: Session = Depends(get_db)):
    outliers = detect_outliers(db, session_id, threshold)

    all_records = db.query(QueueRecord).filter(
        QueueRecord.session_id == session_id,
        QueueRecord.metric_value.isnot(None),
    ).all()

    values = [r.metric_value for r in all_records] if all_records else []
    avg = sum(values) / len(values) if values else None

    return OutlierAnalysisOut(
        session_id=session_id,
        total_records=len(all_records),
        outlier_count=len(outliers),
        outliers=outliers,
        avg_metric=avg,
    )


@router.get("/{record_id}/trace", response_model=RecordTraceOut)
def get_record_trace(record_id: int, db: Session = Depends(get_db)):
    trace = build_trace(db, record_id)
    if not trace:
        return RecordTraceOut(record=None)
    return RecordTraceOut(**trace)


@router.get("/{record_id}/exceptions", response_model=List[ExceptionEventOut])
def list_exceptions(record_id: int, db: Session = Depends(get_db)):
    return db.query(ExceptionEvent).filter(ExceptionEvent.record_id == record_id).all()


@router.get("/{record_id}/adjudications", response_model=List[AdjudicationChangeOut])
def list_adjudications(record_id: int, db: Session = Depends(get_db)):
    return db.query(AdjudicationChange).filter(
        AdjudicationChange.record_id == record_id
    ).order_by(AdjudicationChange.created_at).all()


@router.get("/{record_id}/materials", response_model=List[MaterialVersionOut])
def list_materials(record_id: int, db: Session = Depends(get_db)):
    return db.query(MaterialVersion).filter(
        MaterialVersion.record_id == record_id
    ).order_by(MaterialVersion.material_type, MaterialVersion.version).all()


@router.get("/{record_id}/grayscale-errors", response_model=List[GrayScaleErrorOut])
def list_grayscale_errors(record_id: int, db: Session = Depends(get_db)):
    return db.query(GrayScaleError).filter(GrayScaleError.record_id == record_id).all()


@router.get("/{record_id}/confirmations", response_model=List[HumanConfirmationOut])
def list_confirmations(record_id: int, db: Session = Depends(get_db)):
    return db.query(HumanConfirmation).filter(
        HumanConfirmation.record_id == record_id
    ).order_by(HumanConfirmation.created_at).all()


@router.get("/export/csv")
def export_csv(session_id: int, db: Session = Depends(get_db)):
    records = db.query(QueueRecord).filter(QueueRecord.session_id == session_id).all()

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "id", "sample_id", "status", "original_verdict", "final_verdict",
        "metric_value", "is_outlier", "created_at", "updated_at",
    ])

    for r in records:
        writer.writerow([
            r.id, r.sample_id, r.status, r.original_verdict, r.final_verdict,
            r.metric_value, r.is_outlier, r.created_at, r.updated_at,
        ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=replay_session_{session_id}.csv"},
    )
