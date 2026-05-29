from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, List, Any
from datetime import date


class CheckType(str, Enum):
    BUDGET = "budget_occupancy"
    INVOICE = "invoice_duplicate"
    CONTRACT = "contract_balance"


class CheckStatus(str, Enum):
    PASS = "PASS"
    WARNING = "WARNING"
    FAIL = "FAIL"


@dataclass
class SourceReference:
    file_name: str
    sheet_name: Optional[str] = None
    row_number: Optional[int] = None
    field_name: Optional[str] = None
    raw_value: Optional[str] = None

    def __str__(self) -> str:
        parts = [self.file_name]
        if self.sheet_name:
            parts.append(f"[{self.sheet_name}]")
        if self.row_number is not None:
            parts.append(f"行{self.row_number}")
        if self.field_name:
            parts.append(f"({self.field_name})")
        if self.raw_value is not None:
            parts.append(f": {self.raw_value}")
        return "".join(parts)


@dataclass
class Budget:
    project_id: str
    project_name: str
    subject_code: str
    subject_name: str
    total_amount: float
    used_amount: float
    source: SourceReference

    @property
    def remaining_amount(self) -> float:
        return self.total_amount - self.used_amount


@dataclass
class Contract:
    contract_id: str
    contract_name: str
    project_id: str
    supplier: str
    total_amount: float
    invoiced_amount: float
    paid_amount: float
    source: SourceReference

    @property
    def remaining_invoice_amount(self) -> float:
        return self.total_amount - self.invoiced_amount

    @property
    def remaining_payable_amount(self) -> float:
        return self.total_amount - self.paid_amount


@dataclass
class Invoice:
    invoice_id: str
    invoice_code: str
    invoice_number: str
    invoice_date: date
    total_amount: float
    supplier: str
    source: SourceReference

    @property
    def unique_key(self) -> str:
        return f"{self.invoice_code}-{self.invoice_number}"


@dataclass
class ReimbursementRecord:
    record_id: str
    project_id: str
    project_name: str
    subject_code: str
    subject_name: str
    invoice_id: str
    contract_id: Optional[str]
    amount: float
    applicant: str
    apply_date: date
    approval_history: List[str] = field(default_factory=list)
    source: SourceReference = field(init=False)


@dataclass
class CheckResult:
    check_type: CheckType
    status: CheckStatus
    message: str
    record_id: str
    subject_code: str
    amount: float
    source_refs: List[SourceReference] = field(default_factory=list)
    details: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "check_type": self.check_type.value,
            "status": self.status.value,
            "message": self.message,
            "record_id": self.record_id,
            "subject_code": self.subject_code,
            "amount": self.amount,
            "sources": [str(s) for s in self.source_refs],
            "details": self.details,
        }
