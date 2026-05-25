from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.sms import SmsCreate, SmsResponse, SmsUpdate
from app.models.sms_record import SmsRecord
from app.api.deps import require_permission

router = APIRouter()


@router.post("/", response_model=SmsResponse)
def create_sms(
    data: SmsCreate,
    db: Session = Depends(get_db),
    current_user: dict = require_permission("sms:write", "上传短信记录"),
):
    existing = db.query(SmsRecord).filter(SmsRecord.sms_no == data.sms_no).first()
    if existing:
        raise HTTPException(status_code=400, detail="短信记录已存在")

    record = SmsRecord(
        **data.model_dump(exclude_unset=True),
        created_by=data.operator or "system",
        updated_by=data.operator or "system",
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/{sms_no}", response_model=SmsResponse)
def get_sms(
    sms_no: str,
    db: Session = Depends(get_db),
    current_user: dict = require_permission("sms:read", "查看短信记录"),
):
    record = db.query(SmsRecord).filter(SmsRecord.sms_no == sms_no).first()
    if not record:
        raise HTTPException(status_code=404, detail="短信记录不存在")
    return record


@router.get("/checkin/{checkin_no}")
def get_sms_by_checkin(
    checkin_no: str,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: dict = require_permission("sms:read", "查看短信记录"),
):
    records = (
        db.query(SmsRecord)
        .filter(SmsRecord.checkin_no == checkin_no)
        .order_by(SmsRecord.sent_time.desc())
        .limit(limit)
        .all()
    )
    return {"count": len(records), "records": records}


@router.put("/{sms_no}")
def update_sms(
    sms_no: str,
    data: SmsUpdate,
    db: Session = Depends(get_db),
    current_user: dict = require_permission("sms:write", "更新短信记录"),
):
    record = db.query(SmsRecord).filter(SmsRecord.sms_no == sms_no).first()
    if not record:
        raise HTTPException(status_code=404, detail="短信记录不存在")

    for key, value in data.model_dump(exclude_unset=True).items():
        if hasattr(record, key) and key != "updated_by":
            setattr(record, key, value)
    record.updated_by = data.updated_by

    db.commit()
    db.refresh(record)
    return {"status": "success", "record": record}
