"""核心数据模型"""
from datetime import datetime, date
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator


class InvoiceStatus(str, Enum):
    """发票状态"""
    DRAFT = "draft"
    VERIFIED = "verified"
    REJECTED = "rejected"
    PENDING = "pending"


class ConfirmationStatus(str, Enum):
    """买方确认状态"""
    CONFIRMED = "confirmed"
    REVOKED = "revoked"
    PENDING = "pending"


class OccupationStatus(str, Enum):
    """额度占用状态"""
    LOCKED = "locked"
    OCCUPIED = "occupied"
    RELEASED = "released"
    PARTIAL = "partial"


class WriteOffStatus(str, Enum):
    """核销状态"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    PARTIAL = "partial"
    ROLLED_BACK = "rolled_back"


class RiskType(str, Enum):
    """风险类型"""
    DUPLICATE_PLEDGE = "duplicate_pledge"
    PARTIAL_WRITE_OFF = "partial_write_off"
    BUYER_REVOKED = "buyer_revoked"
    EXCEED_CREDIT = "exceed_credit"
    INVOICE_INVALID = "invoice_invalid"


class DataSource(str, Enum):
    """数据来源"""
    INVOICE_SYSTEM = "invoice_system"
    BUYER_CONFIRM = "buyer_confirm"
    CREDIT_POOL = "credit_pool"
    REPAYMENT_FLOW = "repayment_flow"
    WRITE_OFF_APPLY = "write_off_apply"
    OCCUPATION_REPORT = "occupation_report"
    MANUAL_CORRECTION = "manual_correction"


class BaseEntity(BaseModel):
    """基础实体"""
    id: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    source: DataSource
    created_by: Optional[str] = None


class CorrectionTrace(BaseModel):
    """修正痕迹"""
    trace_id: str
    field_name: str
    old_value: Any
    new_value: Any
    operator: str
    operated_at: datetime = Field(default_factory=datetime.now)
    reason: str
    source: DataSource


class Invoice(BaseEntity):
    """发票"""
    invoice_no: str
    invoice_code: str
    amount: float
    invoice_date: date
    buyer_name: str
    seller_name: str
    status: InvoiceStatus = InvoiceStatus.PENDING
    verified_at: Optional[datetime] = None
    verified_by: Optional[str] = None
    verification_note: Optional[str] = None
    corrections: List[CorrectionTrace] = Field(default_factory=list)


class BuyerConfirmation(BaseEntity):
    """买方确认"""
    invoice_id: str
    buyer_name: str
    confirmed_amount: float
    status: ConfirmationStatus = ConfirmationStatus.PENDING
    confirmed_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    revoker: Optional[str] = None
    revocation_reason: Optional[str] = None
    corrections: List[CorrectionTrace] = Field(default_factory=list)


class CreditPool(BaseEntity):
    """额度池"""
    pool_id: str
    pool_name: str
    total_credit: float
    used_credit: float = 0.0
    frozen_credit: float = 0.0
    effective_date: date
    expire_date: date
    corrections: List[CorrectionTrace] = Field(default_factory=list)

    @property
    def available_credit(self) -> float:
        return self.total_credit - self.used_credit - self.frozen_credit


class RepaymentFlow(BaseEntity):
    """回款流水"""
    flow_no: str
    invoice_id: str
    amount: float
    repayment_date: date
    payer_account: str
    payer_name: str
    corrections: List[CorrectionTrace] = Field(default_factory=list)


class WriteOffApplication(BaseEntity):
    """核销申请"""
    apply_no: str
    invoice_id: str
    amount: float
    apply_date: date
    status: WriteOffStatus = WriteOffStatus.PENDING
    approved_amount: Optional[float] = None
    approved_at: Optional[datetime] = None
    approver: Optional[str] = None
    rejection_reason: Optional[str] = None
    corrections: List[CorrectionTrace] = Field(default_factory=list)


class OccupationRecord(BaseEntity):
    """额度占用记录"""
    occupation_no: str
    invoice_id: str
    amount: float
    status: OccupationStatus = OccupationStatus.LOCKED
    locked_at: datetime = Field(default_factory=datetime.now)
    occupied_at: Optional[datetime] = None
    released_at: Optional[datetime] = None
    release_reason: Optional[str] = None
    corrections: List[CorrectionTrace] = Field(default_factory=list)


class RiskAlert(BaseModel):
    """风险提示"""
    alert_id: str
    risk_type: RiskType
    severity: str
    invoice_id: str
    invoice_no: str
    message: str
    details: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.now)


class ProcessingStatus(str, Enum):
    """处理状态"""
    UNPROCESSED = "unprocessed"
    CORRECTED = "corrected"
    NEED_MANUAL = "need_manual"
    NORMAL = "normal"


class InvoiceProcessingResult(BaseModel):
    """发票处理结果"""
    invoice_id: str
    invoice_no: str
    status: ProcessingStatus
    occupied_amount: float = 0.0
    available_amount: float = 0.0
    risk_alerts: List[RiskAlert] = Field(default_factory=list)
    corrections: List[CorrectionTrace] = Field(default_factory=list)
    notes: List[str] = Field(default_factory=list)


class ProcessingSummary(BaseModel):
    """处理汇总"""
    total_invoices: int = 0
    total_amount: float = 0.0
    unprocessed_count: int = 0
    unprocessed_amount: float = 0.0
    corrected_count: int = 0
    corrected_amount: float = 0.0
    need_manual_count: int = 0
    need_manual_amount: float = 0.0
    normal_count: int = 0
    normal_amount: float = 0.0
    total_risk_alerts: int = 0
    risk_breakdown: Dict[str, int] = Field(default_factory=dict)
