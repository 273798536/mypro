from decimal import Decimal
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.models import Invoice, CreditTransaction, CorrectionLog, Enterprise


def _log_correction(db: Session, enterprise_id: int, target_table: str,
                    target_id: int, field_name: str, old_value: str,
                    new_value: str, reason: str, operator: str = "system"):
    log = CorrectionLog(
        enterprise_id=enterprise_id,
        target_table=target_table,
        target_id=target_id,
        field_name=field_name,
        old_value=old_value,
        new_value=new_value,
        reason=reason,
        operator=operator,
    )
    db.add(log)


def detect_red_flush_invoices(db: Session, period: str = None) -> List[dict]:
    query = (
        db.query(Invoice)
        .filter(Invoice.is_red_flush == True, Invoice.red_flush_applied == False)
    )

    if period:
        from datetime import date
        from dateutil.relativedelta import relativedelta
        year, month = period.split("-")
        y, m = int(year), int(month)
        period_start = date(y, m, 1)
        period_end = period_start + relativedelta(months=1)
        query = query.filter(
            Invoice.issue_date >= period_start,
            Invoice.issue_date < period_end,
        )

    rf_invoices = query.all()
    results = []

    for rf in rf_invoices:
        ent = db.query(Enterprise).filter(Enterprise.id == rf.enterprise_id).first()
        original = None
        if rf.original_invoice_no:
            original = (
                db.query(Invoice)
                .filter(
                    Invoice.enterprise_id == rf.enterprise_id,
                    Invoice.invoice_no == rf.original_invoice_no,
                )
                .first()
            )

        credit_impact = Decimal("0")
        if original:
            matching_credit = (
                db.query(CreditTransaction)
                .filter(
                    CreditTransaction.enterprise_id == rf.enterprise_id,
                    CreditTransaction.amount == abs(original.amount),
                )
                .first()
            )
            if matching_credit:
                credit_impact = matching_credit.amount * (-1 if matching_credit.direction == "in" else 1)

        results.append({
            "invoice_id": rf.id,
            "enterprise_code": ent.enterprise_code if ent else None,
            "invoice_no": rf.invoice_no,
            "amount": str(rf.amount),
            "original_invoice_no": rf.original_invoice_no,
            "original_found": original is not None,
            "original_amount": str(original.amount) if original else None,
            "credit_impact": str(credit_impact),
            "issue": "red_flush_unapplied",
        })

    return results


def apply_red_flush_compensation(db: Session, invoice_id: int,
                                 operator: str = "system") -> dict:
    rf = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not rf or not rf.is_red_flush:
        return {"error": "not a red-flush invoice"}
    if rf.red_flush_applied:
        return {"error": "already applied"}

    original = None
    if rf.original_invoice_no:
        original = (
            db.query(Invoice)
            .filter(
                Invoice.enterprise_id == rf.enterprise_id,
                Invoice.invoice_no == rf.original_invoice_no,
            )
            .first()
        )

    adjustment_amount = rf.amount

    if original:
        matching_credits = (
            db.query(CreditTransaction)
            .filter(
                CreditTransaction.enterprise_id == rf.enterprise_id,
                CreditTransaction.is_duplicate == False,
            )
            .all()
        )
        for credit in matching_credits:
            if abs(credit.amount) == abs(original.amount) and credit.direction == "in":
                credit.is_adjusted = True
                credit.original_transaction_id = credit.id
                _log_correction(
                    db, rf.enterprise_id, "credit_transactions", credit.id,
                    "is_duplicate", "false", "adjusted",
                    f"红冲补偿：发票{rf.invoice_no}冲销原票{original.invoice_no}",
                    operator,
                )
                break
        rf.original_invoice_id = original.id

    rf.red_flush_applied = True
    rf.red_flush_note = f"红冲补偿已执行，补偿金额{adjustment_amount}，操作人{operator}"

    _log_correction(
        db, rf.enterprise_id, "invoices", rf.id,
        "red_flush_applied", "false", "true",
        f"红冲补偿：金额{adjustment_amount}", operator,
    )

    db.commit()

    return {
        "invoice_id": rf.id,
        "invoice_no": rf.invoice_no,
        "adjustment_amount": str(adjustment_amount),
        "original_found": original is not None,
        "status": "applied",
    }


def batch_apply_red_flush(db: Session, period: str = None,
                          operator: str = "system") -> dict:
    results = detect_red_flush_invoices(db, period)
    applied = []
    for item in results:
        res = apply_red_flush_compensation(db, item["invoice_id"], operator)
        applied.append(res)

    return {
        "period": period,
        "total_detected": len(results),
        "total_applied": len([a for a in applied if a.get("status") == "applied"]),
        "details": applied,
    }


def get_red_flush_summary(db: Session, enterprise_id: int) -> dict:
    rf_total = (
        db.query(Invoice)
        .filter(Invoice.enterprise_id == enterprise_id, Invoice.is_red_flush == True)
        .all()
    )
    applied = [r for r in rf_total if r.red_flush_applied]
    unapplied = [r for r in rf_total if not r.red_flush_applied]

    return {
        "enterprise_id": enterprise_id,
        "total_red_flush": len(rf_total),
        "applied_count": len(applied),
        "unapplied_count": len(unapplied),
        "applied_amount": sum((r.amount for r in applied), Decimal("0")),
        "unapplied_amount": sum((r.amount for r in unapplied), Decimal("0")),
    }