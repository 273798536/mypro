from datetime import datetime, date
from decimal import Decimal
from dateutil.relativedelta import relativedelta
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.models import (
    Enterprise, CreditTransaction, Invoice, Receipt,
    ClearingTable, Reconciliation, ReconciliationItem, Anomaly
)
from app.services.balance_service import recalculate_balance
from app.services.cross_month_service import detect_cross_month_readings
from app.services.red_flush_service import detect_red_flush_invoices, apply_red_flush_compensation
from app.services.receipt_verification import verify_receipts
from app.services.anomaly_service import (
    detect_duplicate_credits, detect_cross_month_anomalies,
    detect_red_flush_anomalies, detect_receipt_anomalies, detect_balance_mismatch
)


def run_reconciliation(db: Session, period: str, operator: str = None,
                       auto_apply_red_flush: bool = True,
                       remark: str = None) -> Reconciliation:
    rec = Reconciliation(
        period=period,
        status="running",
        started_at=datetime.now(),
        operator=operator,
        remark=remark,
    )
    db.add(rec)
    db.flush()

    if auto_apply_red_flush:
        rf_results = detect_red_flush_invoices(db, period)
        for item in rf_results:
            apply_red_flush_compensation(db, item["invoice_id"], operator or "system")

    detect_cross_month_readings(db, period)
    verify_receipts(db, period)

    enterprises = db.query(Enterprise).filter(Enterprise.status == "active").all()
    items = []

    for ent in enterprises:
        _process_enterprise(db, rec.id, ent.id, period, items)

    rec.total_enterprises = len(enterprises)
    db.flush()

    detect_duplicate_credits(db, rec.id, period)
    detect_cross_month_anomalies(db, rec.id, period)
    detect_red_flush_anomalies(db, rec.id, period)
    detect_receipt_anomalies(db, rec.id, period)

    db.flush()
    detect_balance_mismatch(db, rec.id, period, items)

    anomalies = (
        db.query(Anomaly)
        .filter(Anomaly.reconciliation_id == rec.id, Anomaly.status == "open")
        .all()
    )
    rec.anomalies_found = len(anomalies)
    rec.status = "completed"
    rec.completed_at = datetime.now()
    db.commit()
    db.refresh(rec)
    return rec


def _process_enterprise(db: Session, reconciliation_id: int,
                        enterprise_id: int, period: str,
                        items: list) -> ReconciliationItem:
    year, month = period.split("-")
    y, m = int(year), int(month)
    period_start = date(y, m, 1)
    period_end = period_start + relativedelta(months=1)

    balance_result = recalculate_balance(db, enterprise_id, period, include_red_flush=True)

    ct = (
        db.query(ClearingTable)
        .filter(ClearingTable.enterprise_id == enterprise_id, ClearingTable.period == period)
        .first()
    )
    reported_closing = ct.closing_balance if ct else Decimal("0")
    balance_diff = balance_result["calculated_closing"] - reported_closing

    from app.models.models import EnergyReading
    cross_month_readings = (
        db.query(EnergyReading)
        .filter(
            EnergyReading.enterprise_id == enterprise_id,
            EnergyReading.is_cross_month == True,
        )
        .count()
    )

    duplicate_credits = (
        db.query(CreditTransaction)
        .filter(
            CreditTransaction.enterprise_id == enterprise_id,
            CreditTransaction.is_duplicate == True,
        )
        .count()
    )

    red_flush_unapplied = (
        db.query(Invoice)
        .filter(
            Invoice.enterprise_id == enterprise_id,
            Invoice.is_red_flush == True,
            Invoice.red_flush_applied == False,
        )
        .count()
    )

    receipts_unverified = (
        db.query(Receipt)
        .filter(
            Receipt.enterprise_id == enterprise_id,
            Receipt.is_verified == False,
        )
        .count()
    )

    has_anomaly = (
        cross_month_readings > 0 or duplicate_credits > 0
        or red_flush_unapplied > 0 or receipts_unverified > 0
        or abs(balance_diff) > Decimal("0.0001")
    )

    item = ReconciliationItem(
        reconciliation_id=reconciliation_id,
        enterprise_id=enterprise_id,
        opening_balance=balance_result["opening_balance"],
        period_in=balance_result["total_in"],
        period_out=balance_result["total_out"],
        red_flush_adjustment=balance_result["red_flush_adjustment"],
        calculated_closing=balance_result["calculated_closing"],
        reported_closing=reported_closing,
        balance_diff=balance_diff,
        cross_month_readings=cross_month_readings,
        duplicate_credits=duplicate_credits,
        red_flush_unapplied=red_flush_unapplied,
        receipts_unverified=receipts_unverified,
        has_anomaly=has_anomaly,
    )
    db.add(item)
    db.flush()
    items.append(item)
    return item


def get_reconciliation(db: Session, reconciliation_id: int) -> Optional[Reconciliation]:
    return (
        db.query(Reconciliation)
        .filter(Reconciliation.id == reconciliation_id)
        .first()
    )


def list_reconciliations(db: Session, period: str = None,
                         status: str = None) -> List[Reconciliation]:
    query = db.query(Reconciliation)
    if period:
        query = query.filter(Reconciliation.period == period)
    if status:
        query = query.filter(Reconciliation.status == status)
    return query.order_by(Reconciliation.created_at.desc()).all()


def get_reconciliation_summary(db: Session, reconciliation_id: int) -> dict:
    rec = get_reconciliation(db, reconciliation_id)
    if not rec:
        return {"error": "not found"}

    items = rec.items
    anomalies = rec.anomalies

    total_diff = sum((abs(item.balance_diff) for item in items), Decimal("0"))
    anomaly_enterprises = sum(1 for item in items if item.has_anomaly)

    return {
        "reconciliation_id": rec.id,
        "period": rec.period,
        "status": rec.status,
        "total_enterprises": rec.total_enterprises,
        "anomaly_enterprises": anomaly_enterprises,
        "clean_enterprises": rec.total_enterprises - anomaly_enterprises,
        "anomalies_found": rec.anomalies_found,
        "total_balance_diff": total_diff,
        "started_at": str(rec.started_at) if rec.started_at else None,
        "completed_at": str(rec.completed_at) if rec.completed_at else None,
    }