from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models import (
    UserRole, CompensationStatus, IssueType, 
    RetryCategory, DataSource
)


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class UserBase(BaseModel):
    username: str
    full_name: str
    role: UserRole
    city: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LeaderRefundBase(BaseModel):
    refund_no: str
    order_no: str
    leader_id: str
    leader_name: str
    city: str
    refund_amount: float
    compensation_amount: float = 0
    issue_type: IssueType
    remark: Optional[str] = None
    submitted_at: datetime


class LeaderRefundCreate(LeaderRefundBase):
    pass


class LeaderRefundResponse(LeaderRefundBase):
    id: int
    is_verified: bool
    verified_by: Optional[int] = None
    verified_at: Optional[datetime] = None
    source: DataSource
    batch_no: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WarehouseReviewBase(BaseModel):
    review_no: str
    order_no: str
    sku_code: str
    sku_name: str
    city: str
    shortage_qty: int = 0
    damaged_qty: int = 0
    unit_price: float
    compensation_amount: float = 0
    issue_type: IssueType
    reviewer_id: str
    reviewed_at: datetime
    images: Optional[List[str]] = None


class WarehouseReviewCreate(WarehouseReviewBase):
    pass


class WarehouseReviewResponse(WarehouseReviewBase):
    id: int
    is_verified: bool
    verified_by: Optional[int] = None
    verified_at: Optional[datetime] = None
    source: DataSource
    batch_no: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserRemarkBase(BaseModel):
    remark_no: str
    order_no: str
    user_id: str
    user_name: str
    city: str
    content: str
    issue_type: IssueType
    compensation_amount: float = 0
    submitted_at: datetime


class UserRemarkCreate(UserRemarkBase):
    pass


class UserRemarkResponse(UserRemarkBase):
    id: int
    is_verified: bool
    verified_by: Optional[int] = None
    verified_at: Optional[datetime] = None
    source: DataSource
    batch_no: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ManualPriceAdjustBase(BaseModel):
    adjust_no: str
    order_no: str
    city: str
    original_price: float
    adjusted_price: float
    price_diff: float
    compensation_amount: float = 0
    reason: str
    operator_id: str
    operated_at: datetime


class ManualPriceAdjustCreate(ManualPriceAdjustBase):
    pass


class ManualPriceAdjustResponse(ManualPriceAdjustBase):
    id: int
    is_verified: bool
    verified_by: Optional[int] = None
    verified_at: Optional[datetime] = None
    source: DataSource
    batch_no: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CompensationQueueBase(BaseModel):
    queue_no: str
    order_no: str
    city: str
    source_type: DataSource
    source_id: int
    source_table: str
    issue_type: IssueType
    compensation_amount: float
    max_retries: int = 3


class CompensationQueueCreate(CompensationQueueBase):
    pass


class CompensationQueueResponse(CompensationQueueBase):
    id: int
    actual_compensation: float = 0
    status: CompensationStatus
    retry_count: int = 0
    retry_category: Optional[RetryCategory] = None
    last_retry_at: Optional[datetime] = None
    next_retry_at: Optional[datetime] = None
    assigned_to: Optional[int] = None
    completed_at: Optional[datetime] = None
    closed_by: Optional[int] = None
    closed_at: Optional[datetime] = None
    close_reason: Optional[str] = None
    external_receipt_id: Optional[str] = None
    external_receipt_status: Optional[str] = None
    batch_no: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RetryLogResponse(BaseModel):
    id: int
    queue_id: int
    retry_number: int
    status_before: str
    status_after: str
    action: str
    error_message: Optional[str] = None
    response_data: Optional[Dict[str, Any]] = None
    operator_id: Optional[int] = None
    operator_name: Optional[str] = None
    diff_data: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class FailedRecordResponse(BaseModel):
    id: int
    source_type: DataSource
    source_table: str
    source_data: Dict[str, Any]
    batch_no: Optional[str] = None
    error_type: str
    error_message: str
    city: Optional[str] = None
    is_resolved: bool
    resolved_by: Optional[int] = None
    resolved_at: Optional[datetime] = None
    resolution_note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ImportBatchResponse(BaseModel):
    id: int
    batch_no: str
    file_name: str
    source_type: DataSource
    total_count: int
    success_count: int
    failed_count: int
    imported_by: Optional[int] = None
    imported_at: datetime
    city: Optional[str] = None
    is_historical: bool = False

    class Config:
        from_attributes = True


class OperationLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    action: str
    table_name: Optional[str] = None
    record_id: Optional[int] = None
    field_name: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    diff_data: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ExternalReceiptSubmit(BaseModel):
    queue_id: int
    receipt_id: str
    receipt_status: str
    receipt_data: Optional[Dict[str, Any]] = None


class ManualTakeoverRequest(BaseModel):
    queue_id: int
    reason: str


class CompensationCloseRequest(BaseModel):
    queue_id: int
    close_reason: str


class RetryRequest(BaseModel):
    queue_id: int
    force: bool = False


class VerifyRequest(BaseModel):
    record_id: int
    verified: bool = True


class ReportSummary(BaseModel):
    city: str
    total_count: int
    completed_count: int
    pending_count: int
    failed_count: int
    dead_letter_count: int
    total_amount: float
    completed_amount: float
    pending_amount: float


class RetryCategoryReport(BaseModel):
    category: str
    count: int
    amount: float
    percentage: float


class DeadLetterReport(BaseModel):
    reason: str
    count: int
    amount: float
    avg_retry_count: float
