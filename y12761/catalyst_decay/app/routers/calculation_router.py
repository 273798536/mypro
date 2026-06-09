from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models import Batch
from app.schemas import CalculationRecordResponse, CalculationRecordBase
from app.services.calculation_service import (
    perform_balance_calculation, get_calculation_history
)

router = APIRouter(prefix="/api/calculation", tags=["配平计算"])


@router.post("/{batch_id}/balance", response_model=list[CalculationRecordResponse])
def run_balance_calculation(
    batch_id: int,
    operator: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    try:
        records = perform_balance_calculation(db, batch_id, operator)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return records


@router.get("/{batch_id}/history", response_model=list[CalculationRecordResponse])
def get_calculations(batch_id: int, db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return get_calculation_history(db, batch_id)
