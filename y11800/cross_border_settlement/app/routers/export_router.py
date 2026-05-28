from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, Depends, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.export_service import export_settlements_json, export_settlements_csv

router = APIRouter(prefix="/export", tags=["导出"])


@router.get("/json")
def export_json(
    match_status: Optional[str] = Query(None),
    currency: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    data = export_settlements_json(db, match_status, currency)
    return PlainTextResponse(content=data, media_type="application/json; charset=utf-8")


@router.get("/csv")
def export_csv(
    match_status: Optional[str] = Query(None),
    currency: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    data = export_settlements_csv(db, match_status, currency)
    return PlainTextResponse(content=data, media_type="text/csv; charset=utf-8")
