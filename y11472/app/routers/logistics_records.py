from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.auth import get_current_active_user, require_roles
from app import models, schemas
from app.enums import UserRole

router = APIRouter(prefix="/api/logistics-records", tags=["物流记录"])


@router.get("/", response_model=List[schemas.LogisticsRecord])
def list_logistics_records(
    skip: int = 0,
    limit: int = 100,
    application_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    query = db.query(models.LogisticsRecord)
    if application_id:
        query = query.filter(models.LogisticsRecord.application_id == application_id)
    return query.order_by(desc(models.LogisticsRecord.created_at)).offset(skip).limit(limit).all()


@router.post("/", response_model=schemas.LogisticsRecord)
def create_logistics_record(
    record_data: schemas.LogisticsRecordCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.WAREHOUSE_STAFF, UserRole.PROCUREMENT_STAFF, UserRole.ADMIN)),
):
    application = db.query(models.ReturnApplication).filter(
        models.ReturnApplication.id == record_data.application_id
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="退供申请不存在")

    existing = db.query(models.LogisticsRecord).filter(
        models.LogisticsRecord.tracking_no == record_data.tracking_no
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="运单号已存在")

    record = models.LogisticsRecord(
        application_id=record_data.application_id,
        tracking_no=record_data.tracking_no,
        carrier=record_data.carrier,
        shipment_date=record_data.shipment_date,
        delivery_date=record_data.delivery_date,
        weight=record_data.weight,
        package_count=record_data.package_count,
        signed_by=record_data.signed_by,
        receipt_photo_url=record_data.receipt_photo_url,
        status=record_data.status,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return record


@router.get("/{record_id}", response_model=schemas.LogisticsRecord)
def get_logistics_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    record = db.query(models.LogisticsRecord).filter(
        models.LogisticsRecord.id == record_id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="物流记录不存在")
    return record
