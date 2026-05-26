from datetime import date, datetime
from decimal import Decimal
from dateutil.relativedelta import relativedelta
from typing import List

from sqlalchemy.orm import Session

from app.models.models import (
    Enterprise, CreditTransaction, EnergyReading, Invoice,
    Receipt, ClearingTable, Anomaly, Reconciliation
)


def detect_duplicate_credits(db: Session, reconciliation_id: int,
                             period: str) -> List[Anomaly]:
    year, month = period.split("-")
    y, m = int(year), int(month)
    period_start = date(y, m, 1)
    period_end = period_start + relativedelta(months=1)

    credits = (
        db.query(CreditTransaction)
        .filter(
            CreditTransaction.transaction_date >= period_start,
            CreditTransaction.transaction_date < period_end,
            CreditTransaction.is_duplicate == False,
        )
        .all()
    )

    seen = {}
    anomalies = []

    for credit in credits:
        key = (credit.enterprise_id, credit.transaction_no, str(credit.amount),
               credit.direction, str(credit.transaction_date))
        if key in seen:
            credit.is_duplicate = True
            credit.duplicate_of = seen[key].id
            credit.duplicate_note = f"与流水ID={seen[key].id}重复"

            anomaly = Anomaly(
                reconciliation_id=reconciliation_id,
                enterprise_id=credit.enterprise_id,
                anomaly_type="DUPLICATE_CREDIT",
                severity="critical",
                description=f"积分流水重复：流水号{credit.transaction_no}，金额{credit.amount}，日期{credit.transaction_date}",
                target_table="credit_transactions",
                target_id=credit.id,
                status="open",
            )
            anomalies.append(anomaly)
        else:
            seen[key] = credit

    db.add_all(anomalies)
    db.commit()
    return anomalies


def detect_cross_month_anomalies(db: Session, reconciliation_id: int,
                                 period: str) -> List[Anomaly]:
    year, month = period.split("-")
    y, m = int(year), int(month)
    period_start = date(y, m, 1)
    period_end = period_start + relativedelta(months=1)

    readings = (
        db.query(EnergyReading)
        .filter(
            EnergyReading.reading_date >= period_start,
            EnergyReading.reading_date < period_end,
            EnergyReading.is_cross_month == True,
            EnergyReading.is_adjusted == False,
        )
        .all()
    )

    anomalies = []
    for r in readings:
        anomaly = Anomaly(
            reconciliation_id=reconciliation_id,
            enterprise_id=r.enterprise_id,
            anomaly_type="CROSS_MONTH_READING",
            severity="warning",
            description=f"跨月读数未调整：日期{r.reading_date}，类型{r.energy_type}，值{r.value}，备注：{r.cross_month_note}",
            target_table="energy_readings",
            target_id=r.id,
            status="open",
        )
        anomalies.append(anomaly)

    db.add_all(anomalies)
    db.commit()
    return anomalies


def detect_red_flush_anomalies(db: Session, reconciliation_id: int,
                               period: str) -> List[Anomaly]:
    year, month = period.split("-")
    y, m = int(year), int(month)
    period_start = date(y, m, 1)
    period_end = period_start + relativedelta(months=1)

    rf_invoices = (
        db.query(Invoice)
        .filter(
            Invoice.issue_date >= period_start,
            Invoice.issue_date < period_end,
            Invoice.is_red_flush == True,
            Invoice.red_flush_applied == False,
        )
        .all()
    )

    anomalies = []
    for rf in rf_invoices:
        original = (
            db.query(Invoice)
            .filter(
                Invoice.enterprise_id == rf.enterprise_id,
                Invoice.invoice_no == rf.original_invoice_no,
            )
            .first()
        )
        has_original = original is not None

        anomaly = Anomaly(
            reconciliation_id=reconciliation_id,
            enterprise_id=rf.enterprise_id,
            anomaly_type="RED_FLUSH_NOT_ROLLED_BACK",
            severity="critical",
            description=f"红冲未回滚：发票{rf.invoice_no}（金额{rf.amount}），"
                        f"原票{rf.original_invoice_no or '未知'}{'已找到' if has_original else '未找到'}，"
                        f"余额未自动回滚",
            target_table="invoices",
            target_id=rf.id,
            status="open",
        )
        anomalies.append(anomaly)

    db.add_all(anomalies)
    db.commit()
    return anomalies


def detect_receipt_anomalies(db: Session, reconciliation_id: int,
                             period: str) -> List[Anomaly]:
    year, month = period.split("-")
    y, m = int(year), int(month)
    period_start = date(y, m, 1)
    period_end = period_start + relativedelta(months=1)

    unverified = (
        db.query(Receipt)
        .filter(
            Receipt.receipt_date >= period_start,
            Receipt.receipt_date < period_end,
            Receipt.is_verified == False,
        )
        .all()
    )

    anomalies = []
    for r in unverified:
        note = r.verification_note or "未核验"
        severity = "warning"
        if "未找到匹配" in note:
            severity = "critical"
        anomaly = Anomaly(
            reconciliation_id=reconciliation_id,
            enterprise_id=r.enterprise_id,
            anomaly_type="RECEIPT_UNVERIFIED",
            severity=severity,
            description=f"回执未核验：回执号{r.receipt_no}，金额{r.amount}，日期{r.receipt_date}，{note}",
            target_table="receipts",
            target_id=r.id,
            status="open",
        )
        anomalies.append(anomaly)

    db.add_all(anomalies)
    db.commit()
    return anomalies


def detect_balance_mismatch(db: Session, reconciliation_id: int,
                            period: str, items: list) -> List[Anomaly]:
    anomalies = []
    for item in items:
        if abs(item.balance_diff) > Decimal("0.0001"):
            anomaly = Anomaly(
                reconciliation_id=reconciliation_id,
                enterprise_id=item.enterprise_id,
                anomaly_type="BALANCE_MISMATCH",
                severity="warning",
                description=f"余额差异：计算值{item.calculated_closing}，申报值{item.reported_closing}，差额{item.balance_diff}",
                target_table="reconciliation_items",
                target_id=item.id,
                status="open",
            )
            anomalies.append(anomaly)

    db.add_all(anomalies)
    db.commit()
    return anomalies


def resolve_anomaly(db: Session, anomaly_id: int, status: str = "resolved",
                    resolution_note: str = "", operator: str = "system") -> Anomaly:
    anomaly = db.query(Anomaly).filter(Anomaly.id == anomaly_id).first()
    if not anomaly:
        return None
    anomaly.status = status
    anomaly.resolution_note = resolution_note
    anomaly.resolved_at = datetime.now()
    db.commit()
    return anomaly