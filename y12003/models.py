from dataclasses import dataclass, field
from datetime import datetime, date
from typing import Optional, List, Dict
from enum import Enum


class CreditStatus(str, Enum):
    NORMAL = "正常"
    WARNING = "预警"
    OVERDUE = "逾期"
    FROZEN = "冻结"


class ReturnStatus(str, Enum):
    PENDING = "待处理"
    APPROVED = "已批准"
    REJECTED = "已拒绝"


class TemporaryLimitStatus(str, Enum):
    ACTIVE = "生效中"
    EXPIRED = "已过期"
    CANCELLED = "已取消"


class PaymentMatchStatus(str, Enum):
    MATCHED = "已匹配"
    UNMATCHED = "待认领"
    PARTIAL = "部分匹配"


@dataclass
class Customer:
    customer_id: str
    name: str
    base_credit_limit: float
    current_credit_status: CreditStatus = CreditStatus.NORMAL
    contact: Optional[str] = None
    phone: Optional[str] = None
    remarks: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class SalesOrder:
    order_id: str
    customer_id: str
    order_date: date
    total_amount: float
    credit_amount: float
    paid_amount: float = 0.0
    is_credit_order: bool = True
    product_details: Optional[str] = None
    salesperson: Optional[str] = None
    remarks: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class PaymentRecord:
    payment_id: str
    customer_id: Optional[str]
    payment_date: date
    amount: float
    payment_method: Optional[str] = None
    matched_order_ids: List[str] = field(default_factory=list)
    matched_amount: float = 0.0
    match_status: PaymentMatchStatus = PaymentMatchStatus.UNMATCHED
    remarks: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    
    @property
    def unmatched_amount(self) -> float:
        return self.amount - self.matched_amount


@dataclass
class ReturnOrder:
    return_id: str
    order_id: str
    customer_id: str
    return_date: date
    return_amount: float
    status: ReturnStatus = ReturnStatus.PENDING
    product_details: Optional[str] = None
    remarks: Optional[str] = None
    processed_date: Optional[date] = None
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class TemporaryCreditLimit:
    temp_id: str
    customer_id: str
    amount: float
    effective_date: date
    expiry_date: date
    status: TemporaryLimitStatus = TemporaryLimitStatus.ACTIVE
    reason: Optional[str] = None
    approver: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    
    def is_active(self, check_date: date = None) -> bool:
        check_date = check_date or date.today()
        return (
            self.status == TemporaryLimitStatus.ACTIVE
            and self.effective_date <= check_date <= self.expiry_date
        )


@dataclass
class CreditStatusHistory:
    history_id: str
    customer_id: str
    old_status: CreditStatus
    new_status: CreditStatus
    change_reason: str
    change_date: datetime = field(default_factory=datetime.now)
    operator: Optional[str] = None
