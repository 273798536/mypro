from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from enum import Enum
from typing import Any


class FindingStatus(Enum):
    UNHANDLED = "未处理"
    CORRECTED = "已修正"
    MANUAL_REVIEW = "需人工确认"


class FindingSeverity(Enum):
    LOW = "低"
    MEDIUM = "中"
    HIGH = "高"
    CRITICAL = "严重"


@dataclass
class Source:
    file: str
    sheet: str = ""
    line_no: int = 0

    def __str__(self) -> str:
        return f"{self.file}:{self.sheet}:L{self.line_no}"


@dataclass
class AuditFinding:
    rule_id: str
    rule_name: str
    severity: FindingSeverity
    description: str
    sources: list[Source]
    data_refs: dict[str, Any] = field(default_factory=dict)
    status: FindingStatus = FindingStatus.UNHANDLED
    correction_note: str = ""


@dataclass
class Reimbursement:
    reimburse_id: str
    applicant: str
    amount: float
    project_code: str
    submit_date: date
    approver: str
    source: Source

    def key(self) -> str:
        return self.reimburse_id


@dataclass
class Invoice:
    invoice_no: str
    invoice_date: date
    amount: float
    reimburse_id: str
    source: Source

    def key(self) -> str:
        return self.invoice_no


@dataclass
class Loan:
    loan_id: str
    borrower: str
    amount: float
    loan_date: date
    settle_date: date | None
    reimburse_id: str
    source: Source

    def key(self) -> str:
        return self.loan_id

    @property
    def is_settled(self) -> bool:
        return self.settle_date is not None


@dataclass
class Project:
    code: str
    name: str
    manager: str
    budget: float
    source: Source

    def key(self) -> str:
        return self.code


@dataclass
class Approver:
    name: str
    level: int
    max_amount: float
    source: Source

    def key(self) -> str:
        return self.name


@dataclass
class SpotCheckReport:
    report_id: str
    sample_ids: list[str]
    findings: str
    source: Source

    def key(self) -> str:
        return self.report_id


@dataclass
class AuditResult:
    reimbursements: list[Reimbursement]
    invoices: list[Invoice]
    loans: list[Loan]
    projects: list[Project]
    approvers: list[Approver]
    spot_check_reports: list[SpotCheckReport]
    findings: list[AuditFinding]
    risk_score: float = 0.0
