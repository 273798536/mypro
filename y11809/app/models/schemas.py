from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class RefundStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    BLOCKED = "blocked"


class ReviewStatus(str, Enum):
    PENDING = "pending"
    REVIEWED = "reviewed"
    FINALIZED = "finalized"


class StudentCardBase(BaseModel):
    card_no: str
    student_id: Optional[str] = None
    student_name: Optional[str] = None
    department: Optional[str] = None
    remark: Optional[str] = None


class StudentCardCreate(StudentCardBase):
    pass


class StudentCardUpdate(BaseModel):
    student_name: Optional[str] = None
    department: Optional[str] = None
    status: Optional[str] = None
    remark: Optional[str] = None


class StudentCardBalance(BaseModel):
    card_no: str
    student_name: Optional[str] = None
    total_balance: float
    subsidy_balance: float
    recharge_balance: float
    revoke_balance: float
    is_merged: bool
    merged_from: Optional[str] = None
    merged_to: Optional[str] = None


class StudentCardResponse(StudentCardBase):
    id: int
    status: str
    total_balance: float
    subsidy_balance: float
    recharge_balance: float
    revoke_balance: float
    is_merged: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RechargeRecordBase(BaseModel):
    card_no: str
    recharge_no: str
    recharge_type: Optional[str] = None
    amount: float
    subsidy_amount: Optional[float] = 0.0
    self_amount: Optional[float] = 0.0
    subsidy_rule_code: Optional[str] = None
    is_subsidy: Optional[bool] = False
    is_refundable: Optional[bool] = True
    recharge_time: Optional[datetime] = None
    operator: Optional[str] = None
    window_no: Optional[str] = None
    remark: Optional[str] = None


class RechargeRecordCreate(RechargeRecordBase):
    pass


class RechargeRecordUpdate(BaseModel):
    amount: Optional[float] = None
    subsidy_amount: Optional[float] = None
    self_amount: Optional[float] = None
    is_refundable: Optional[bool] = None
    remark: Optional[str] = None
    operator: Optional[str] = None


class RechargeAmendmentRequest(BaseModel):
    recharge_id: int
    new_amount: Optional[float] = None
    new_subsidy_amount: Optional[float] = None
    new_self_amount: Optional[float] = None
    new_is_refundable: Optional[bool] = None
    new_remark: Optional[str] = None
    amend_reason: str
    operator: str


class AmendmentCompareResponse(BaseModel):
    recharge_id: int
    recharge_no: str
    old_values: Dict[str, Any]
    new_values: Dict[str, Any]
    old_refund_result: Optional[Dict[str, Any]] = None
    new_refund_result: Optional[Dict[str, Any]] = None
    amend_reason: str
    operator: str
    created_at: datetime


class ConsumeRevokeBase(BaseModel):
    card_no: str
    revoke_no: str
    original_consume_no: Optional[str] = None
    amount: float
    consume_time: Optional[datetime] = None
    revoke_time: Optional[datetime] = None
    operator: Optional[str] = None
    window_no: Optional[str] = None
    remark: Optional[str] = None


class ConsumeRevokeCreate(ConsumeRevokeBase):
    pass


class SubsidyRuleBase(BaseModel):
    rule_code: str
    rule_name: Optional[str] = None
    subsidy_type: Optional[str] = None
    is_refundable: bool = True
    effective_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    department: Optional[str] = None
    student_level: Optional[str] = None
    remark: Optional[str] = None


class SubsidyRuleCreate(SubsidyRuleBase):
    pass


class BatchImportItem(BaseModel):
    row_data: Dict[str, Any]
    row_number: int


class BatchImportRequest(BaseModel):
    import_type: str
    items: List[BatchImportItem]
    operator: str


class BatchImportResult(BaseModel):
    batch_no: str
    total_count: int
    success_count: int
    failed_count: int
    skipped_count: int
    failed_items: List[Dict[str, Any]]
    skipped_items: List[Dict[str, Any]]


class RefundCalculateRequest(BaseModel):
    card_nos: List[str]
    operator: str


class RefundDetailItem(BaseModel):
    item_type: str
    item_no: str
    amount: float
    is_blocked: bool
    block_reason: Optional[str] = None


class RefundResult(BaseModel):
    card_no: str
    student_name: Optional[str] = None
    total_refund: float
    subsidy_refund: float
    recharge_refund: float
    revoke_refund: float
    blocked_subsidy: float
    has_blocked_subsidy: bool
    has_cross_day_revoke: bool
    has_merged_card: bool
    status: str
    details: List[RefundDetailItem]
    refund_no: str


class BatchRefundResponse(BaseModel):
    batch_no: str
    total_count: int
    success_count: int
    failed_count: int
    results: List[RefundResult]
    failed_cards: List[Dict[str, Any]]


class BalanceLayerQuery(BaseModel):
    card_no: Optional[str] = None
    department: Optional[str] = None
    min_total_balance: Optional[float] = None
    has_blocked_subsidy: Optional[bool] = None
    has_cross_day_revoke: Optional[bool] = None
    has_merged_card: Optional[bool] = None


class RefundRuleMatchRequest(BaseModel):
    card_no: str


class RefundRuleMatchResponse(BaseModel):
    card_no: str
    student_name: Optional[str] = None
    refundable_amount: float
    blocked_amount: float
    block_reasons: List[str]
    warnings: List[str]
    applicable_rules: List[Dict[str, Any]]


class BatchReviewRequest(BaseModel):
    batch_no: str
    refund_nos: List[str]
    action: str
    reviewer: str
    remark: Optional[str] = None


class BatchReviewResponse(BaseModel):
    batch_no: str
    reviewed_count: int
    approved_count: int
    rejected_count: int


class ExportReportRequest(BaseModel):
    report_type: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    batch_no: Optional[str] = None
    include_blocked: Optional[bool] = True
    include_cross_day: Optional[bool] = True
    include_merged: Optional[bool] = True


class ReportRow(BaseModel):
    card_no: str
    student_name: Optional[str] = None
    department: Optional[str] = None
    total_balance: float
    refundable_amount: float
    blocked_amount: float
    has_blocked_subsidy: bool
    has_cross_day_revoke: bool
    has_merged_card: bool
    status: str
    review_status: str


class RefundRecordResponse(BaseModel):
    id: int
    card_no: str
    refund_batch_no: str
    refund_no: str
    total_refund: float
    subsidy_refund: float
    recharge_refund: float
    revoke_refund: float
    blocked_subsidy: float
    has_blocked_subsidy: bool
    has_cross_day_revoke: bool
    has_merged_card: bool
    status: str
    review_status: str
    refund_time: datetime
    operator: Optional[str] = None
    reviewer: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    database: str
    timestamp: datetime
