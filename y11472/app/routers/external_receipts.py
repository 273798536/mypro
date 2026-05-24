from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.auth import get_current_active_user, require_roles
from app import models, schemas
from app.enums import UserRole
from app.services import ExternalReceiptService

router = APIRouter(prefix="/api/external-receipts", tags=["外部回执"])


@router.get("/", response_model=List[schemas.ExternalReceipt])
def list_receipts(
    skip: int = 0,
    limit: int = 100,
    application_id: Optional[int] = None,
    import_batch_no: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    query = db.query(models.ExternalReceipt)

    if application_id:
        query = query.filter(models.ExternalReceipt.application_id == application_id)
    if import_batch_no:
        query = query.filter(models.ExternalReceipt.import_batch_no == import_batch_no)

    return query.order_by(desc(models.ExternalReceipt.created_at)).offset(skip).limit(limit).all()


@router.post("/", response_model=schemas.ExternalReceipt)
def create_receipt(
    receipt_data: schemas.ExternalReceiptCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.WAREHOUSE_STAFF, UserRole.PROCUREMENT_STAFF, UserRole.ADMIN)),
):
    try:
        receipt = ExternalReceiptService.create_receipt(db, receipt_data, current_user)
        db.commit()
        db.refresh(receipt)
        return receipt
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{receipt_id}", response_model=schemas.ExternalReceipt)
def get_receipt(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    receipt = db.query(models.ExternalReceipt).filter(
        models.ExternalReceipt.id == receipt_id
    ).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="回执不存在")
    return receipt
