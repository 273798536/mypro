from datetime import date, timedelta
from typing import Dict, List, Optional, Tuple
import uuid

from .models import (
    ReconcileContext, TradeConfirmation, CashFlow,
    TradeCalendar, Discrepancy, DiscrepancyType
)


def _get_trading_day_settlement(calendar: Dict[date, TradeCalendar],
                                trade_date: date) -> Optional[date]:
    if trade_date in calendar:
        cal = calendar[trade_date]
        if cal.settlement_day:
            return cal.settlement_day
    return trade_date + timedelta(days=1)


def _days_diff(d1: date, d2: date) -> int:
    return abs((d1 - d2).days)


def detect_t1_mismatch(ctx: ReconcileContext) -> List[Discrepancy]:
    discrepancies: List[Discrepancy] = []

    for trade_id, trade in ctx.trades.items():
        expected_settlement = _get_trading_day_settlement(ctx.calendar, trade.trade_date)

        if trade.settlement_date != expected_settlement:
            disc = Discrepancy(
                discrepancy_id=f"disc-t1-{uuid.uuid4().hex[:8]}",
                type=DiscrepancyType.T1_MISMATCH,
                severity="中",
                description=f"成交[{trade_id}]交收日期错位: 预期{expected_settlement}, 实际{trade.settlement_date}",
                trade_ids=[trade_id],
                flow_ids=[],
                expected_value=expected_settlement.isoformat(),
                actual_value=trade.settlement_date.isoformat(),
            )
            discrepancies.append(disc)

    for flow_id, cf in ctx.cash_flows.items():
        expected_settlement = _get_trading_day_settlement(ctx.calendar, cf.trade_date)

        if cf.settlement_date != expected_settlement:
            disc = Discrepancy(
                discrepancy_id=f"disc-t1-{uuid.uuid4().hex[:8]}",
                type=DiscrepancyType.T1_MISMATCH,
                severity="中",
                description=f"流水[{flow_id}]交收日期错位: 预期{expected_settlement}, 实际{cf.settlement_date}",
                trade_ids=[],
                flow_ids=[flow_id],
                expected_value=expected_settlement.isoformat(),
                actual_value=cf.settlement_date.isoformat(),
            )
            discrepancies.append(disc)

    return discrepancies


def align_dates(trade: TradeConfirmation, cf: CashFlow,
                calendar: Dict[date, TradeCalendar]) -> Tuple[float, List[Discrepancy]]:
    discrepancies: List[Discrepancy] = []
    score = 1.0

    if trade.trade_date == cf.trade_date:
        score *= 1.0
    else:
        diff = _days_diff(trade.trade_date, cf.trade_date)
        if diff <= 1:
            score *= 0.7
            disc = Discrepancy(
                discrepancy_id=f"disc-t1-{uuid.uuid4().hex[:8]}",
                type=DiscrepancyType.T1_MISMATCH,
                severity="低",
                description=f"成交日偏差{diff}天: 成交[{trade.trade_id}]{trade.trade_date}, 流水[{cf.flow_id}]{cf.trade_date}",
                trade_ids=[trade.trade_id],
                flow_ids=[cf.flow_id],
                expected_value=trade.trade_date.isoformat(),
                actual_value=cf.trade_date.isoformat(),
            )
            discrepancies.append(disc)
        else:
            score *= 0.1

    t_settle = _get_trading_day_settlement(calendar, trade.trade_date)
    cf_settle = _get_trading_day_settlement(calendar, cf.trade_date)

    if trade.settlement_date == cf.settlement_date:
        score *= 1.0
    elif t_settle == cf_settle:
        score *= 0.9
    else:
        diff = _days_diff(trade.settlement_date, cf.settlement_date)
        if diff <= 1:
            score *= 0.6
        else:
            score *= 0.1

    return score, discrepancies


def suggest_corrected_settlement(trade_date: date,
                                 calendar: Dict[date, TradeCalendar]) -> date:
    return _get_trading_day_settlement(calendar, trade_date)
