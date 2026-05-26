from typing import Dict, List, Tuple, Optional
import uuid

from .models import (
    ReconcileContext, TradeConfirmation, CashFlow,
    FeeItem, Discrepancy, DiscrepancyType
)


FEE_KEYWORD_MAPPING = {
    "印花税": ["印花税", "stamp", "tax"],
    "佣金": ["佣金", "commission", "broker"],
    "过户费": ["过户费", "transfer", "过户"],
    "经手费": ["经手费", "handling", "exchange"],
    "证管费": ["证管费", "监管", "监管费", "securities"],
    "其他": ["其他", "other", "杂项"],
}


def _match_fee_category(fee_name: str, fee_items: Dict[str, FeeItem]) -> Optional[str]:
    if not fee_name:
        return None

    for fee_code, fee_item in fee_items.items():
        if fee_name == fee_item.fee_name or fee_name == fee_item.fee_code:
            return fee_item.category

    fee_lower = fee_name.lower()
    for category, keywords in FEE_KEYWORD_MAPPING.items():
        for kw in keywords:
            if kw.lower() in fee_lower:
                return category

    return None


def _infer_fee_code(fee_name: str, fee_items: Dict[str, FeeItem]) -> Optional[str]:
    for fee_code, fee_item in fee_items.items():
        if fee_name == fee_item.fee_name:
            return fee_code
    return None


def detect_fee_misclassification(ctx: ReconcileContext) -> List[Discrepancy]:
    discrepancies: List[Discrepancy] = []

    for flow_id, cf in ctx.cash_flows.items():
        if not cf.fee_code or not cf.fee_name:
            continue

        expected_category = _match_fee_category(cf.fee_name, ctx.fee_items)
        if expected_category:
            fee_item = ctx.fee_items.get(cf.fee_code)
            if fee_item and fee_item.category != expected_category:
                disc = Discrepancy(
                    discrepancy_id=f"disc-fee-{uuid.uuid4().hex[:8]}",
                    type=DiscrepancyType.FEE_MISCLASSIFIED,
                    severity="中",
                    description=f"费用归类错误: 流水[{flow_id}]费用[{cf.fee_name}]应属于[{expected_category}], 当前分类[{fee_item.category}]",
                    trade_ids=[],
                    flow_ids=[flow_id],
                    expected_value=expected_category,
                    actual_value=fee_item.category,
                )
                discrepancies.append(disc)

    return discrepancies


def attribute_fees(trade: TradeConfirmation,
                   cash_flows: List[CashFlow],
                   fee_items: Dict[str, FeeItem]) -> Tuple[float, List[Discrepancy], Dict[str, float]]:
    discrepancies: List[Discrepancy] = []
    matched_fees: Dict[str, float] = {}
    score = 1.0

    fee_flows = [cf for cf in cash_flows if cf.fee_code or cf.fee_name]

    for fee_name, expected_amount in trade.fees.items():
        matched = False
        for cf in fee_flows:
            if cf.fee_name == fee_name or (cf.fee_code and cf.fee_code == fee_name):
                if abs(cf.amount - expected_amount) < 0.01:
                    matched_fees[fee_name] = cf.amount
                    matched = True
                    break
                else:
                    matched_fees[fee_name] = cf.amount
                    matched = True
                    disc = Discrepancy(
                        discrepancy_id=f"disc-fee-{uuid.uuid4().hex[:8]}",
                        type=DiscrepancyType.AMOUNT_MISMATCH,
                        severity="低",
                        description=f"费用金额不符: {fee_name} 预期{expected_amount}, 实际{cf.amount}",
                        trade_ids=[trade.trade_id],
                        flow_ids=[cf.flow_id],
                        expected_value=expected_amount,
                        actual_value=cf.amount,
                    )
                    discrepancies.append(disc)
                    score *= 0.9
                    break

        if not matched:
            disc = Discrepancy(
                discrepancy_id=f"disc-fee-{uuid.uuid4().hex[:8]}",
                type=DiscrepancyType.MISSING_CASHFLOW,
                severity="中",
                description=f"缺失费用流水: {fee_name} (预期金额: {expected_amount})",
                trade_ids=[trade.trade_id],
                flow_ids=[],
                expected_value=expected_amount,
                actual_value=0.0,
            )
            discrepancies.append(disc)
            score *= 0.5

    for cf in fee_flows:
        fee_key = cf.fee_name or cf.fee_code
        if fee_key and fee_key not in matched_fees:
            disc = Discrepancy(
                discrepancy_id=f"disc-fee-{uuid.uuid4().hex[:8]}",
                type=DiscrepancyType.EXTRA_FEE,
                severity="中",
                description=f"额外费用流水: 流水[{cf.flow_id}]费用[{cf.fee_name}]金额{cf.amount}无对应成交记录",
                trade_ids=[],
                flow_ids=[cf.flow_id],
                expected_value=0.0,
                actual_value=cf.amount,
            )
            discrepancies.append(disc)
            score *= 0.3

    return score, discrepancies, matched_fees


def summarize_fee_categories(ctx: ReconcileContext) -> Dict[str, Dict]:
    summary: Dict[str, Dict] = {}

    for fee_code, fee_item in ctx.fee_items.items():
        cat = fee_item.category
        if cat not in summary:
            summary[cat] = {"count": 0, "total_amount": 0.0, "fee_codes": []}
        summary[cat]["fee_codes"].append(fee_code)
        summary[cat]["count"] += 1

    for cf in ctx.cash_flows.values():
        if cf.fee_code:
            fee_item = ctx.fee_items.get(cf.fee_code)
            if fee_item:
                cat = fee_item.category
                if cat in summary:
                    summary[cat]["total_amount"] += abs(cf.amount)

    return summary
