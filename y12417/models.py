from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Optional, List, Dict, Any
from enum import Enum


class ContractStatus(Enum):
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    EXTENDED = "EXTENDED"
    RETURNED = "RETURNED"


class ExceptionType(Enum):
    CROSS_DAY_RETURN = "CROSS_DAY_RETURN"
    RATE_EXPIRED = "RATE_EXPIRED"
    EXTENSION_MISSED = "EXTENSION_MISSED"
    RATE_MISSING = "RATE_MISSING"
    ACCOUNT_NAME_CHANGED = "ACCOUNT_NAME_CHANGED"
    DATA_INCOMPLETE = "DATA_INCOMPLETE"


@dataclass
class CustomerAccount:
    account_id: str
    account_name: str
    previous_names: List[str] = field(default_factory=list)
    is_active: bool = True
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class FeeRateVersion:
    version_id: str
    security_code: str
    rate: float
    effective_date: date
    expiry_date: Optional[date] = None
    is_active: bool = True
    created_at: datetime = field(default_factory=datetime.now)
    created_by: str = "system"


@dataclass
class FeeRate:
    security_code: str
    security_name: str
    versions: List[FeeRateVersion] = field(default_factory=list)


@dataclass
class StockLoanContract:
    contract_id: str
    account_id: str
    account_name: str
    security_code: str
    security_name: str
    quantity: int
    loan_date: date
    due_date: date
    return_date: Optional[date] = None
    actual_return_date: Optional[date] = None
    is_extended: bool = False
    extension_count: int = 0
    original_due_date: Optional[date] = None
    remarks: str = ""
    status: ContractStatus = ContractStatus.ACTIVE
    created_at: datetime = field(default_factory=datetime.now)
    imported_from: str = ""
    raw_data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class DailySettlementItem:
    settlement_id: str
    contract_id: str
    account_id: str
    account_name: str
    security_code: str
    security_name: str
    quantity: int
    settlement_date: date
    rate_version_id: str
    rate: float
    days: int
    base_fee: float
    extension_fee: float = 0.0
    cross_day_adjustment: float = 0.0
    total_fee: float = 0.0
    calculation_details: str = ""
    exceptions: List["SettlementException"] = field(default_factory=list)


@dataclass
class SettlementException:
    exception_id: str
    exception_type: ExceptionType
    severity: str
    title: str
    description: str
    suggestion: str
    related_contract_id: Optional[str] = None
    related_security_code: Optional[str] = None
    related_account_id: Optional[str] = None
    related_date: Optional[date] = None
    source_field: Optional[str] = None


@dataclass
class DailySettlementReport:
    report_id: str
    settlement_date: date
    total_contracts: int = 0
    total_fee: float = 0.0
    items: List[DailySettlementItem] = field(default_factory=list)
    exceptions: List[SettlementException] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    generated_by: str = "system"


@dataclass
class ImportResult:
    success: bool
    total_records: int = 0
    imported_records: int = 0
    failed_records: int = 0
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
