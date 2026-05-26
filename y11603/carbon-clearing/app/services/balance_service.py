from decimal import Decimal
from datetime import date
from typing import Optional

from sqlalchemy.orm import Session

from app.models.models import (
    Enterprise, CreditTransaction, Invoice, ClearingTable, CorrectionLog
)


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


def recalculate_balance(db: Session, enterprise_id: int, period: str = None,
                        include_red_flush: bool = True) -> dict:
    ent = db.query(Enterprise).filter(Enterprise.id == enterprise_id).first()
    if not ent:
        return {"error": "enterprise not found"}

    if period:
        year, month = period.split("-")
        start_date = date(int(year), int(month), 1)
        if int(month) == 12:
            end_date = date(int(year) + 1, 1, 1)
        else:
            end_date = date(int(year), int(month) + 1, 1)

        credits_in = (
            db.query(CreditTransaction)
            .filter(
                CreditTransaction.enterprise_id == enterprise_id,
                CreditTransaction.direction == "in",
                CreditTransaction.is_duplicate == False,
                CreditTransaction.transaction_date >= start_date,
                CreditTransaction.transaction_date < end_date,
            )
            .all()
        )
        credits_out = (
            db.query(CreditTransaction)
            .filter(
                CreditTransaction.enterprise_id == enterprise_id,
                CreditTransaction.direction == "out",
                CreditTransaction.is_duplicate == False,
                CreditTransaction.transaction_date >= start_date,
                CreditTransaction.transaction_date < end_date,
            )
            .all()
        )
    else:
        credits_in = (
            db.query(CreditTransaction)
            .filter(
                CreditTransaction.enterprise_id == enterprise_id,
                CreditTransaction.direction == "in",
                CreditTransaction.is_duplicate == False,
            )
            .all()
        )
        credits_out = (
            db.query(CreditTransaction)
            .filter(
                CreditTransaction.enterprise_id == enterprise_id,
                CreditTransaction.direction == "out",
                CreditTransaction.is_duplicate == False,
            )
            .all()
        )

    total_in = sum((c.amount for c in credits_in), Decimal("0"))
    total_out = sum((c.amount for c in credits_out), Decimal("0"))

    red_flush_adj = Decimal("0")
    if include_red_flush:
        rf_invoices = (
            db.query(Invoice)
            .filter(
                Invoice.enterprise_id == enterprise_id,
                Invoice.is_red_flush == True,
            )
            .all()
        )
        for rf in rf_invoices:
            original = (
                db.query(Invoice)
                .filter(
                    Invoice.enterprise_id == enterprise_id,
                    Invoice.invoice_no == rf.original_invoice_no,
                )
                .first()
            )
            if original:
                adj = rf.amount
                if original.amount != Decimal("0"):
                    pass
                red_flush_adj += adj
            else:
                red_flush_adj += rf.amount

    opening = ent.initial_balance
    if period:
        ct = (
            db.query(ClearingTable)
            .filter(ClearingTable.enterprise_id == enterprise_id, ClearingTable.period == period)
            .first()
        )
        if ct:
            opening = ct.opening_balance
        else:
            prev_month = int(month) - 1
            prev_year = int(year)
            if prev_month <= 0:
                prev_month = 12
                prev_year -= 1
            prev_period = f"{prev_year:04d}-{prev_month:02d}"
            prev_ct = (
                db.query(ClearingTable)
                .filter(ClearingTable.enterprise_id == enterprise_id, ClearingTable.period == prev_period)
                .first()
            )
            if prev_ct:
                opening = prev_ct.closing_balance

    calculated_closing = opening + total_in - total_out + red_flush_adj

    old_balance = str(ent.current_balance)
    ent.current_balance = calculated_closing
    _log_correction(
        db, enterprise_id, "enterprise", enterprise_id,
        "current_balance", old_balance, str(calculated_closing),
        f"余额重算 period={period or 'all'}",
    )
    db.commit()

    return {
        "enterprise_id": enterprise_id,
        "opening_balance": opening,
        "total_in": total_in,
        "total_out": total_out,
        "red_flush_adjustment": red_flush_adj,
        "calculated_closing": calculated_closing,
        "period": period,
    }


def get_enterprise_balance(db: Session, enterprise_id: int) -> dict:
    ent = db.query(Enterprise).filter(Enterprise.id == enterprise_id).first()
    if not ent:
        return {"error": "enterprise not found"}
    return {
        "enterprise_id": ent.id,
        "enterprise_code": ent.enterprise_code,
        "name": ent.name,
        "initial_balance": ent.initial_balance,
        "current_balance": ent.current_balance,
    }