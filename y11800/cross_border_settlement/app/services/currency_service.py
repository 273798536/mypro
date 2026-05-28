from __future__ import annotations
from datetime import date
from typing import Optional
from sqlalchemy.orm import Session
from app.models import Settlement, SettlementLog, BankSlip


REFERENCE_RATES = {
    ("USD", "CNY"): 7.24,
    ("EUR", "CNY"): 7.85,
    ("GBP", "CNY"): 9.18,
    ("JPY", "CNY"): 0.048,
    ("HKD", "CNY"): 0.93,
    ("CNY", "USD"): 1 / 7.24,
    ("CNY", "EUR"): 1 / 7.85,
    ("CNY", "GBP"): 1 / 9.18,
    ("CNY", "JPY"): 1 / 0.048,
    ("CNY", "HKD"): 1 / 0.93,
}


def apply_currency_conversion(
    db: Session,
    settlement_id: int,
    exchange_rate: Optional[float] = None,
    rate_date: Optional[date] = None,
    operator: str = "system",
) -> dict:
    settlement = db.query(Settlement).filter(Settlement.id == settlement_id).first()
    if not settlement:
        return {"error": f"结算记录 {settlement_id} 不存在"}

    order = settlement.order
    slips = settlement.slips

    target_currency = "CNY"

    if not exchange_rate:
        key = (order.currency, target_currency)
        exchange_rate = REFERENCE_RATES.get(key)
        if not exchange_rate:
            return {
                "error": f"无参考汇率 {order.currency}->{target_currency}，请手动提供 exchange_rate",
                "action": "调用状态推进接口时传入 exchange_rate 参数",
            }

    original_amount = settlement.original_amount
    converted_amount = round(original_amount * exchange_rate, 2)

    total_slip_amount = sum(s.amount or 0 for s in slips)

    rate_date_mismatch = False
    if rate_date:
        for slip in slips:
            if slip.slip_date and rate_date != slip.slip_date:
                rate_date_mismatch = True
                break
    settlement.rate_date_mismatch = rate_date_mismatch

    old_status = settlement.match_status
    settlement.exchange_rate = exchange_rate
    settlement.rate_date = rate_date or date.today()
    settlement.settled_amount = converted_amount
    settlement.match_status = "converted"

    db.add(SettlementLog(
        settlement_id=settlement.id,
        action="currency_conversion",
        from_status=old_status,
        to_status="converted",
        operator=operator,
        notes=f"币种换算：{original_amount} {order.currency} × {exchange_rate} = {converted_amount} {target_currency}"
              + (f"（汇率日期 {rate_date} 与水单到账日不一致，已标记）" if rate_date_mismatch else ""),
    ))

    if rate_date_mismatch:
        settlement.notes = (settlement.notes or "") + (
            f"\n⚠ 汇率日期 {rate_date} 与水单到账日不一致，请确认是否应使用到账日汇率重新计算"
        )

    db.commit()

    return {
        "settlement_id": settlement.id,
        "order_no": order.order_no,
        "original_amount": original_amount,
        "original_currency": order.currency,
        "exchange_rate": exchange_rate,
        "converted_amount": converted_amount,
        "target_currency": target_currency,
        "rate_date": str(rate_date or date.today()),
        "rate_date_mismatch": rate_date_mismatch,
        "rate_date_mismatch_action": (
            "请确认应使用到账日汇率还是当前指定日期汇率，重新推进状态时传入正确的 rate_date"
            if rate_date_mismatch else None
        ),
        "total_slip_amount": total_slip_amount,
    }
