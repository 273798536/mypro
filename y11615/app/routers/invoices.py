from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.database import get_db
from app.models.models import Invoice, Customer
from app.schemas.schemas import Invoice as InvoiceSchema, InvoiceCreate
from app.utils.common import calculate_aging_bucket

router = APIRouter()


@router.get("/", response_model=List[InvoiceSchema], summary="获取发票列表")
def get_invoices(
    customer_id: Optional[int] = None,
    status: Optional[str] = None,
    min_overdue_days: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(Invoice)
    if customer_id:
        query = query.filter(Invoice.customer_id == customer_id)
    if status:
        query = query.filter(Invoice.status == status)
    if min_overdue_days:
        query = query.filter(Invoice.overdue_days >= min_overdue_days)
    invoices = query.order_by(Invoice.due_date.desc()).offset(skip).limit(limit).all()
    return invoices


@router.get("/{invoice_id}", response_model=InvoiceSchema, summary="获取发票详情")
def get_invoice(invoice_id: int, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="发票不存在")
    return invoice


@router.get("/no/{invoice_no}", response_model=InvoiceSchema, summary="根据发票号获取")
def get_invoice_by_no(invoice_no: str, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.invoice_no == invoice_no).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="发票不存在")
    return invoice


@router.post("/", response_model=InvoiceSchema, summary="创建发票")
def create_invoice(invoice: InvoiceCreate, db: Session = Depends(get_db)):
    existing = db.query(Invoice).filter(Invoice.invoice_no == invoice.invoice_no).first()
    if existing:
        raise HTTPException(status_code=400, detail="发票号已存在")
    customer = db.query(Customer).filter(Customer.id == invoice.customer_id).first()
    if not customer:
        raise HTTPException(status_code=400, detail="客户不存在")

    db_invoice = Invoice(**invoice.model_dump())
    db_invoice.remaining_amount = invoice.total_amount
    bucket, overdue_days = calculate_aging_bucket(invoice.due_date)
    db_invoice.aging_bucket = bucket
    db_invoice.overdue_days = overdue_days

    db.add(db_invoice)
    db.commit()
    db.refresh(db_invoice)
    return db_invoice


@router.put("/{invoice_id}", response_model=InvoiceSchema, summary="更新发票")
def update_invoice(invoice_id: int, invoice: InvoiceCreate, db: Session = Depends(get_db)):
    db_invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not db_invoice:
        raise HTTPException(status_code=404, detail="发票不存在")
    for key, value in invoice.model_dump().items():
        if key != 'remaining_amount':
            setattr(db_invoice, key, value)
    bucket, overdue_days = calculate_aging_bucket(invoice.due_date)
    db_invoice.aging_bucket = bucket
    db_invoice.overdue_days = overdue_days
    db.commit()
    db.refresh(db_invoice)
    return db_invoice


@router.post("/update-aging", summary="更新所有发票账龄")
def update_all_aging(db: Session = Depends(get_db)):
    from app.services.ar_service import ARService
    service = ARService(db)
    updated = service.update_invoice_aging()
    return {"updated": updated}
