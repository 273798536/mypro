"""约束求解引擎：权重偏离计算、约束校验、建议生成与失败原因标记"""

from dataclasses import dataclass, field
from typing import Optional

from .models import (
    FailureReason,
    ForbiddenFund,
    Holding,
    Portfolio,
    PositionLimit,
    Suggestion,
    SourceInfo,
    TargetWeight,
    TradeAction,
)


@dataclass
class FundAnalysis:
    fund_code: str
    fund_name: str
    current_weight: float
    target_weight: float
    weight_deviation: float
    current_value: float
    target_value: float
    value_gap: float
    action: TradeAction
    trade_amount: float
    is_forbidden: bool = False
    forbidden_reason: str = ""
    forbidden_source: Optional[SourceInfo] = None
    min_trade_violation: bool = False
    position_limit_violation: bool = False
    limit_violation_detail: str = ""
    insufficient_cash: bool = False
    insufficient_holding: bool = False
    source_hint: str = ""


@dataclass
class SolveResult:
    analyses: list[FundAnalysis] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


def _compute_weight_deviation(current_w: float, target_w: float) -> float:
    return round(target_w - current_w, 4)


def _project_weight_after_trade(current_value: float, total_value: float,
                                 trade_amount: float, is_sell: bool) -> float:
    if total_value <= 0:
        return 0.0
    if is_sell:
        new_value = current_value - trade_amount
    else:
        new_value = current_value + trade_amount
    return round(new_value / total_value * 100, 4)


def analyze_portfolio(portfolio: Portfolio) -> SolveResult:
    result = SolveResult()
    total_mv = portfolio.total_market_value

    if total_mv <= 0:
        result.errors.append("组合总市值为零或负数，无法进行分析")
        return result

    all_fund_codes = set()
    for h in portfolio.holdings:
        all_fund_codes.add(h.fund_code)
    for tw in portfolio.target_weights:
        all_fund_codes.add(tw.fund_code)

    for fund_code in sorted(all_fund_codes):
        holding = portfolio.get_holding(fund_code)
        tw = portfolio.target_weight_of(fund_code)
        forbidden = portfolio.is_forbidden(fund_code)
        limit = portfolio.get_limit(fund_code)

        fund_name = holding.fund_name if holding else fund_code
        current_value = holding.market_value if holding else 0.0
        current_w = portfolio.current_weight(fund_code)
        target_w = tw
        target_value = round(total_mv * target_w / 100, 2)
        value_gap = round(target_value - current_value, 2)
        weight_dev = _compute_weight_deviation(current_w, target_w)

        if value_gap > 0.01:
            action = TradeAction.BUY
            trade_amount = value_gap
        elif value_gap < -0.01:
            action = TradeAction.SELL
            trade_amount = abs(value_gap)
        else:
            action = TradeAction.HOLD
            trade_amount = 0.0

        analysis = FundAnalysis(
            fund_code=fund_code,
            fund_name=fund_name,
            current_weight=current_w,
            target_weight=target_w,
            weight_deviation=weight_dev,
            current_value=current_value,
            target_value=target_value,
            value_gap=value_gap,
            action=action,
            trade_amount=round(trade_amount, 2),
        )

        if forbidden:
            analysis.is_forbidden = True
            analysis.forbidden_reason = forbidden.reason
            analysis.forbidden_source = forbidden.source

        if 0 < abs(trade_amount) < portfolio.min_trade_amount:
            analysis.min_trade_violation = True

        if limit:
            if limit.max_weight is not None and target_w > limit.max_weight:
                analysis.position_limit_violation = True
                analysis.limit_violation_detail = (
                    f"目标权重 {target_w}% 超出上限 {limit.max_weight}%"
                )
            if limit.min_weight is not None and target_w < limit.min_weight:
                analysis.position_limit_violation = True
                analysis.limit_violation_detail = (
                    f"目标权重 {target_w}% 低于下限 {limit.min_weight}%"
                )

        if action == TradeAction.BUY and trade_amount > portfolio.cash:
            analysis.insufficient_cash = True

        if action == TradeAction.SELL and trade_amount > current_value:
            analysis.insufficient_holding = True

        source_parts = []
        if holding:
            source_parts.append(f"持仓@{holding.source}")
        if tw and portfolio.target_weights:
            for tw_obj in portfolio.target_weights:
                if tw_obj.fund_code == fund_code:
                    source_parts.append(f"目标@{tw_obj.source}")
                    break
        analysis.source_hint = " | ".join(source_parts)

        result.analyses.append(analysis)

    return result


