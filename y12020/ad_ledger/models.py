from dataclasses import dataclass, field
from decimal import Decimal
from datetime import date
from typing import Optional


@dataclass
class Account:
    account_id: str
    name: str
    platform: str
    currency: str = "CNY"


@dataclass
class Recharge:
    recharge_id: str
    account_id: str
    amount: Decimal
    date: date
    operator: str
    note: str = ""


@dataclass
class Consumption:
    consumption_id: str
    account_id: str
    amount: Decimal
    date: date
    settled_date: Optional[date] = None
    matched_from: list[dict] = field(default_factory=list)
    note: str = ""


@dataclass
class Rebate:
    rebate_id: str
    account_id: str
    amount: Decimal
    date: date
    rebate_from_recharge_id: str
    note: str = ""


@dataclass
class Refund:
    refund_id: str
    account_id: str
    amount: Decimal
    date: date
    refund_from_id: str
    refund_from_type: str
    note: str = ""


@dataclass
class BalanceEntry:
    account_id: str
    account_name: str
    total_recharged: Decimal
    total_consumed: Decimal
    total_rebated: Decimal
    total_refunded: Decimal
    current_balance: Decimal
    as_of_date: date


@dataclass
class ConflictRecord:
    record_type: str
    record_id: str
    existing: dict
    incoming: dict
    detected_at: str
