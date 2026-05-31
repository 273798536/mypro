from __future__ import annotations
from fastapi import APIRouter, Depends
from typing import Optional, List
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import AllocationStatus
from app.schemas import PnLAllocationCreate, PnLAllocationOut, AllocationStatusTransition
from app.services import allocation as svc

router = APIRouter(prefix="/allocation", tags=["损益归集"])


@router.post("/", response_model=PnLAllocationOut)
def create_allocation(alloc_in: PnLAllocationCreate, db: Session = Depends(get_db)):
    return svc.create_allocation(db, alloc_in)


@router.post("/batch", response_model=List[PnLAllocationOut])
def batch_create(items: List[PnLAllocationCreate], db: Session = Depends(get_db)):
    return svc.batch_create(db, items)


@router.post("/{allocation_id}/review", response_model=Optional[PnLAllocationOut])
def review_allocation(allocation_id: int, body: AllocationStatusTransition, db: Session = Depends(get_db)):
    return svc.review_allocation(db, allocation_id, body.operator)


@router.post("/{allocation_id}/approve", response_model=Optional[PnLAllocationOut])
def approve_allocation(allocation_id: int, body: AllocationStatusTransition, db: Session = Depends(get_db)):
    return svc.approve_allocation(db, allocation_id, body.operator)


@router.get("/", response_model=List[PnLAllocationOut])
def list_allocations(status: Optional[AllocationStatus] = None, db: Session = Depends(get_db)):
    return svc.list_allocations(db, status)


@router.get("/{allocation_id}", response_model=Optional[PnLAllocationOut])
def get_allocation(allocation_id: int, db: Session = Depends(get_db)):
    return svc.get_allocation(db, allocation_id)
