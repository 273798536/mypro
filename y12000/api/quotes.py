from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid

from database import get_db
import models
import schemas

router = APIRouter()


@router.get("/", response_model=List[schemas.QuoteSnapshot])
def get_quotes(skip: int = 0, limit: int = 100, snapshot_date: str = None, stock_code: str = None, db: Session = Depends(get_db)):
    query = db.query(models.QuoteSnapshot)
    if snapshot_date:
        query = query.filter(models.QuoteSnapshot.snapshot_date == snapshot_date)
    if stock_code:
        query = query.filter(models.QuoteSnapshot.stock_code == stock_code)
    quotes = query.offset(skip).limit(limit).all()
    return quotes


@router.get("/{quote_id}", response_model=schemas.QuoteSnapshot)
def get_quote(quote_id: str, db: Session = Depends(get_db)):
    quote = db.query(models.QuoteSnapshot).filter(models.QuoteSnapshot.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="行情快照不存在")
    return quote


@router.post("/", response_model=schemas.QuoteSnapshot)
def create_quote(quote: schemas.QuoteSnapshotCreate, db: Session = Depends(get_db)):
    db_quote = models.QuoteSnapshot(
        id=str(uuid.uuid4()),
        **quote.model_dump()
    )
    db.add(db_quote)
    db.commit()
    db.refresh(db_quote)
    return db_quote


@router.delete("/{quote_id}")
def delete_quote(quote_id: str, db: Session = Depends(get_db)):
    quote = db.query(models.QuoteSnapshot).filter(models.QuoteSnapshot.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="行情快照不存在")
    
    db.delete(quote)
    db.commit()
    return {"message": "删除成功"}


@router.post("/batch-import")
def batch_import_quotes(data: List[schemas.QuoteSnapshotCreate], db: Session = Depends(get_db)):
    success_count = 0
    failed_count = 0
    results = []
    
    for item in data:
        try:
            db_quote = models.QuoteSnapshot(id=str(uuid.uuid4()), **item.model_dump())
            db.add(db_quote)
            success_count += 1
            results.append({"stock_code": item.stock_code, "snapshot_date": item.snapshot_date, "status": "success"})
        except Exception as e:
            failed_count += 1
            results.append({"stock_code": item.stock_code, "snapshot_date": item.snapshot_date, "status": "failed", "reason": str(e)})
    
    db.commit()
    return {
        "success_count": success_count,
        "failed_count": failed_count,
        "results": results
    }
