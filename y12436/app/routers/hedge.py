from __future__ import annotations
from fastapi import APIRouter, Depends
from typing import Optional, List
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import HedgeContractCreate, HedgeContractOut
from app.services import hedge as svc

router = APIRouter(prefix="/hedge", tags=["套保合约"])


@router.post("/", response_model=HedgeContractOut)
def create_contract(contract_in: HedgeContractCreate, db: Session = Depends(get_db)):
    return svc.create_contract(db, contract_in)


@router.post("/{contract_id}/extend", response_model=Optional[HedgeContractOut])
def extend_contract(
    contract_id: int,
    new_end_date: str,
    new_price: float,
    db: Session = Depends(get_db),
):
    from datetime import date as date_type
    end = date_type.fromisoformat(new_end_date)
    return svc.extend_contract(db, contract_id, end, new_price)


@router.get("/", response_model=List[HedgeContractOut])
def list_contracts(contract_no: Optional[str] = None, db: Session = Depends(get_db)):
    return svc.list_contracts(db, contract_no)
