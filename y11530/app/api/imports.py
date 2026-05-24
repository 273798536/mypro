from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import (
    ScheduleImport,
    LeaveImport,
    ForecastImport,
    RefundImport,
    InventoryImport,
    ImportResponse,
)
from app.services import IdempotencyService

router = APIRouter(prefix="/import", tags=["import"])


@router.post("/schedules", response_model=ImportResponse)
def import_schedules(data: List[ScheduleImport], db: Session = Depends(get_db)):
    try:
        service = IdempotencyService(db)
        data_dicts = [item.model_dump() for item in data]
        return service.batch_import_schedules(data_dicts)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/leaves", response_model=ImportResponse)
def import_leaves(data: List[LeaveImport], db: Session = Depends(get_db)):
    try:
        service = IdempotencyService(db)
        data_dicts = [item.model_dump() for item in data]
        return service.batch_import_leaves(data_dicts)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/forecasts", response_model=ImportResponse)
def import_forecasts(data: List[ForecastImport], db: Session = Depends(get_db)):
    try:
        service = IdempotencyService(db)
        data_dicts = [item.model_dump() for item in data]
        return service.batch_import_forecasts(data_dicts)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/refunds", response_model=ImportResponse)
def import_refunds(data: List[RefundImport], db: Session = Depends(get_db)):
    try:
        service = IdempotencyService(db)
        data_dicts = [item.model_dump() for item in data]
        return service.batch_import_refunds(data_dicts)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/inventories", response_model=ImportResponse)
def import_inventories(data: List[InventoryImport], db: Session = Depends(get_db)):
    try:
        service = IdempotencyService(db)
        data_dicts = [item.model_dump() for item in data]
        return service.batch_import_inventories(data_dicts)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
