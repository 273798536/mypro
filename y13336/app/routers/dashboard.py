from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.models import (
    GrayBatch, RecallResult, OverrideRecord, Material, LeakMark,
    OverrideStatus, LeakStatus, RecallSide,
)
from app.schemas.schemas import DashboardStatus, BatchComparison

router = APIRouter()


@router.get("/status/{batch_id}", response_model=DashboardStatus)
def batch_status(batch_id: str, db: Session = Depends(get_db)):
    batch = db.query(GrayBatch).filter(GrayBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    total_queries = db.query(func.count(func.distinct(RecallResult.query_id))).filter(
        RecallResult.batch_id == batch_id
    ).scalar() or 0

    overrides_total = db.query(func.count(OverrideRecord.id)).filter(
        OverrideRecord.batch_id == batch_id
    ).scalar() or 0

    overrides_accepted = db.query(func.count(OverrideRecord.id)).filter(
        OverrideRecord.batch_id == batch_id,
        OverrideRecord.status == OverrideStatus.accepted,
    ).scalar() or 0

    overrides_pending = db.query(func.count(OverrideRecord.id)).filter(
        OverrideRecord.batch_id == batch_id,
        OverrideRecord.status == OverrideStatus.pending,
    ).scalar() or 0

    leaks_suspected = db.query(func.count(LeakMark.id)).filter(
        LeakMark.batch_id == batch_id,
        LeakMark.status == LeakStatus.suspected,
    ).scalar() or 0

    leaks_confirmed = db.query(func.count(LeakMark.id)).filter(
        LeakMark.batch_id == batch_id,
        LeakMark.status == LeakStatus.confirmed,
    ).scalar() or 0

    materials_count = db.query(func.count(Material.id)).filter(
        Material.batch_id == batch_id,
    ).scalar() or 0

    return DashboardStatus(
        batch_id=batch_id,
        batch_name=batch.name,
        total_queries=total_queries,
        overrides_total=overrides_total,
        overrides_accepted=overrides_accepted,
        overrides_pending=overrides_pending,
        leaks_suspected=leaks_suspected,
        leaks_confirmed=leaks_confirmed,
        materials_count=materials_count,
    )


@router.get("/compare/{batch_a_id}/{batch_b_id}", response_model=BatchComparison)
def compare_batches(batch_a_id: str, batch_b_id: str, db: Session = Depends(get_db)):
    for bid in [batch_a_id, batch_b_id]:
        if not db.query(GrayBatch).filter(GrayBatch.id == bid).first():
            raise HTTPException(status_code=404, detail=f"批次 {bid} 不存在")

    queries_a = set(
        r[0] for r in db.query(func.distinct(RecallResult.query_id)).filter(
            RecallResult.batch_id == batch_a_id
        ).all()
    )
    queries_b = set(
        r[0] for r in db.query(func.distinct(RecallResult.query_id)).filter(
            RecallResult.batch_id == batch_b_id
        ).all()
    )

    overrides_a = set(
        (r.query_id, r.doc_id) for r in db.query(OverrideRecord).filter(
            OverrideRecord.batch_id == batch_a_id
        ).all()
    )
    overrides_b = set(
        (r.query_id, r.doc_id) for r in db.query(OverrideRecord).filter(
            OverrideRecord.batch_id == batch_b_id
        ).all()
    )

    shared_queries = queries_a & queries_b
    only_a = overrides_a - overrides_b
    only_b = overrides_b - overrides_a

    shared_overrides = overrides_a & overrides_b
    shared_diff = 0
    for qid, did in shared_overrides:
        rec_a = db.query(OverrideRecord).filter(
            OverrideRecord.batch_id == batch_a_id,
            OverrideRecord.query_id == qid,
            OverrideRecord.doc_id == did,
            OverrideRecord.status == OverrideStatus.accepted,
        ).first()
        rec_b = db.query(OverrideRecord).filter(
            OverrideRecord.batch_id == batch_b_id,
            OverrideRecord.query_id == qid,
            OverrideRecord.doc_id == did,
            OverrideRecord.status == OverrideStatus.accepted,
        ).first()
        if rec_a and rec_b and rec_a.override_judgment != rec_b.override_judgment:
            shared_diff += 1

    return BatchComparison(
        batch_a_id=batch_a_id,
        batch_b_id=batch_b_id,
        queries_in_both=len(shared_queries),
        overrides_only_in_a=len(only_a),
        overrides_only_in_b=len(only_b),
        shared_override_diff=shared_diff,
    )


@router.get("/batches-summary", response_model=list[DashboardStatus])
def all_batches_summary(db: Session = Depends(get_db)):
    batches = db.query(GrayBatch).order_by(GrayBatch.created_at.desc()).all()
    result = []
    for batch in batches:
        status = batch_status(batch.id, db)
        result.append(status)
    return result
