from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Batch, BatchStatus
from app.schemas import StatusAdvanceRequest, StatusTransitionResponse
from app.services.status_service import (
    advance_status, get_status_history, get_available_transitions,
    STATUS_LABEL_CN
)

router = APIRouter(prefix="/api/status", tags=["状态流转"])


@router.get("/{batch_id}/transitions")
def list_available_transitions(batch_id: int, db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    transitions = get_available_transitions(batch.status)
    return {
        "current_status": batch.status,
        "current_status_label": STATUS_LABEL_CN.get(batch.status, str(batch.status)),
        "available_transitions": [
            {"status": t[0], "label": t[1]} for t in transitions
        ]
    }


@router.post("/{batch_id}/advance", response_model=StatusTransitionResponse)
def advance_batch_status(
    batch_id: int,
    data: StatusAdvanceRequest,
    target_status: BatchStatus,
    db: Session = Depends(get_db)
):
    try:
        batch = advance_status(db, batch_id, target_status, data.operator, data.remark)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    history = get_status_history(db, batch_id)
    return history[-1]


@router.get("/{batch_id}/history", response_model=list[StatusTransitionResponse])
def get_batch_status_history(batch_id: int, db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return get_status_history(db, batch_id)
