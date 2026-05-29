from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Optional, List, Dict, Any
from enum import Enum


class TradeSide(str, Enum):
    BUY = "BUY"
    SELL = "SELL"


class DiscrepancyType(str, Enum):
    T1_MISMATCH = "T+1日期错位"
    FEE_MISCLASSIFIED = "费用归类错误"
    PARTIAL_EXECUTION = "部分成交"
    AMOUNT_MISMATCH = "金额不符"
    SECURITY_MISMATCH = "证券代码不符"
    MISSING_TRADE = "缺失成交记录"
    MISSING_CASHFLOW = "缺失资金流水"
    EXTRA_FEE = "额外费用"
    UNMATCHED = "无法匹配"


@dataclass
class TraceInfo:
    source_file: str
    source_line: int
    imported_at: datetime = field(default_factory=datetime.now)
    modified_at: Optional[datetime] = None
    modification_note: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source_file": self.source_file,
            "source_line": self.source_line,
            "imported_at": self.imported_at.isoformat(),
            "modified_at": self.modified_at.isoformat() if self.modified_at else None,
            "modification_note": self.modification_note,
        }


@dataclass
class Security:
    code: str
    name: str
    type: str
    trace: TraceInfo

    def to_dict(self) -> Dict[str, Any]:
        return {
            "code": self.code,
            "name": self.name,
            "type": self.type,
            "trace": self.trace.to_dict(),
        }


@dataclass
class FeeItem:
    fee_code: str
    fee_name: str
    category: str
    trace: TraceInfo

    def to_dict(self) -> Dict[str, Any]:
        return {
            "fee_code": self.fee_code,
            "fee_name": self.fee_name,
            "category": self.category,
            "trace": self.trace.to_dict(),
        }


@dataclass
class TradeConfirmation:
    trade_id: str
    trade_date: date
    settlement_date: date
    security_code: str
    security_name: str
    side: TradeSide
    quantity: float
    price: float
    gross_amount: float
    fees: Dict[str, float]
    net_amount: float
    trace: TraceInfo
    matched: bool = False
    match_id: Optional[str] = None

    @property
    def total_fees(self) -> float:
        return sum(self.fees.values())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "trade_id": self.trade_id,
            "trade_date": self.trade_date.isoformat(),
            "settlement_date": self.settlement_date.isoformat(),
            "security_code": self.security_code,
            "security_name": self.security_name,
            "side": self.side.value,
            "quantity": self.quantity,
            "price": self.price,
            "gross_amount": self.gross_amount,
            "fees": self.fees,
            "total_fees": self.total_fees,
            "net_amount": self.net_amount,
            "matched": self.matched,
            "match_id": self.match_id,
            "trace": self.trace.to_dict(),
        }


@dataclass
class CashFlow:
    flow_id: str
    trade_date: date
    settlement_date: date
    security_code: Optional[str]
    amount: float
    fee_code: Optional[str]
    fee_name: Optional[str]
    direction: str
    trace: TraceInfo
    matched: bool = False
    match_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "flow_id": self.flow_id,
            "trade_date": self.trade_date.isoformat(),
            "settlement_date": self.settlement_date.isoformat(),
            "security_code": self.security_code,
            "amount": self.amount,
            "fee_code": self.fee_code,
            "fee_name": self.fee_name,
            "direction": self.direction,
            "matched": self.matched,
            "match_id": self.match_id,
            "trace": self.trace.to_dict(),
        }


@dataclass
class TradeCalendar:
    trade_date: date
    is_trading_day: bool
    settlement_day: Optional[date]
    trace: TraceInfo

    def to_dict(self) -> Dict[str, Any]:
        return {
            "trade_date": self.trade_date.isoformat(),
            "is_trading_day": self.is_trading_day,
            "settlement_day": self.settlement_day.isoformat() if self.settlement_day else None,
            "trace": self.trace.to_dict(),
        }


@dataclass
class Discrepancy:
    discrepancy_id: str
    type: DiscrepancyType
    severity: str
    description: str
    trade_ids: List[str]
    flow_ids: List[str]
    expected_value: Optional[Any] = None
    actual_value: Optional[Any] = None
    resolved: bool = False
    resolution_note: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "discrepancy_id": self.discrepancy_id,
            "type": self.type.value,
            "severity": self.severity,
            "description": self.description,
            "trade_ids": self.trade_ids,
            "flow_ids": self.flow_ids,
            "expected_value": self.expected_value,
            "actual_value": self.actual_value,
            "resolved": self.resolved,
            "resolution_note": self.resolution_note,
        }


@dataclass
class MatchResult:
    match_id: str
    trade_id: str
    flow_ids: List[str]
    match_type: str
    match_score: float
    discrepancies: List[Discrepancy]
    matched_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "match_id": self.match_id,
            "trade_id": self.trade_id,
            "flow_ids": self.flow_ids,
            "match_type": self.match_type,
            "match_score": self.match_score,
            "discrepancies": [d.to_dict() for d in self.discrepancies],
            "matched_at": self.matched_at.isoformat(),
        }


@dataclass
class ReconcileContext:
    report_date: date
    securities: Dict[str, Security] = field(default_factory=dict)
    fee_items: Dict[str, FeeItem] = field(default_factory=dict)
    trades: Dict[str, TradeConfirmation] = field(default_factory=dict)
    cash_flows: Dict[str, CashFlow] = field(default_factory=dict)
    calendar: Dict[date, TradeCalendar] = field(default_factory=dict)
    discrepancies: List[Discrepancy] = field(default_factory=list)
    matches: List[MatchResult] = field(default_factory=list)
    corrections: List[Dict[str, Any]] = field(default_factory=list)
