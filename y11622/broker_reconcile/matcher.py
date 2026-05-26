from typing import Dict, List, Tuple, Optional
from collections import defaultdict
import uuid

from .models import (
    ReconcileContext, TradeConfirmation, CashFlow,
    Discrepancy, DiscrepancyType, MatchResult, TradeSide
)
from .calendar_aligner import align_dates
from .fee_attributor import attribute_fees


AMOUNT_TOLERANCE = 0.01


def _calculate_net_amount(trade: TradeConfirmation) -> float:
    sign = 1 if trade.side == TradeSide.BUY else -1
    return sign * (trade.gross_amount + trade.total_fees)


def _match_amount(trade: TradeConfirmation, cf: CashFlow) -> Tuple[bool, float]:
    expected = abs(_calculate_net_amount(trade))
    actual = abs(cf.amount)
    diff = abs(expected - actual)
    ratio = diff / expected if expected > 0 else 0
    return diff < AMOUNT_TOLERANCE, ratio


def _find_candidate_flows(trade: TradeConfirmation,
                          ctx: ReconcileContext) -> List[CashFlow]:
    candidates: List[CashFlow] = []
    for cf in ctx.cash_flows.values():
        if cf.matched:
            continue
        if cf.security_code and cf.security_code != trade.security_code:
            continue
        if not cf.fee_code and abs(cf.amount) >= 100:
            candidates.append(cf)
    return candidates


def _score_match(trade: TradeConfirmation, flow: CashFlow,
                 ctx: ReconcileContext) -> Tuple[float, List[Discrepancy]]:
    total_score = 1.0
    all_discrepancies: List[Discrepancy] = []

    date_score, date_discs = align_dates(trade, flow, ctx.calendar)
    total_score *= date_score
    all_discrepancies.extend(date_discs)

    if trade.security_code and flow.security_code:
        if trade.security_code == flow.security_code:
            total_score *= 1.0
        else:
            total_score *= 0.2
            disc = Discrepancy(
                discrepancy_id=f"disc-sec-{uuid.uuid4().hex[:8]}",
                type=DiscrepancyType.SECURITY_MISMATCH,
                severity="高",
                description=f"证券代码不符: 成交[{trade.trade_id}]{trade.security_code}, 流水[{flow.flow_id}]{flow.security_code}",
                trade_ids=[trade.trade_id],
                flow_ids=[flow.flow_id],
                expected_value=trade.security_code,
                actual_value=flow.security_code,
            )
            all_discrepancies.append(disc)

    amount_match, ratio = _match_amount(trade, flow)
    if amount_match:
        total_score *= 1.0
    else:
        if ratio < 0.05:
            total_score *= 0.8
            disc = Discrepancy(
                discrepancy_id=f"disc-amt-{uuid.uuid4().hex[:8]}",
                type=DiscrepancyType.AMOUNT_MISMATCH,
                severity="低",
                description=f"金额小幅偏差: 预期{abs(_calculate_net_amount(trade)):.2f}, 实际{abs(flow.amount):.2f}, 差异率{ratio:.2%}",
                trade_ids=[trade.trade_id],
                flow_ids=[flow.flow_id],
                expected_value=_calculate_net_amount(trade),
                actual_value=flow.amount,
            )
            all_discrepancies.append(disc)
        elif ratio < 0.5:
            total_score *= 0.5
            disc = Discrepancy(
                discrepancy_id=f"disc-amt-{uuid.uuid4().hex[:8]}",
                type=DiscrepancyType.AMOUNT_MISMATCH,
                severity="中",
                description=f"金额显著不符: 预期{abs(_calculate_net_amount(trade)):.2f}, 实际{abs(flow.amount):.2f}, 差异率{ratio:.2%}",
                trade_ids=[trade.trade_id],
                flow_ids=[flow.flow_id],
                expected_value=_calculate_net_amount(trade),
                actual_value=flow.amount,
            )
            all_discrepancies.append(disc)
        else:
            total_score *= 0.1

    return total_score, all_discrepancies


