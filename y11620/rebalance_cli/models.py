"""数据模型：组合、持仓、约束、建议，带来源行号追踪"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class TradeAction(str, Enum):
    BUY = "买入"
    SELL = "卖出"
    HOLD = "持有"


class FailureReason(str, Enum):
    NONE = ""
    SMALL_TRADE = "交易额低于最小交易额"
    FORBIDDEN = "基金在禁买名单中"
    INSUFFICIENT_CASH = "现金不足"
    INSUFFICIENT_HOLDING = "持仓不足"
    POSITION_LIMIT = "超出持仓上限"


@dataclass
class SourceInfo:
    file: str
    line_no: int

    def __str__(self):
        return f"{self.file}#{self.line_no}"


@dataclass
class Holding:
    fund_code: str
    fund_name: str
    shares: float
    current_price: float
    source: SourceInfo

    @property
    def market_value(self) -> float:
        return round(self.shares * self.current_price, 2)


@dataclass
class TargetWeight:
    fund_code: str
    target_weight: float
    source: SourceInfo


@dataclass
class PositionLimit:
    fund_code: str
    max_weight: Optional[float] = None
    min_weight: Optional[float] = None
    source: Optional[SourceInfo] = None


@dataclass
class ForbiddenFund:
    fund_code: str
    reason: str
    source: SourceInfo


@dataclass
class Suggestion:
    fund_code: str
    fund_name: str
    action: TradeAction
    amount: float
    priority: int = 0
    failure_reason: FailureReason = FailureReason.NONE
    failure_source: Optional[SourceInfo] = None
    source: Optional[SourceInfo] = None

    @property
    def is_valid(self) -> bool:
        return self.failure_reason == FailureReason.NONE


@dataclass
class Portfolio:
    holdings: list[Holding] = field(default_factory=list)
    target_weights: list[TargetWeight] = field(default_factory=list)
    position_limits: list[PositionLimit] = field(default_factory=list)
    forbidden_list: list[ForbiddenFund] = field(default_factory=list)
    suggestions: list[Suggestion] = field(default_factory=list)
    cash: float = 0.0
    min_trade_amount: float = 100.0
    source: Optional[SourceInfo] = None

    @property
    def total_market_value(self) -> float:
        return round(sum(h.market_value for h in self.holdings) + self.cash, 2)

    def current_weight(self, fund_code: str) -> float:
        mv = self.total_market_value
        if mv <= 0:
            return 0.0
        for h in self.holdings:
            if h.fund_code == fund_code:
                return round(h.market_value / mv * 100, 4)
        return 0.0

    def target_weight_of(self, fund_code: str) -> float:
        for tw in self.target_weights:
            if tw.fund_code == fund_code:
                return tw.target_weight
        return 0.0

    def is_forbidden(self, fund_code: str) -> Optional[ForbiddenFund]:
        for f in self.forbidden_list:
            if f.fund_code == fund_code:
                return f
        return None

    def get_holding(self, fund_code: str) -> Optional[Holding]:
        for h in self.holdings:
            if h.fund_code == fund_code:
                return h
        return None

    def get_limit(self, fund_code: str) -> Optional[PositionLimit]:
        for l in self.position_limits:
            if l.fund_code == fund_code:
                return l
        return None
