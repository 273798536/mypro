from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from enum import Enum


class PaymentStatus(str, Enum):
    PENDING = "待核实"
    MATCHED = "已匹配"
    DISPUTED = "有争议"
    NEED_VOUCHER = "待补凭证"
    RELEASED = "可放行"
    NEED_SUPPLEMENT = "需补材料"
    DUPLICATE = "重复认领"


class ChangeSource(str, Enum):
    AUTO_REPLAY = "系统自动回放"
    MANUAL_ADJUST = "人工改判"
    VOUCHER_ARRIVED = "凭证到账"
    SUPPLEMENT_UPLOAD = "补充材料上传"
    REMARK_ADD = "备注补充"


class HistoryEntry(BaseModel):
    id: str
    timestamp: datetime = Field(default_factory=datetime.now)
    source: ChangeSource
    operator: str = Field(default="系统")
    old_status: Optional[PaymentStatus] = None
    new_status: PaymentStatus
    old_amount: Optional[float] = None
    new_amount: Optional[float] = None
    remark: Optional[str] = None
    screenshot_ref: Optional[str] = None
    detail: Optional[str] = None


class AdvancePayment(BaseModel):
    id: str
    batch_id: str
    payment_no: str
    supplier_name: str
    amount: float
    currency: str = "CNY"
    business_date: str
    current_status: PaymentStatus = PaymentStatus.PENDING
    current_remark: Optional[str] = None
    voucher_no: Optional[str] = None
    voucher_arrived: bool = False
    recon_caliber: Optional[str] = None
    claimed_by: List[str] = Field(default_factory=list)
    history: List[HistoryEntry] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class ReplayResult(BaseModel):
    payment_id: str
    payment_no: str
    supplier_name: str
    previous_status: PaymentStatus
    new_status: PaymentStatus
    action_needed: Optional[str] = None
    is_status_changed: bool


class BatchReplaySummary(BaseModel):
    batch_id: str
    total_count: int
    changed_count: int
    released_count: int
    need_supplement_count: int
    disputed_count: int
    replay_time: datetime
