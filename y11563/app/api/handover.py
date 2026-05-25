from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.handover import HandoverCreate, HandoverResponse, HandoverUpdate
from app.models.handover import HandoverRecord
from app.api.deps import require_permission

router = APIRouter()


@router.post("/", response_model=HandoverResponse)
def create_handover(
    data: HandoverCreate,
    db: Session = Depends(get_db),
    current_user: dict = require_permission("handover:write", "创建交接记录"),
):
    existing = db.query(HandoverRecord).filter(HandoverRecord.handover_no == data.handover_no).first()
    if existing:
        raise HTTPException(status_code=400, detail="交接记录已存在")

    record = HandoverRecord(
        **data.model_dump(exclude_unset=True),
        created_by=data.operator_out or "system",
        updated_by=data.operator_in or "system",
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/{handover_no}", response_model=HandoverResponse)
def get_handover(
    handover_no: str,
    db: Session = Depends(get_db),
    current_user: dict = require_permission("handover:read", "查看交接记录"),
):
    record = db.query(HandoverRecord).filter(HandoverRecord.handover_no == handover_no).first()
    if not record:
        raise HTTPException(status_code=404, detail="交接记录不存在")
    return record


@router.get("/date/{date_str}")
def get_handover_by_date(
    date_str: str,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: dict = require_permission("handover:read", "查看交接记录"),
):
    records = (
        db.query(HandoverRecord)
        .filter(HandoverRecord.handover_date.like(f"{date_str}%"))
        .order_by(HandoverRecord.handover_date.desc())
        .limit(limit)
        .all()
    )
    return {"count": len(records), "records": records}


@router.put("/{handover_no}")
def update_handover(
    handover_no: str,
    data: HandoverUpdate,
    db: Session = Depends(get_db),
    current_user: dict = require_permission("handover:write", "更新交接记录"),
):
    record = db.query(HandoverRecord).filter(HandoverRecord.handover_no == handover_no).first()
    if not record:
        raise HTTPException(status_code=404, detail="交接记录不存在")

    for key, value in data.model_dump(exclude_unset=True).items():
        if hasattr(record, key) and key != "updated_by":
            setattr(record, key, value)
    record.updated_by = data.updated_by

    db.commit()
    db.refresh(record)
    return {"status": "success", "record": record}
