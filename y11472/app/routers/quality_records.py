from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.auth import get_current_active_user, require_roles
from app import models, schemas
from app.enums import UserRole
from app.services import generate_no

router = APIRouter(prefix="/api/quality-records", tags=["质检记录"])


@router.get("/", response_model=List[schemas.QualityRecord])
def list_quality_records(
    skip: int = 0,
    limit: int = 100,
    application_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    query = db.query(models.QualityRecord)
    if application_id:
        query = query.filter(models.QualityRecord.application_id == application_id)
    return query.order_by(desc(models.QualityRecord.created_at)).offset(skip).limit(limit).all()


@router.post("/", response_model=schemas.QualityRecord)
def create_quality_record(
    record_data: schemas.QualityRecordCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.QUALITY_INSPECTOR, UserRole.ADMIN)),
):
    application = db.query(models.ReturnApplication).filter(
        models.ReturnApplication.id == record_data.application_id
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="退供申请不存在")

    record = models.QualityRecord(
        application_id=record_data.application_id,
        record_no=generate_no("QR"),
        item_id=record_data.item_id,
        inspector_id=current_user.id,
        inspection_result=record_data.inspection_result,
        defect_description=record_data.defect_description,
        photo_urls=record_data.photo_urls,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return record


@router.get("/{record_id}", response_model=schemas.QualityRecord)
def get_quality_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    record = db.query(models.QualityRecord).filter(
        models.QualityRecord.id == record_id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="质检记录不存在")
    return record
