from __future__ import annotations
from datetime import date
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models import (
    ClientOrder, BankSlip, PlatformBill,
    Settlement, SettlementSlip, SettlementBill, SettlementLog,
)


FEE_TOLERANCE_RATE = 0.05
FEE_ABSOLUTE_TOLERANCE = 50.0


def _check_fee_deducted(order: ClientOrder, slip: BankSlip) -> Optional[dict]:
    if slip.amount is None or slip.currency is None:
        return None
    if slip.fee_deducted:
        return {
            "detected": True,
            "type": "fee_deducted",
            "message": (
                f"水单 '{slip.slip_no}' 标记为手续费内扣，"
                f"到账 {slip.currency} {slip.amount:.2f}，"
                f"订单金额 {order.currency} {order.amount:.2f}"
            ),
            "action": "需确认手续费金额，在状态推进时填写 fee_handling='deducted' 和 fee_amount",
        }
    if slip.currency == order.currency and slip.amount < order.amount:
        diff = order.amount - slip.amount
        rate = diff / order.amount
        if rate <= FEE_TOLERANCE_RATE or diff <= FEE_ABSOLUTE_TOLERANCE:
            return {
                "detected": True,
                "type": "fee_deducted_suspected",
                "message": (
                    f"水单 '{slip.slip_no}' 到账金额 ({slip.currency} {slip.amount:.2f}) "
                    f"小于订单金额 ({order.currency} {order.amount:.2f})，"
                    f"差额 {diff:.2f}，疑似手续费内扣"
                ),
                "action": "请确认是否为手续费内扣；如是，在状态推进时填写 fee_handling='deducted' 和 fee_amount",
            }
    return None


def _check_rate_date_mismatch(slip: BankSlip, rate_date: Optional[date]) -> Optional[dict]:
    if rate_date is None or slip.slip_date is None:
        return None
    if rate_date != slip.slip_date:
        return {
            "detected": True,
            "type": "rate_date_mismatch",
            "message": (
                f"汇率日期 {rate_date} 与水单到账日期 {slip.slip_date} 不一致，"
                f"可能导致换算金额偏差"
            ),
            "action": "请确认应使用哪一天的汇率：到账日（水单日期）还是入账日（汇率日期），在状态推进时指定正确的 rate_date",
        }
    return None


def _find_matching_slips(db: Session, order: ClientOrder) -> List[BankSlip]:
    slips = db.query(BankSlip).filter(
        BankSlip.order_no == order.order_no,
        BankSlip.status.in_(["pending", "pending_confirm"]),
    ).all()
    if not slips:
        slips = db.query(BankSlip).filter(
            BankSlip.order_no.is_(None),
            BankSlip.currency == order.currency,
            BankSlip.status.in_(["pending", "pending_confirm"]),
        ).all()
    return slips


def _find_matching_bills(db: Session, order: ClientOrder) -> List[PlatformBill]:
    bills = db.query(PlatformBill).filter(
        PlatformBill.order_no == order.order_no,
        PlatformBill.status.in_(["pending"]),
    ).all()
    if not bills:
        bills = db.query(PlatformBill).filter(
            PlatformBill.order_no.is_(None),
            PlatformBill.currency == order.currency,
            PlatformBill.status.in_(["pending"]),
        ).all()
    return bills


def run_matching(db: Session, order_id: Optional[int] = None) -> List[dict]:
    results = []
    query = db.query(ClientOrder).filter(ClientOrder.status == "pending")
    if order_id:
        query = query.filter(ClientOrder.id == order_id)
    orders = query.all()

    for order in orders:
        slips = _find_matching_slips(db, order)
        bills = _find_matching_bills(db, order)

        if not slips:
            results.append({
                "order_no": order.order_no,
                "match_status": "no_slip",
                "message": f"订单 '{order.order_no}' 暂无匹配水单，等待到账",
            })
            continue

        has_split = any(s.is_split or s.split_group_id for s in slips)
        fee_info = None
        for slip in slips:
            info = _check_fee_deducted(order, slip)
            if info:
                fee_info = info
                break

        total_slip_amount = sum(s.amount or 0 for s in slips)

        match_status = "matched"
        notes_parts = []

        if has_split:
            match_status = "pending_confirm"
            notes_parts.append("水单为拆分到账，需确认拆分组合是否完整对应本订单")

        if fee_info:
            if fee_info["type"] == "fee_deducted":
                match_status = "pending_confirm" if match_status == "matched" else match_status
                notes_parts.append(fee_info["message"] + " —— " + fee_info["action"])
            elif fee_info["type"] == "fee_deducted_suspected":
                notes_parts.append(fee_info["message"] + " —— " + fee_info["action"])

        if total_slip_amount < order.amount and not fee_info:
            match_status = "partial"
            notes_parts.append(
                f"水单合计 {total_slip_amount:.2f} < 订单金额 {order.amount:.2f}，到账不足"
            )

        if total_slip_amount > order.amount * 1.01:
            notes_parts.append(
                f"水单合计 {total_slip_amount:.2f} > 订单金额 {order.amount:.2f}，到账溢出"
            )

        if order.currency not in ["CNY", "RMB"] and order.currency != "USD":
            if slips and any(s.currency and s.currency != order.currency for s in slips):
                notes_parts.append(
                    f"存在币种不一致：订单 {order.currency}，水单含其他币种，需进行币种换算"
                )

        rate_mismatch = None
        for slip in slips:
            if slip.slip_date and order.currency not in ["CNY", "RMB"]:
                rate_mismatch = _check_rate_date_mismatch(slip, slip.slip_date)
                break

        if rate_mismatch:
            notes_parts.append(rate_mismatch["message"] + " —— " + rate_mismatch["action"])

        settlement = Settlement(
            order_id=order.id,
            match_status=match_status,
            original_amount=order.amount,
            settled_amount=total_slip_amount if match_status == "matched" else None,
            currency=order.currency,
            fee_handling=fee_info["type"] if fee_info else None,
            fee_amount=None,
            rate_date_mismatch=bool(rate_mismatch),
            notes="\n".join(notes_parts) if notes_parts else None,
        )
        db.add(settlement)
        db.flush()

        for slip in slips:
            db.add(SettlementSlip(settlement_id=settlement.id, slip_id=slip.id))
            slip.status = "matched" if match_status == "matched" else "in_settlement"

        for bill in bills:
            db.add(SettlementBill(settlement_id=settlement.id, bill_id=bill.id))
            bill.status = "matched" if match_status == "matched" else "in_settlement"

        db.add(SettlementLog(
            settlement_id=settlement.id,
            action="auto_match",
            from_status=None,
            to_status=match_status,
            operator="system",
            notes=f"自动匹配：{len(slips)} 张水单，{len(bills)} 张平台账单",
        ))

        order.status = match_status

        results.append({
            "order_no": order.order_no,
            "settlement_id": settlement.id,
            "match_status": match_status,
            "slip_count": len(slips),
            "bill_count": len(bills),
            "total_slip_amount": total_slip_amount,
            "fee_deduction": fee_info,
            "rate_date_mismatch": rate_mismatch,
            "notes": notes_parts,
        })

    db.commit()
    return results
