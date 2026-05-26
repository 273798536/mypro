from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.models import CollectionRecord, Customer, Invoice
from app.schemas.schemas import CollectionRecord as CollectionSchema, CollectionRecordCreate

router = APIRouter()


@router.get("/", response_model=List[CollectionSchema], summary="获取催收记录列表")
def get_collection_records(
    customer_id: Optional[int] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(CollectionRecord)
    if customer_id:
        query = query.filter(CollectionRecord.customer_id == customer_id)
    if status:
        query = query.filter(CollectionRecord.status == status)
    records = query.order_by(CollectionRecord.contact_date.desc()).offset(skip).limit(limit).all()
    return records


@router.get("/{record_id}", response_model=CollectionSchema, summary="获取催收记录详情")
def get_collection_record(record_id: int, db: Session = Depends(get_db)):
    record = db.query(CollectionRecord).filter(CollectionRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="催收记录不存在")
    return record


@router.get("/customer/{customer_id}", summary="获取客户催收历史")
def get_customer_collection_history(customer_id: int, db: Session = Depends(get_db)):
    from app.services.ar_service import ARService
    service = ARService(db)
    return service.get_collection_history(customer_id)


@router.post("/", response_model=CollectionSchema, summary="创建催收记录")
def create_collection_record(record: CollectionRecordCreate, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == record.customer_id).first()
    if not customer:
        raise HTTPException(status_code=400, detail="客户不存在")
    if record.invoice_id:
        invoice = db.query(Invoice).filter(Invoice.id == record.invoice_id).first()
        if not invoice:
            raise HTTPException(status_code=400, detail="发票不存在")

    db_record = CollectionRecord(**record.model_dump())
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record


@router.put("/{record_id}", response_model=CollectionSchema, summary="更新催收记录")
def update_collection_record(record_id: int, record: CollectionRecordCreate, db: Session = Depends(get_db)):
    db_record = db.query(CollectionRecord).filter(CollectionRecord.id == record_id).first()
    if not db_record:
        raise HTTPException(status_code=404, detail="催收记录不存在")
    for key, value in record.model_dump().items():
        setattr(db_record, key, value)
    db.commit()
    db.refresh(db_record)
    return db_record
