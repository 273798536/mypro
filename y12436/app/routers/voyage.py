from __future__ import annotations
from fastapi import APIRouter, Depends
from typing import Optional, List
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import VoyagePlanCreate, VoyagePlanOut, VoyageImpactReport
from app.services import voyage as svc

router = APIRouter(prefix="/voyage", tags=["航次计划"])


@router.post("/", response_model=VoyagePlanOut)
def create_voyage(voyage_in: VoyagePlanCreate, db: Session = Depends(get_db)):
    return svc.create_voyage(db, voyage_in)


@router.get("/", response_model=List[VoyagePlanOut])
def list_voyages(db: Session = Depends(get_db)):
    return svc.list_voyages(db)


@router.get("/{voyage_id}/impact", response_model=Optional[VoyageImpactReport])
def get_impact(voyage_id: int, db: Session = Depends(get_db)):
    return svc.get_voyage_impact(db, voyage_id)
