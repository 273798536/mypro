from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Any
from enum import Enum


class StatementType(str, Enum):
    BALANCE_SHEET = "balance_sheet"
    INCOME_STATEMENT = "income_statement"
    CASH_FLOW = "cash_flow"


class Severity(str, Enum):
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


@dataclass
class Account:
    code: str
    name: str
    statement_type: StatementType
    category: str
    balance: float = 0.0
    opening_balance: Optional[float] = None


@dataclass
class AccountMapping:
    source_account: str
    target_account: str
    mapping_type: str = "direct"
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class AdjustmentEntry:
    id: str
    date: str
    description: str
    debit_account: str
    credit_account: str
    amount: float
    source: str = "manual"
    is_applied: bool = False
    created_at: datetime = field(default_factory=datetime.now)
    applied_at: Optional[datetime] = None


@dataclass
class FinancialStatement:
    type: StatementType
    period: str
    accounts: Dict[str, Account] = field(default_factory=dict)
    raw_data: Any = None
    source_file: str = ""


@dataclass
class Anomaly:
    id: str
    type: str
    severity: Severity
    message: str
    details: Dict[str, Any] = field(default_factory=dict)
    accounts: List[str] = field(default_factory=list)
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class CheckResult:
    rule_name: str
    passed: bool
    message: str
    details: Dict[str, Any] = field(default_factory=dict)
    anomalies: List[Anomaly] = field(default_factory=list)


@dataclass
class RunHistory:
    run_id: str
    timestamp: datetime
    input_dir: str
    output_dir: str
    anomalies_count: Dict[str, int] = field(default_factory=dict)
    adjustments_applied: int = 0
    status: str = "completed"
