import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import OverrideRecord, GrayBatch, OverrideStatus
from app.schemas.schemas import OverrideCreate, OverrideOut, OverrideTraceItem, OverrideTraceResponse

router = APIRouter()


@router.post("/", response_model=OverrideOut)
def create_override(body: OverrideCreate, db: Session = Depends(get_db)):
    batch = db.query(GrayBatch).filter(GrayBatch.id == body.batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    existing = db.query(OverrideRecord).filter(
        OverrideRecord.batch_id == body.batch_id,
        OverrideRecord.query_id == body.query_id,
        OverrideRecord.doc_id == body.doc_id,
        OverrideRecord.status == OverrideStatus.accepted,
    ).first()
    if existing:
        existing.status = OverrideStatus.superseded
        existing.superseded_by = "pending"
        existing.updated_at = datetime.utcnow()

    record = OverrideRecord(
        id=str(uuid.uuid4()),
        batch_id=body.batch_id,
        query_id=body.query_id,
        doc_id=body.doc_id,
        original_side=body.original_side,
        original_judgment=body.original_judgment,
        override_judgment=body.override_judgment,
        reason=body.reason,
        source=body.source,
        status=OverrideStatus.accepted,
        operator=body.operator,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(record)

    if existing:
        existing.superseded_by = record.id

    db.commit()
    db.refresh(record)
    return record


@router.get("/trace/{batch_id}/{query_id}/{doc_id}", response_model=OverrideTraceResponse)
def trace_override(batch_id: str, query_id: str, doc_id: str, db: Session = Depends(get_db)):
    records = db.query(OverrideRecord).filter(
        OverrideRecord.batch_id == batch_id,
        OverrideRecord.query_id == query_id,
        OverrideRecord.doc_id == doc_id,
    ).order_by(OverrideRecord.created_at.asc()).all()

    if not records:
        return OverrideTraceResponse(
            query_id=query_id, doc_id=doc_id,
            current_override=None, history=[],
        )

    history = [
        OverrideTraceItem(
            override_id=r.id,
            query_id=r.query_id,
            doc_id=r.doc_id,
            original_judgment=r.original_judgment,
            override_judgment=r.override_judgment,
            source=r.source,
            status=r.status,
            superseded_by=r.superseded_by,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in records
    ]

    current = None
    for r in records:
        if r.status == OverrideStatus.accepted:
            current = OverrideTraceItem(
                override_id=r.id,
                query_id=r.query_id,
                doc_id=r.doc_id,
                original_judgment=r.original_judgment,
                override_judgment=r.override_judgment,
                source=r.source,
                status=r.status,
                superseded_by=r.superseded_by,
                created_at=r.created_at,
                updated_at=r.updated_at,
            )

    return OverrideTraceResponse(
        query_id=query_id, doc_id=doc_id,
        current_override=current, history=history,
    )


@router.get("/batch/{batch_id}", response_model=list[OverrideOut])
def list_overrides(batch_id: str, db: Session = Depends(get_db)):
    return db.query(OverrideRecord).filter(
        OverrideRecord.batch_id == batch_id,
    ).order_by(OverrideRecord.created_at.desc()).all()


@router.post("/{override_id}/reject", response_model=OverrideOut)
def reject_override(override_id: str, db: Session = Depends(get_db)):
    record = db.query(OverrideRecord).filter(OverrideRecord.id == override_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="改判记录不存在")
    record.status = OverrideStatus.rejected
    record.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(record)
    return record
