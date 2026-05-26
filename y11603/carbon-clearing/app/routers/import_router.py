from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.schemas import (
    EnterpriseIn, EnergyReadingIn, CreditTransactionIn,
    InvoiceIn, ReceiptIn, ClearingTableIn, ImportResponse, ImportBatchOut
)
from app.services.import_service import (
    import_enterprises, import_readings, import_credits,
    import_invoices, import_receipts, import_clearing
)

router = APIRouter()


@router.post("/enterprises", response_model=ImportResponse)
def post_enterprises(items: List[EnterpriseIn], operator: Optional[str] = None,
                     db: Session = Depends(get_db)):
    batch = import_enterprises(db, items, operator)
    return ImportResponse(
        batch_no=batch.batch_no, source_type=batch.source_type,
        record_count=batch.record_count,
        message=f"导入企业{batch.record_count}家",
    )


@router.post("/readings", response_model=ImportResponse)
def post_readings(items: List[EnergyReadingIn], operator: Optional[str] = None,
                  db: Session = Depends(get_db)):
    batch = import_readings(db, items, operator)
    return ImportResponse(
        batch_no=batch.batch_no, source_type=batch.source_type,
        record_count=batch.record_count,
        message=f"导入用能读数{batch.record_count}条",
    )


@router.post("/credits", response_model=ImportResponse)
def post_credits(items: List[CreditTransactionIn], operator: Optional[str] = None,
                 db: Session = Depends(get_db)):
    batch = import_credits(db, items, operator)
    return ImportResponse(
        batch_no=batch.batch_no, source_type=batch.source_type,
        record_count=batch.record_count,
        message=f"导入碳积分流水{batch.record_count}条",
    )


@router.post("/invoices", response_model=ImportResponse)
def post_invoices(items: List[InvoiceIn], operator: Optional[str] = None,
                  db: Session = Depends(get_db)):
    batch = import_invoices(db, items, operator)
    return ImportResponse(
        batch_no=batch.batch_no, source_type=batch.source_type,
        record_count=batch.record_count,
        message=f"导入发票{batch.record_count}条",
    )


@router.post("/receipts", response_model=ImportResponse)
def post_receipts(items: List[ReceiptIn], operator: Optional[str] = None,
                  db: Session = Depends(get_db)):
    batch = import_receipts(db, items, operator)
    return ImportResponse(
        batch_no=batch.batch_no, source_type=batch.source_type,
        record_count=batch.record_count,
        message=f"导入交易回执{batch.record_count}条",
    )


@router.post("/clearing", response_model=ImportResponse)
def post_clearing(items: List[ClearingTableIn], operator: Optional[str] = None,
                  db: Session = Depends(get_db)):
    batch = import_clearing(db, items, operator)
    return ImportResponse(
        batch_no=batch.batch_no, source_type=batch.source_type,
        record_count=batch.record_count,
        message=f"导入清算表{batch.record_count}条",
    )


@router.get("/batches", response_model=List[ImportBatchOut])
def list_batches(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    from app.models.models import ImportBatch
    batches = (
        db.query(ImportBatch)
        .order_by(ImportBatch.created_at.desc())
        .offset(skip).limit(limit).all()
    )
    return batches


@router.get("/batches/{batch_no}", response_model=ImportBatchOut)
def get_batch(batch_no: str, db: Session = Depends(get_db)):
    from app.models.models import ImportBatch
    batch = db.query(ImportBatch).filter(ImportBatch.batch_no == batch_no).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return batch