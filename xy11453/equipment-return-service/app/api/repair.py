from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import crud, schemas

router = APIRouter(prefix="/repair-estimates", tags=["repair-estimates"])


@router.post("/", response_model=schemas.RepairEstimateResponse)
def create_repair_estimate(
    estimate_in: schemas.RepairEstimateCreate,
    db: Session = Depends(get_db)
):
    existing = crud.repair_estimate.get_by_estimate_no(db, estimate_in.estimate_no)
    if existing:
        raise HTTPException(status_code=400, detail=f"Estimate {estimate_in.estimate_no} already exists")
    return crud.repair_estimate.create(db, estimate_in)


@router.get("/{estimate_no}", response_model=schemas.RepairEstimateResponse)
def get_repair_estimate(estimate_no: str, db: Session = Depends(get_db)):
    estimate = crud.repair_estimate.get_by_estimate_no(db, estimate_no)
    if not estimate:
        raise HTTPException(status_code=404, detail="Repair estimate not found")
    return estimate


@router.get("/", response_model=List[schemas.RepairEstimateResponse])
def list_repair_estimates(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    return db.query(crud.RepairEstimate).offset(skip).limit(limit).all()
