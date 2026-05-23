from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import crud, schemas
from app.business_logic import reconcile_partial_returns, calculate_deposit_deduction

router = APIRouter(prefix="/reconciliation", tags=["reconciliation"])


@router.get("/orders/{order_no}")
def get_order_reconciliation(order_no: str, db: Session = Depends(get_db)):
    try:
        result = reconcile_partial_returns(db, order_no)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/deduction/calculate")
def calculate_deduction(
    request: schemas.DeductionCalculationRequest,
    db: Session = Depends(get_db)
):
    try:
        result = calculate_deposit_deduction(
            db,
            warehouse_order_no=request.warehouse_order_no,
            return_record_ids=request.return_record_ids,
            operator=request.operator
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/deductions/", response_model=List[schemas.DepositDeductionResponse])
def list_deductions(
    warehouse_order_no: str = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    if warehouse_order_no:
        return crud.deposit_deduction.get_by_warehouse_order(db, warehouse_order_no)
    return crud.deposit_deduction.get_multi(db, skip=skip, limit=limit)


@router.get("/deductions/{deduction_no}", response_model=schemas.DepositDeductionResponse)
def get_deduction(deduction_no: str, db: Session = Depends(get_db)):
    deduction = db.query(crud.DepositDeduction).filter(
        crud.DepositDeduction.deduction_no == deduction_no
    ).first()
    if not deduction:
        raise HTTPException(status_code=404, detail="Deduction not found")
    return deduction
