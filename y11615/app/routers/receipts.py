from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.models import Receipt, ReceiptMatch, Invoice, Customer
from app.schemas.schemas import Receipt as ReceiptSchema, ReceiptCreate, ReceiptMatchCreate, MatchingCorrection

router = APIRouter()


@router.get("/", response_model=List[ReceiptSchema], summary="获取回款列表")
def get_receipts(
    customer_id: Optional[int] = None,
    status: Optional[str] = None,
    unmatched_only: bool = False,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(Receipt)
    if customer_id:
        query = query.filter(Receipt.customer_id == customer_id)
    if status:
        query = query.filter(Receipt.status == status)
    if unmatched_only:
        query = query.filter(Receipt.unmatched_amount > 0.01)
    receipts = query.order_by(Receipt.receipt_date.desc()).offset(skip).limit(limit).all()
    return receipts


@router.get("/{receipt_id}", response_model=ReceiptSchema, summary="获取回款详情")
def get_receipt(receipt_id: int, db: Session = Depends(get_db)):
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="回款不存在")
    return receipt


@router.get("/{receipt_id}/matches", summary="获取回款匹配记录")
def get_receipt_matches(receipt_id: int, db: Session = Depends(get_db)):
    matches = db.query(ReceiptMatch).filter(ReceiptMatch.receipt_id == receipt_id).all()
    result = []
    for m in matches:
        invoice = db.query(Invoice).filter(Invoice.id == m.invoice_id).first()
        result.append({
            "id": m.id,
            "invoice_id": m.invoice_id,
            "invoice_no": invoice.invoice_no if invoice else None,
            "match_amount": m.match_amount,
            "match_date": m.match_date,
            "is_manual": m.is_manual,
            "is_corrected": m.is_corrected,
            "corrected_from_id": m.corrected_from_id,
            "remarks": m.remarks,
            "created_at": m.created_at
        })
    return result


@router.post("/", response_model=ReceiptSchema, summary="创建回款")
def create_receipt(receipt: ReceiptCreate, db: Session = Depends(get_db)):
    existing = db.query(Receipt).filter(Receipt.receipt_no == receipt.receipt_no).first()
    if existing:
        raise HTTPException(status_code=400, detail="回款编号已存在")
    customer = db.query(Customer).filter(Customer.id == receipt.customer_id).first()
    if not customer:
        raise HTTPException(status_code=400, detail="客户不存在")

    db_receipt = Receipt(**receipt.model_dump())
    db_receipt.unmatched_amount = receipt.receipt_amount
    db.add(db_receipt)
    db.commit()
    db.refresh(db_receipt)
    return db_receipt


@router.post("/auto-match", summary="自动匹配回款")
def auto_match_receipts(db: Session = Depends(get_db)):
    from app.services.ar_service import ARService
    service = ARService(db)
    result = service.auto_match_receipts()
    return result


@router.post("/manual-match", summary="手动匹配回款")
def manual_match_receipt(match_data: ReceiptMatchCreate, db: Session = Depends(get_db)):
    from app.services.ar_service import ARService
    service = ARService(db)
    try:
        match = service.manual_match_receipt(match_data)
        return {"success": True, "match_id": match.id, "match_amount": match.match_amount}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/correct-match", summary="修正回款匹配")
def correct_match(correction: MatchingCorrection, db: Session = Depends(get_db)):
    from app.services.ar_service import ARService
    service = ARService(db)
    try:
        result = service.correct_matching(correction)
        return {"success": True, **result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
