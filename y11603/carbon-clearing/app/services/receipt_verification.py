from datetime import date
from dateutil.relativedelta import relativedelta
from decimal import Decimal
from typing import List

from sqlalchemy.orm import Session

from app.models.models import Receipt, CreditTransaction, Enterprise


def verify_receipts(db: Session, period: str = None) -> List[dict]:
    query = db.query(Receipt).filter(Receipt.is_verified == False)
    if period:
        year, month = period.split("-")
        y, m = int(year), int(month)
        period_start = date(y, m, 1)
        period_end = period_start + relativedelta(months=1)
        query = query.filter(
            Receipt.receipt_date >= period_start,
            Receipt.receipt_date < period_end,
        )

    receipts = query.all()
    results = []

    for receipt in receipts:
        ent = db.query(Enterprise).filter(Enterprise.id == receipt.enterprise_id).first()

        matching_credits = (
            db.query(CreditTransaction)
            .filter(
                CreditTransaction.enterprise_id == receipt.enterprise_id,
                CreditTransaction.is_duplicate == False,
            )
            .all()
        )

        exact_match = None
        close_match = None

        for credit in matching_credits:
            if credit.amount == receipt.amount and credit.transaction_date == receipt.receipt_date:
                exact_match = credit
                break

        if not exact_match:
            for credit in matching_credits:
                if credit.amount == receipt.amount:
                    diff = abs((credit.transaction_date - receipt.receipt_date).days)
                    if diff <= 7:
                        close_match = credit
                        break

        if exact_match:
            receipt.is_verified = True
            receipt.verified_by = "system"
            from datetime import datetime
            receipt.verified_at = datetime.now()
            receipt.matched_credit_id = exact_match.id
            receipt.verification_note = f"精确匹配流水{exact_match.transaction_no}"
            results.append({
                "receipt_id": receipt.id,
                "enterprise_code": ent.enterprise_code if ent else None,
                "receipt_no": receipt.receipt_no,
                "amount": str(receipt.amount),
                "receipt_date": str(receipt.receipt_date),
                "status": "verified",
                "match_type": "exact",
                "matched_credit_no": exact_match.transaction_no,
            })
        elif close_match:
            receipt.verification_note = (
                f"金额匹配但日期差{abs((close_match.transaction_date - receipt.receipt_date).days)}天，"
                f"流水{close_match.transaction_no}"
            )
            results.append({
                "receipt_id": receipt.id,
                "enterprise_code": ent.enterprise_code if ent else None,
                "receipt_no": receipt.receipt_no,
                "amount": str(receipt.amount),
                "receipt_date": str(receipt.receipt_date),
                "status": "partial_match",
                "match_type": "amount_only",
                "matched_credit_no": close_match.transaction_no,
                "date_diff_days": abs((close_match.transaction_date - receipt.receipt_date).days),
            })
        else:
            matching_by_amount = [
                c for c in matching_credits
                if c.amount == receipt.amount and c.transaction_date != receipt.receipt_date
            ]
            if matching_by_amount:
                receipt.verification_note = f"金额匹配但日期差异超过7天，候选流水{len(matching_by_amount)}条"
            else:
                receipt.verification_note = "未找到匹配流水"
            results.append({
                "receipt_id": receipt.id,
                "enterprise_code": ent.enterprise_code if ent else None,
                "receipt_no": receipt.receipt_no,
                "amount": str(receipt.amount),
                "receipt_date": str(receipt.receipt_date),
                "status": "unmatched",
                "match_type": "none",
                "candidate_count": len(matching_by_amount),
            })

    db.commit()
    return results


def find_missing_receipts(db: Session, period: str) -> List[dict]:
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

    results = []
    for credit in credits:
        receipt = (
            db.query(Receipt)
            .filter(
                Receipt.enterprise_id == credit.enterprise_id,
                Receipt.matched_credit_id == credit.id,
            )
            .first()
        )
        if not receipt:
            alt_receipts = (
                db.query(Receipt)
                .filter(
                    Receipt.enterprise_id == credit.enterprise_id,
                    Receipt.amount == credit.amount,
                    Receipt.receipt_date >= period_start,
                    Receipt.receipt_date < period_end,
                )
                .all()
            )
            ent = db.query(Enterprise).filter(Enterprise.id == credit.enterprise_id).first()
            results.append({
                "credit_id": credit.id,
                "enterprise_code": ent.enterprise_code if ent else None,
                "transaction_no": credit.transaction_no,
                "amount": str(credit.amount),
                "transaction_date": str(credit.transaction_date),
                "has_any_receipt": len(alt_receipts) > 0,
                "alt_receipt_count": len(alt_receipts),
            })

    return results