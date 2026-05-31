from __future__ import annotations
from fastapi import APIRouter, Depends
from typing import Optional, List
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import BunkeringSlipCreate, BunkeringSlipOut
from app.services import bunkering as svc

router = APIRouter(prefix="/bunkering", tags=["加油单"])


@router.post("/import", response_model=List[BunkeringSlipOut])
def import_slips(slips: List[BunkeringSlipCreate], db: Session = Depends(get_db)):
    return svc.import_slips(db, slips)


@router.get("/", response_model=List[BunkeringSlipOut])
def list_slips(voyage_id: Optional[int] = None, db: Session = Depends(get_db)):
    return svc.list_slips(db, voyage_id)


@router.get("/unlinked", response_model=List[BunkeringSlipOut])
def list_unlinked(db: Session = Depends(get_db)):
    return svc.get_unlinked_slips(db)
