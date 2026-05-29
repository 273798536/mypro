from datetime import datetime
from typing import Any, Dict, List, Optional

from .models import ReconcileContext, TradeConfirmation, CashFlow


def record_correction(
    ctx: ReconcileContext,
    correction_type: str,
    target_id: str,
    target_type: str,
    field_name: str,
    old_value: Any,
    new_value: Any,
    reason: str,
) -> Dict[str, Any]:

    correction = {
        "correction_id": f"corr-{abs(hash(f'{correction_type}{target_id}{datetime.now().isoformat()}')):x}",
        "correction_type": correction_type,
        "target_id": target_id,
        "target_type": target_type,
        "field_name": field_name,
        "old_value": old_value,
        "new_value": new_value,
        "reason": reason,
        "corrected_at": datetime.now().isoformat(),
    }

    ctx.corrections.append(correction)
    return correction


def correct_trade_settlement_date(
    ctx: ReconcileContext,
    trade_id: str,
    new_settlement_date: str,
    reason: str = "根据日历对齐修正",
) -> Optional[Dict[str, Any]]:

    if trade_id not in ctx.trades:
        return None

    trade = ctx.trades[trade_id]
    old_date = trade.settlement_date.isoformat()

    from datetime import datetime
    new_date = datetime.fromisoformat(new_settlement_date).date()

    trade.settlement_date = new_date
    trade.trace.modified_at = datetime.now()
    trade.trace.modification_note = reason

    return record_correction(
        ctx,
        correction_type="日期修正",
        target_id=trade_id,
        target_type="trade",
        field_name="settlement_date",
        old_value=old_date,
        new_value=new_settlement_date,
        reason=reason,
    )


def correct_cashflow_settlement_date(
    ctx: ReconcileContext,
    flow_id: str,
    new_settlement_date: str,
    reason: str = "根据日历对齐修正",
) -> Optional[Dict[str, Any]]:

    if flow_id not in ctx.cash_flows:
        return None

    cf = ctx.cash_flows[flow_id]
    old_date = cf.settlement_date.isoformat()

    from datetime import datetime
    new_date = datetime.fromisoformat(new_settlement_date).date()

    cf.settlement_date = new_date
    cf.trace.modified_at = datetime.now()
    cf.trace.modification_note = reason

    return record_correction(
        ctx,
        correction_type="日期修正",
        target_id=flow_id,
        target_type="cashflow",
        field_name="settlement_date",
        old_value=old_date,
        new_value=new_settlement_date,
        reason=reason,
    )


def correct_fee_classification(
    ctx: ReconcileContext,
    flow_id: str,
    new_fee_code: str,
    new_fee_name: str,
    reason: str = "修正费用归类",
) -> Optional[Dict[str, Any]]:

    if flow_id not in ctx.cash_flows:
        return None

    cf = ctx.cash_flows[flow_id]
    old_code = cf.fee_code
    old_name = cf.fee_name

    cf.fee_code = new_fee_code
    cf.fee_name = new_fee_name
    cf.trace.modified_at = datetime.now()
    cf.trace.modification_note = reason

    return record_correction(
        ctx,
        correction_type="费用归类修正",
        target_id=flow_id,
        target_type="cashflow",
        field_name="fee_code,fee_name",
        old_value=f"{old_code}:{old_name}",
        new_value=f"{new_fee_code}:{new_fee_name}",
        reason=reason,
    )


def resolve_discrepancy(
    ctx: ReconcileContext,
    discrepancy_id: str,
    resolution_note: str,
) -> bool:

    for disc in ctx.discrepancies:
        if disc.discrepancy_id == discrepancy_id:
            disc.resolved = True
            disc.resolution_note = resolution_note

            record_correction(
                ctx,
                correction_type="差异解决",
                target_id=discrepancy_id,
                target_type="discrepancy",
                field_name="resolved",
                old_value=False,
                new_value=True,
                reason=resolution_note,
            )
            return True

    return False
