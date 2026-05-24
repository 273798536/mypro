from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any, List
from uuid import uuid4


class RecordSource(Enum):
    BORROW_APPLICATION = "借阅申请"
    EXPRESS_ORDER = "快递单"
    COMPENSATION = "读者赔偿记录"
    CUSTOMER_NOTE = "客服备注"


class RecordStatus(Enum):
    PENDING = "待处理"
    IMPORTED = "已导入"
    CHECKING = "校验中"
    CHECK_PASSED = "校验通过"
    CHECK_FAILED = "校验失败"
    FIXING = "修正中"
    FIXED = "已修正"
    RECALCULATING = "重算中"
    RECALCULATED = "已重算"
    EXPORTED = "已导出"


class IssueType(Enum):
    DUPLICATE = "重复记录"
    MISSING_DATA = "缺失数据"
    FEE_MISMATCH = "费用不匹配"
    STATUS_CONFLICT = "状态冲突"
    DATE_ERROR = "日期错误"
    OVERDUE = "逾期"
    DAMAGED = "污损"
    RENEW_OVERLAP = "续借重叠"
    INVALID_AMOUNT = "金额无效"


@dataclass
class ChangeRecord:
    id: str
    record_id: str
    field_name: str
    old_value: Any
    new_value: Any
    operator: str
    reason: str
    timestamp: datetime = field(default_factory=datetime.now)

    @classmethod
    def create(cls, record_id: str, field_name: str, old_value: Any, new_value: Any,
               operator: str, reason: str) -> 'ChangeRecord':
        return cls(
            id=str(uuid4()),
            record_id=record_id,
            field_name=field_name,
            old_value=old_value,
            new_value=new_value,
            operator=operator,
            reason=reason
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "record_id": self.record_id,
            "field_name": self.field_name,
            "old_value": self.old_value,
            "new_value": self.new_value,
            "operator": self.operator,
            "reason": self.reason,
            "timestamp": self.timestamp.isoformat()
        }


@dataclass
class LoanRecord:
    id: str
    source: RecordSource
    original_row: int
    original_file: str
    book_title: str
    borrower_name: str
    borrower_id: str
    library_from: str
    library_to: str
    apply_date: Optional[datetime] = None
    receive_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    return_date: Optional[datetime] = None
    express_fee: float = 0.0
    compensation_fee: float = 0.0
    overdue_fee: float = 0.0
    damage_fee: float = 0.0
    total_fee: float = 0.0
    status: RecordStatus = RecordStatus.PENDING
    is_overdue: bool = False
    is_damaged: bool = False
    renew_count: int = 0
    customer_notes: str = ""
    issues: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

    @classmethod
    def create(cls, source: RecordSource, original_row: int, original_file: str,
               book_title: str, borrower_name: str, borrower_id: str,
               library_from: str, library_to: str, **kwargs) -> 'LoanRecord':
        record = cls(
            id=str(uuid4()),
            source=source,
            original_row=original_row,
            original_file=original_file,
            book_title=book_title,
            borrower_name=borrower_name,
            borrower_id=borrower_id,
            library_from=library_from,
            library_to=library_to
        )
        for key, value in kwargs.items():
            if hasattr(record, key):
                setattr(record, key, value)
        return record

    def calculate_total_fee(self) -> float:
        self.total_fee = self.express_fee + self.compensation_fee + \
            self.overdue_fee + self.damage_fee
        self.updated_at = datetime.now()
        return self.total_fee

    def add_issue(self, issue: str) -> None:
        if issue not in self.issues:
            self.issues.append(issue)

    def clear_issues(self) -> None:
        self.issues = []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "source": self.source.value,
            "original_row": self.original_row,
            "original_file": self.original_file,
            "book_title": self.book_title,
            "borrower_name": self.borrower_name,
            "borrower_id": self.borrower_id,
            "library_from": self.library_from,
            "library_to": self.library_to,
            "apply_date": self.apply_date.isoformat() if self.apply_date else None,
            "receive_date": self.receive_date.isoformat() if self.receive_date else None,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "return_date": self.return_date.isoformat() if self.return_date else None,
            "express_fee": self.express_fee,
            "compensation_fee": self.compensation_fee,
            "overdue_fee": self.overdue_fee,
            "damage_fee": self.damage_fee,
            "total_fee": self.total_fee,
            "status": self.status.value,
            "is_overdue": self.is_overdue,
            "is_damaged": self.is_damaged,
            "renew_count": self.renew_count,
            "customer_notes": self.customer_notes,
            "issues": self.issues,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }


@dataclass
class CheckResult:
    record_id: str
    check_name: str
    passed: bool
    message: str
    details: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "record_id": self.record_id,
            "check_name": self.check_name,
            "passed": self.passed,
            "message": self.message,
            "details": self.details
        }


@dataclass
class ReportSummary:
    total_records: int = 0
    valid_records: int = 0
    invalid_records: int = 0
    total_express_fee: float = 0.0
    total_compensation_fee: float = 0.0
    total_overdue_fee: float = 0.0
    total_damage_fee: float = 0.0
    total_fee: float = 0.0
    by_source: Dict[str, int] = field(default_factory=dict)
    by_status: Dict[str, int] = field(default_factory=dict)
    issue_counts: Dict[str, int] = field(default_factory=dict)
