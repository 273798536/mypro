from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.schemas import (
    ReconciliationOut, ReconciliationRunRequest, AnomalyOut,
    AnomalyResolveRequest, AnomalyResolveResponse
)
from app.services.reconciliation_service import (
    run_reconciliation, get_reconciliation,
    list_reconciliations, get_reconciliation_summary
)
from app.services.balance_service import recalculate_balance, get_enterprise_balance
from app.services.cross_month_service import (
    detect_cross_month_readings, adjust_reading_period,
    aggregate_cross_month_readings
)
from app.services.red_flush_service import (
    detect_red_flush_invoices, apply_red_flush_compensation,
    batch_apply_red_flush, get_red_flush_summary
)
from app.services.receipt_verification import verify_receipts, find_missing_receipts
from app.services.anomaly_service import resolve_anomaly

router = APIRouter()


@router.post("/run", response_model=ReconciliationOut)
def run_reconcile(req: ReconciliationRunRequest, db: Session = Depends(get_db)):
    rec = run_reconciliation(
        db, req.period, req.operator,
        auto_apply_red_flush=req.auto_apply_red_flush,
        remark=req.remark,
    )
    return rec


@router.get("/list", response_model=List[ReconciliationOut])
def list_reconcile(period: Optional[str] = None, status: Optional[str] = None,
                   skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    recs = list_reconciliations(db, period, status)
    return recs[skip:skip + limit]


@router.get("/{reconciliation_id}", response_model=ReconciliationOut)
def get_reconcile(reconciliation_id: int, db: Session = Depends(get_db)):
    rec = get_reconciliation(db, reconciliation_id)
    if not rec:
        raise HTTPException(status_code=404, detail="对账记录不存在")
    return rec


@router.get("/{reconciliation_id}/summary")
def get_summary(reconciliation_id: int, db: Session = Depends(get_db)):
    return get_reconciliation_summary(db, reconciliation_id)


@router.post("/balance/recalculate/{enterprise_id}")
def post_recalculate_balance(enterprise_id: int, period: Optional[str] = None,
                             db: Session = Depends(get_db)):
    result = recalculate_balance(db, enterprise_id, period)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.get("/balance/{enterprise_id}")
def get_balance(enterprise_id: int, db: Session = Depends(get_db)):
    result = get_enterprise_balance(db, enterprise_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.post("/cross-month/detect")
def detect_cross_month(period: Optional[str] = None, db: Session = Depends(get_db)):
    results = detect_cross_month_readings(db, period)
    return {"count": len(results), "items": results}


@router.post("/cross-month/adjust/{reading_id}")
def adjust_cross_month(reading_id: int, new_date: date, operator: Optional[str] = None,
                       db: Session = Depends(get_db)):
    result = adjust_reading_period(db, reading_id, new_date, operator or "system")
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.post("/cross-month/aggregate/{enterprise_id}")
def aggregate_cross_month(enterprise_id: int, energy_type: str, period: str,
                          db: Session = Depends(get_db)):
    return aggregate_cross_month_readings(db, enterprise_id, energy_type, period)


@router.post("/red-flush/detect")
def detect_red_flush(period: Optional[str] = None, db: Session = Depends(get_db)):
    results = detect_red_flush_invoices(db, period)
    return {"count": len(results), "items": results}


@router.post("/red-flush/apply/{invoice_id}")
def apply_red_flush(invoice_id: int, operator: Optional[str] = None,
                    db: Session = Depends(get_db)):
    result = apply_red_flush_compensation(db, invoice_id, operator or "system")
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/red-flush/batch-apply")
def batch_apply_red_flush_route(period: Optional[str] = None,
                                operator: Optional[str] = None,
                                db: Session = Depends(get_db)):
    return batch_apply_red_flush(db, period, operator or "system")


@router.get("/red-flush/summary/{enterprise_id}")
def red_flush_summary(enterprise_id: int, db: Session = Depends(get_db)):
    return get_red_flush_summary(db, enterprise_id)


@router.post("/receipts/verify")
def verify_receipts_route(period: Optional[str] = None, db: Session = Depends(get_db)):
    results = verify_receipts(db, period)
    return {"count": len(results), "items": results}


@router.get("/receipts/missing")
def missing_receipts(period: str, db: Session = Depends(get_db)):
    results = find_missing_receipts(db, period)
    return {"count": len(results), "items": results}


@router.patch("/anomalies/{anomaly_id}", response_model=AnomalyResolveResponse)
def resolve_anomaly_route(anomaly_id: int, req: AnomalyResolveRequest,
                          db: Session = Depends(get_db)):
    anomaly = resolve_anomaly(db, anomaly_id, req.status, req.resolution_note)
    if not anomaly:
        raise HTTPException(status_code=404, detail="异常记录不存在")
    return AnomalyResolveResponse(
        id=anomaly.id, status=anomaly.status,
        resolution_note=anomaly.resolution_note or "",
    )


@router.get("/anomalies/{reconciliation_id}", response_model=List[AnomalyOut])
def list_anomalies(reconciliation_id: int, status: Optional[str] = None,
                   db: Session = Depends(get_db)):
    from app.models.models import Anomaly
    query = db.query(Anomaly).filter(Anomaly.reconciliation_id == reconciliation_id)
    if status:
        query = query.filter(Anomaly.status == status)
    return query.all()