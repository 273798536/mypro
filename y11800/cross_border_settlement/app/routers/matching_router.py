from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.matching_service import run_matching

router = APIRouter(prefix="/matching", tags=["到账匹配"])


@router.post("/run")
def run_matching_endpoint(
    order_id: Optional[int] = Query(None, description="指定订单 ID，不传则匹配所有待处理订单"),
    db: Session = Depends(get_db),
):
    results = run_matching(db, order_id)
    return {
        "matched_count": len(results),
        "results": results,
    }


@router.post("/run/{order_id}")
def run_matching_for_order_endpoint(order_id: int, db: Session = Depends(get_db)):
    results = run_matching(db, order_id)
    if not results:
        return {"matched_count": 0, "results": [], "message": "该订单无需匹配或不存在"}
    return {
        "matched_count": len(results),
        "results": results,
    }