def generate_suggestions(
    portfolio: Portfolio,
    analysis_result: SolveResult,
) -> list[Suggestion]:
    suggestions = []
    remaining_cash = portfolio.cash

    sorted_analyses = sorted(
        analysis_result.analyses,
        key=lambda a: (
            0 if a.action != TradeAction.HOLD else 1,
            -abs(a.weight_deviation),
        ),
    )

    for analysis in sorted_analyses:
        if analysis.action == TradeAction.HOLD or analysis.trade_amount <= 0:
            continue

        fund_code = analysis.fund_code
        fund_name = analysis.fund_name
        trade_amount = analysis.trade_amount
        action = analysis.action

        failure_reason = FailureReason.NONE
        failure_source = None

        if analysis.is_forbidden:
            failure_reason = FailureReason.FORBIDDEN
            failure_source = analysis.forbidden_source
        elif analysis.min_trade_violation:
            failure_reason = FailureReason.SMALL_TRADE
            failure_source = SourceInfo(
                file="约束配置",
                line_no=-1,
            )
        elif analysis.insufficient_cash:
            failure_reason = FailureReason.INSUFFICIENT_CASH
            failure_source = SourceInfo(
                file="组合配置",
                line_no=-1,
            )
        elif analysis.insufficient_holding:
            failure_reason = FailureReason.INSUFFICIENT_HOLDING
            failure_source = SourceInfo(
                file="组合配置",
                line_no=-1,
            )
        elif analysis.position_limit_violation:
            failure_reason = FailureReason.POSITION_LIMIT
            failure_source = None

        source_hint = analysis.source_hint

        suggestion = Suggestion(
            fund_code=fund_code,
            fund_name=fund_name,
            action=action,
            amount=trade_amount,
            priority=0,
            failure_reason=failure_reason,
            failure_source=failure_source,
            source=SourceInfo(
                file="系统生成",
                line_no=0,
            ),
        )

        if not suggestion.is_valid:
            pass
        elif action == TradeAction.BUY:
            if trade_amount <= remaining_cash:
                remaining_cash -= trade_amount
            else:
                suggestion.failure_reason = FailureReason.INSUFFICIENT_CASH
                suggestion.failure_source = SourceInfo(file="组合配置", line_no=-1)

        suggestions.append(suggestion)

    return suggestions


def validate_existing_suggestions(
    portfolio: Portfolio,
) -> list[Suggestion]:
    remaining_cash = portfolio.cash
    total_mv = portfolio.total_market_value

    for s in portfolio.suggestions:
        s.failure_reason = FailureReason.NONE
        s.failure_source = None

        forbidden = portfolio.is_forbidden(s.fund_code)
        if forbidden:
            s.failure_reason = FailureReason.FORBIDDEN
            s.failure_source = forbidden.source
            continue

        if 0 < s.amount < portfolio.min_trade_amount:
            s.failure_reason = FailureReason.SMALL_TRADE
            s.failure_source = SourceInfo(file="约束配置", line_no=-1)
            continue

        if s.action == TradeAction.BUY:
            if s.amount > remaining_cash:
                s.failure_reason = FailureReason.INSUFFICIENT_CASH
                s.failure_source = SourceInfo(file="组合配置", line_no=-1)
            else:
                remaining_cash -= s.amount
        elif s.action == TradeAction.SELL:
            holding = portfolio.get_holding(s.fund_code)
            if holding and s.amount > holding.market_value:
                s.failure_reason = FailureReason.INSUFFICIENT_HOLDING
                s.failure_source = holding.source

        limit = portfolio.get_limit(s.fund_code)
        if limit and s.failure_reason == FailureReason.NONE:
            holding = portfolio.get_holding(s.fund_code)
            current_value = holding.market_value if holding else 0.0
            projected_w = _project_weight_after_trade(
                current_value, total_mv, s.amount, s.action == TradeAction.SELL
            )
            if limit.max_weight is not None and projected_w > limit.max_weight:
                s.failure_reason = FailureReason.POSITION_LIMIT
                s.failure_source = limit.source
            if limit.min_weight is not None and projected_w < limit.min_weight:
                s.failure_reason = FailureReason.POSITION_LIMIT
                s.failure_source = limit.source

    return portfolio.suggestions
