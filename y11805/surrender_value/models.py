from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from datetime import date, datetime
from enum import Enum
from typing import Optional


class ConflictSeverity(Enum):
    WARNING = "warning"
    ERROR = "error"


class ConflictSource(Enum):
    POLICY = "保单"
    PAYMENT_RECORD = "缴费记录"
    SURRENDER_APPLICATION = "退保申请"


class DividendType(Enum):
    CASH = "现金领取"
    ACCUMULATE = "累积生息"
    BUY_PREMIUM = "购买缴清增额"


class PaymentStatus(Enum):
    PAID = "已缴"
    UNPAID = "未缴"
    OVERDUE = "逾期"
    GRACE_PERIOD = "宽限期内"


@dataclass
class CashValueEntry:
    year: int
    cash_value: float


@dataclass
class DividendRecord:
    year: int
    amount: float
    dividend_type: DividendType = DividendType.ACCUMULATE
    is_cross_year: bool = False

    def to_dict(self):
        d = asdict(self)
        d["dividend_type"] = self.dividend_type.value
        return d

    @classmethod
    def from_dict(cls, data: dict) -> "DividendRecord":
        data = dict(data)
        data["dividend_type"] = DividendType(data["dividend_type"])
        return cls(**data)


@dataclass
class Policy:
    policy_number: str
    product_name: str
    issue_date: date
    sum_assured: float
    annual_premium: float
    payment_term_years: int
    policy_status: str = "有效"
    cash_value_table: list[CashValueEntry] = field(default_factory=list)
    grace_period_days: int = 60
    has_loan: bool = False
    loan_principal: float = 0.0
    loan_interest: float = 0.0
    loan_interest_rate: float = 0.0
    dividend_type: DividendType = DividendType.ACCUMULATE
    dividend_records: list[DividendRecord] = field(default_factory=list)

    def get_policy_year(self, reference_date: date) -> int:
        delta = reference_date - self.issue_date
        return delta.days // 365 + 1

    def get_cash_value(self, policy_year: int) -> Optional[float]:
        for entry in self.cash_value_table:
            if entry.year == policy_year:
                return entry.cash_value
        return None

    def to_dict(self):
        d = asdict(self)
        d["issue_date"] = self.issue_date.isoformat()
        d["dividend_type"] = self.dividend_type.value
        d["cash_value_table"] = [asdict(e) for e in self.cash_value_table]
        d["dividend_records"] = [r.to_dict() for r in self.dividend_records]
        return d

    @classmethod
    def from_dict(cls, data: dict) -> "Policy":
        data = dict(data)
        data["issue_date"] = date.fromisoformat(data["issue_date"])
        data["dividend_type"] = DividendType(data["dividend_type"])
        data["cash_value_table"] = [
            CashValueEntry(**e) for e in data.get("cash_value_table", [])
        ]
        data["dividend_records"] = [
            DividendRecord.from_dict(e) for e in data.get("dividend_records", [])
        ]
        return cls(**data)


@dataclass
class PaymentRecord:
    policy_number: str
    payment_date: Optional[date]
    due_date: date
    amount: float
    status: PaymentStatus = PaymentStatus.PAID

    def is_within_grace_period(self, grace_days: int = 60) -> bool:
        if self.payment_date is None:
            return (date.today() - self.due_date).days <= grace_days
        return (self.payment_date - self.due_date).days <= grace_days

    def to_dict(self):
        d = asdict(self)
        d["payment_date"] = self.payment_date.isoformat() if self.payment_date else None
        d["due_date"] = self.due_date.isoformat()
        d["status"] = self.status.value
        return d

    @classmethod
    def from_dict(cls, data: dict) -> "PaymentRecord":
        data = dict(data)
        data["payment_date"] = (
            date.fromisoformat(data["payment_date"]) if data["payment_date"] else None
        )
        data["due_date"] = date.fromisoformat(data["due_date"])
        data["status"] = PaymentStatus(data["status"])
        return cls(**data)


@dataclass
class SurrenderApplication:
    policy_number: str
    application_date: date
    surrender_type: str = "full"
    declared_loan_principal: Optional[float] = None
    declared_loan_interest: Optional[float] = None
    declared_dividend_balance: Optional[float] = None

    def to_dict(self):
        d = asdict(self)
        d["application_date"] = self.application_date.isoformat()
        return d

    @classmethod
    def from_dict(cls, data: dict) -> "SurrenderApplication":
        data = dict(data)
        data["application_date"] = date.fromisoformat(data["application_date"])
        return cls(**data)


@dataclass
class Conflict:
    source_a: ConflictSource
    source_b: ConflictSource
    field_name: str
    value_a: str
    value_b: str
    severity: ConflictSeverity = ConflictSeverity.WARNING
    resolution: str = ""

    def to_dict(self):
        d = asdict(self)
        d["source_a"] = self.source_a.value
        d["source_b"] = self.source_b.value
        d["severity"] = self.severity.value
        return d


@dataclass
class DeductionItem:
    name: str
    amount: float
    order: int
    source: str = ""
    is_quarantined: bool = False
    quarantine_reason: str = ""

    def to_dict(self):
        return asdict(self)


@dataclass
class SurrenderResult:
    policy_number: str
    calculation_date: str
    policy_year: int
    base_cash_value: float
    deductions: list[DeductionItem] = field(default_factory=list)
    dividend_adjustment: float = 0.0
    dividend_details: list[dict] = field(default_factory=list)
    net_surrender_value: float = 0.0
    conflicts: list[Conflict] = field(default_factory=list)
    grace_period_status: str = ""
    grace_period_detail: str = ""
    quarantined_items: list[DeductionItem] = field(default_factory=list)

    def to_dict(self):
        d = asdict(self)
        d["conflicts"] = [c.to_dict() for c in self.conflicts]
        return d

    def save(self, filepath: str):
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, ensure_ascii=False, indent=2)

    @classmethod
    def load(cls, filepath: str) -> "SurrenderResult":
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        data["conflicts"] = [
            Conflict(
                source_a=ConflictSource(c["source_a"]),
                source_b=ConflictSource(c["source_b"]),
                field_name=c["field_name"],
                value_a=c["value_a"],
                value_b=c["value_b"],
                severity=ConflictSeverity(c["severity"]),
                resolution=c.get("resolution", ""),
            )
            for c in data.get("conflicts", [])
        ]
        data["deductions"] = [DeductionItem(**d) for d in data.get("deductions", [])]
        data["quarantined_items"] = [
            DeductionItem(**d) for d in data.get("quarantined_items", [])
        ]
        return cls(**data)
