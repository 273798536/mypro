from __future__ import annotations
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Settlement, SettlementLog, ClientOrder, BankSlip, PlatformBill
from app.schemas import SettlementOut, SettlementDetailOut, StatusAdvanceRequest
from app.services.currency_service import apply_currency_conversion

router = APIRouter(prefix="/settlements", tags=["结算管理"])

VALID_TRANSITIONS = {
    "pending": ["matched", "partial", "pending_confirm", "discrepancy"],
    "pending_confirm": ["matched", "discrepancy"],
    "partial": ["matched", "discrepancy"],
    "discrepancy": ["matched", "pending_confirm"],
    "matched": ["converted"],
    "converted": ["settled"],
    "settled": [],
}


@router.get("/", response_model=List[SettlementOut])
def list_settlements(
    match_status: Optional[str] = Query(None),
    currency: Optional[str] = Query(None),
    order_no: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Settlement)
    if match_status:
        query = query.filter(Settlement.match_status == match_status)
    if currency:
        query = query.filter(Settlement.currency == currency)
    if order_no:
        query = query.join(ClientOrder).filter(ClientOrder.order_no == order_no)
    settlements = query.all()

    result = []
    for s in settlements:
        out = SettlementOut.model_validate(s)
        out.slip_nos = [sl.slip_no for sl in s.slips]
        out.bill_nos = [b.bill_no for b in s.bills]
        result.append(out)
    return result


@router.get("/{settlement_id}", response_model=SettlementDetailOut)
def get_settlement(settlement_id: int, db: Session = Depends(get_db)):
    settlement = db.query(Settlement).filter(Settlement.id == settlement_id).first()
    if not settlement:
        raise HTTPException(status_code=404, detail="结算记录不存在")
    out = SettlementDetailOut.model_validate(settlement)
    out.slip_nos = [sl.slip_no for sl in settlement.slips]
    out.bill_nos = [b.bill_no for b in settlement.bills]
    return out


@router.post("/{settlement_id}/advance")
def advance_status(
    settlement_id: int,
    req: StatusAdvanceRequest,
    db: Session = Depends(get_db),
):
    settlement = db.query(Settlement).filter(Settlement.id == settlement_id).first()
    if not settlement:
        raise HTTPException(status_code=404, detail="结算记录不存在")

    current = settlement.match_status
    target = req.to_status

    allowed = VALID_TRANSITIONS.get(current, [])
    if target not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"状态不可从 '{current}' 推进到 '{target}'，允许的目标: {allowed}",
        )

    old_status = current
    settlement.match_status = target

    action_detail = []

    if req.exchange_rate is not None:
        settlement.exchange_rate = req.exchange_rate
        action_detail.append(f"设置汇率 {req.exchange_rate}")

    if req.rate_date is not None:
        settlement.rate_date = req.rate_date
        for slip in settlement.slips:
            if slip.slip_date and req.rate_date != slip.slip_date:
                settlement.rate_date_mismatch = True
                action_detail.append(f"⚠ 汇率日期 {req.rate_date} 与水单到账日 {slip.slip_date} 不一致，已标记")
                break
        action_detail.append(f"设置汇率日期 {req.rate_date}")

    if req.fee_handling is not None:
        settlement.fee_handling = req.fee_handling
        action_detail.append(f"手续费处理方式: {req.fee_handling}")

    if req.fee_amount is not None:
        settlement.fee_amount = req.fee_amount
        action_detail.append(f"手续费金额: {req.fee_amount}")

    if target == "matched" and settlement.exchange_rate and settlement.original_amount:
        settlement.settled_amount = round(
            settlement.original_amount * settlement.exchange_rate, 2
        )

    if target == "converted":
        conv_result = apply_currency_conversion(
            db, settlement_id,
            exchange_rate=req.exchange_rate,
            rate_date=req.rate_date,
            operator=req.operator,
        )
        if "error" in conv_result:
            raise HTTPException(status_code=400, detail=conv_result["error"])
        return conv_result

    if req.notes:
        settlement.notes = (settlement.notes or "") + "\n" + req.notes

    db.add(SettlementLog(
        settlement_id=settlement.id,
        action="status_advance",
        from_status=old_status,
        to_status=target,
        operator=req.operator,
        notes="; ".join(action_detail) if action_detail else req.notes,
    ))

    for slip in settlement.slips:
        if target == "matched":
            slip.status = "matched"
        elif target == "settled":
            slip.status = "settled"

    for bill in settlement.bills:
        if target == "matched":
            bill.status = "matched"
        elif target == "settled":
            bill.status = "settled"

    if target in ["matched", "settled"]:
        settlement.order.status = target

    db.commit()

    return {
        "settlement_id": settlement.id,
        "from_status": old_status,
        "to_status": target,
        "actions": action_detail,
    }


@router.get("/{settlement_id}/fee-deduction")
def get_fee_deduction_detail(settlement_id: int, db: Session = Depends(get_db)):
    settlement = db.query(Settlement).filter(Settlement.id == settlement_id).first()
    if not settlement:
        raise HTTPException(status_code=404, detail="结算记录不存在")

    order = settlement.order
    slips = settlement.slips

    result = {
        "settlement_id": settlement.id,
        "order_no": order.order_no,
        "order_amount": order.amount,
        "order_currency": order.currency,
        "fee_handling": settlement.fee_handling,
        "fee_amount": settlement.fee_amount,
        "slip_details": [],
        "follow_up": None,
    }

    for slip in slips:
        slip_info = {
            "slip_no": slip.slip_no,
            "amount": slip.amount,
            "currency": slip.currency,
            "fee_deducted": slip.fee_deducted,
            "fee_amount": slip.fee_amount,
        }
        result["slip_details"].append(slip_info)

        if slip.fee_deducted:
            result["follow_up"] = (
                f"水单 '{slip.slip_no}' 手续费内扣已标记，"
                f"到账 {slip.currency} {slip.amount}，"
                f"请确认手续费金额并推进状态："
                f"调用 POST /settlements/{settlement_id}/advance，"
                f"设 to_status='matched'，fee_handling='deducted'，fee_amount=<实际手续费>"
            )
        elif slip.amount and order.currency == slip.currency and slip.amount < order.amount:
            diff = order.amount - slip.amount
            result["follow_up"] = (
                f"水单 '{slip.slip_no}' 到账 {slip.currency} {slip.amount:.2f} "
                f"< 订单 {order.currency} {order.amount:.2f}，差额 {diff:.2f}。"
                f"如确认为手续费内扣，请调用 POST /settlements/{settlement_id}/advance，"
                f"设 to_status='matched'，fee_handling='deducted'，fee_amount={diff:.2f}"
            )

    return result


@router.get("/pending-confirm/list")
def list_pending_confirm(db: Session = Depends(get_db)):
    settlements = db.query(Settlement).filter(
        Settlement.match_status == "pending_confirm"
    ).all()

    results = []
    for s in settlements:
        slip_infos = []
        for slip in s.slips:
            slip_infos.append({
                "slip_no": slip.slip_no,
                "amount": slip.amount,
                "currency": slip.currency,
                "is_split": slip.is_split,
                "split_group_id": slip.split_group_id,
                "fee_deducted": slip.fee_deducted,
            })
        results.append({
            "settlement_id": s.id,
            "order_no": s.order.order_no,
            "order_amount": s.order.amount,
            "currency": s.currency,
            "notes": s.notes,
            "slips": slip_infos,
            "action_needed": "需确认拆分组合或手续费内扣后，推进状态至 matched 或 discrepancy",
        })
    return results
