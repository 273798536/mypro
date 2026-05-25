from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.handover import HandoverCreate, HandoverResponse, HandoverUpdate
from app.models.handover import HandoverRecord
from app.api.deps import require_permission, acquire_lock

router = APIRouter()


@router.post("/", response_model=HandoverResponse)
def create_handover(
    data: HandoverCreate,
    db: Session = Depends(get_db),
    lock_ctx: dict = acquire_lock("handover"),
    current_user: dict = require_permission("handover:write", "创建交接记录"),
):
    service_lock = lock_ctx["lock_service"]
    user_id = lock_ctx["user_id"]

    if not service_lock.acquire_lock("handover", data.handover_no, user_id):
        holder = service_lock.is_locked("handover", data.handover_no)
        raise HTTPException(status_code=409, detail=f"交接记录 {data.handover_no} 正在被 {holder} 处理，请稍后重试")

    try:
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
    finally:
        service_lock.release_lock("handover", data.handover_no)


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
    lock_ctx: dict = acquire_lock("handover"),
    current_user: dict = require_permission("handover:write", "更新交接记录"),
):
    service_lock = lock_ctx["lock_service"]
    user_id = lock_ctx["user_id"]

    if not service_lock.acquire_lock("handover", handover_no, user_id):
        holder = service_lock.is_locked("handover", handover_no)
        raise HTTPException(status_code=409, detail=f"交接记录 {handover_no} 正在被 {holder} 处理，请稍后重试")

    try:
        record = db.query(HandoverRecord).filter(HandoverRecord.handover_no == handover_no).first()
        if not record:
            raise HTTPException(status_code=404, detail="交接记录不存在")

        for key, value in data.model_dump(exclude_unset=True).items():
            if hasattr(record, key) and key != "updated_by":
                setattr(record, key, value)
        record.updated_by = data.updated_by

        db.commit()
        db.refresh(record)
        return {"status": "success", "record": record, "locked_by": user_id}
    finally:
        service_lock.release_lock("handover", handover_no)