def match_trades(ctx: ReconcileContext) -> List[MatchResult]:
    matches: List[MatchResult] = []
    unmatched_trades: List[TradeConfirmation] = []

    for trade_id, trade in ctx.trades.items():
        candidates = _find_candidate_flows(trade, ctx)

        if not candidates:
            unmatched_trades.append(trade)
            disc = Discrepancy(
                discrepancy_id=f"disc-miss-{uuid.uuid4().hex[:8]}",
                type=DiscrepancyType.MISSING_CASHFLOW,
                severity="高",
                description=f"成交[{trade_id}]无匹配资金流水, 预期净金额{_calculate_net_amount(trade):.2f}",
                trade_ids=[trade_id],
                flow_ids=[],
                expected_value=_calculate_net_amount(trade),
                actual_value=None,
            )
            ctx.discrepancies.append(disc)
            continue

        best_score = 0.0
        best_flow: Optional[CashFlow] = None
        best_discs: List[Discrepancy] = []

        for flow in candidates:
            score, discs = _score_match(trade, flow, ctx)
            if score > best_score:
                best_score = score
                best_flow = flow
                best_discs = discs

        if best_flow and best_score >= 0.3:
            match_type = "完全匹配" if best_score >= 0.9 else (
                "部分匹配" if best_score >= 0.6 else "可疑匹配"
            )

            match = MatchResult(
                match_id=f"match-{uuid.uuid4().hex[:8]}",
                trade_id=trade.trade_id,
                flow_ids=[best_flow.flow_id],
                match_type=match_type,
                match_score=best_score,
                discrepancies=best_discs,
            )

            trade.matched = True
            trade.match_id = match.match_id
            best_flow.matched = True
            best_flow.match_id = match.match_id

            matches.append(match)
            ctx.discrepancies.extend(best_discs)
        else:
            unmatched_trades.append(trade)
            disc = Discrepancy(
                discrepancy_id=f"disc-unmatch-{uuid.uuid4().hex[:8]}",
                type=DiscrepancyType.UNMATCHED,
                severity="高",
                description=f"成交[{trade_id}]无法匹配, 最佳得分{best_score:.2f}",
                trade_ids=[trade_id],
                flow_ids=[c.flow_id for c in candidates],
                expected_value=None,
                actual_value=None,
            )
            ctx.discrepancies.append(disc)

    for flow_id, flow in ctx.cash_flows.items():
        if not flow.matched and not flow.fee_code:
            disc = Discrepancy(
                discrepancy_id=f"disc-extra-{uuid.uuid4().hex[:8]}",
                type=DiscrepancyType.MISSING_TRADE,
                severity="高",
                description=f"资金流水[{flow_id}]无对应成交记录, 金额{flow.amount:.2f}",
                trade_ids=[],
                flow_ids=[flow_id],
                expected_value=None,
                actual_value=flow.amount,
            )
            ctx.discrepancies.append(disc)

    ctx.matches = matches
    return matches


def detect_partial_executions(ctx: ReconcileContext) -> List[Discrepancy]:
    discrepancies: List[Discrepancy] = []

    unmatched_cfs = [cf for cf in ctx.cash_flows.values() if not cf.matched and not cf.fee_code]

    for trade in ctx.trades.values():
        if trade.matched:
            continue

        expected = abs(_calculate_net_amount(trade))
        for cf in unmatched_cfs:
            if cf.security_code and cf.security_code != trade.security_code:
                continue

            actual = abs(cf.amount)
            if actual < expected * 0.95:
                ratio = actual / expected
                if 0.1 < ratio < 0.95:
                    disc = Discrepancy(
                        discrepancy_id=f"disc-partial-{uuid.uuid4().hex[:8]}",
                        type=DiscrepancyType.PARTIAL_EXECUTION,
                        severity="中",
                        description=f"疑似部分成交: 流水[{cf.flow_id}]金额{actual:.2f}约为成交[{trade.trade_id}]预期{expected:.2f}的{ratio:.1%}",
                        trade_ids=[trade.trade_id],
                        flow_ids=[cf.flow_id],
                        expected_value=_calculate_net_amount(trade),
                        actual_value=cf.amount,
                    )
                    discrepancies.append(disc)

    ctx.discrepancies.extend(discrepancies)
    return discrepancies


def bucket_discrepancies(ctx: ReconcileContext) -> Dict[DiscrepancyType, List[Discrepancy]]:
    buckets: Dict[DiscrepancyType, List[Discrepancy]] = defaultdict(list)
    for disc in ctx.discrepancies:
        buckets[disc.type].append(disc)
    return dict(buckets)
