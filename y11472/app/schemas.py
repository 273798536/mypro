from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any
from app.enums import (
    ReturnApplicationStatus,
    CompensationStatus,
    RetryStrategy,
    ReceiptSource,
    DisputeCategory,
    UserRole,
    OperationType,
)


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None
    role: Optional[UserRole] = None


class UserBase(BaseModel):
    username: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: UserRole


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ReturnItemBase(BaseModel):
    sku_code: str
    sku_name: Optional[str] = None
    batch_no: Optional[str] = None
    quantity: int
    unit_price: float = 0.0
    amount: float = 0.0


class ReturnItemCreate(ReturnItemBase):
    pass


class ReturnItem(ReturnItemBase):
    id: int
    application_id: int
    supplier_accepted_qty: int = 0
    supplier_rejected_qty: int = 0
    disputed_qty: int = 0
    dispute_category: Optional[DisputeCategory] = None
    dispute_reason: Optional[str] = None
    compensation_amount: float = 0.0
    compensation_status: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ReturnApplicationBase(BaseModel):
    supplier_id: str
    supplier_name: Optional[str] = None
    warehouse_id: Optional[str] = None
    description: Optional[str] = None


class ReturnApplicationCreate(ReturnApplicationBase):
    items: List[ReturnItemCreate] = []


class ReturnApplicationUpdate(BaseModel):
    supplier_name: Optional[str] = None
    warehouse_id: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ReturnApplicationStatus] = None


class ReturnApplication(ReturnApplicationBase):
    id: int
    application_no: str
    total_items: int = 0
    total_amount: float = 0.0
    status: ReturnApplicationStatus
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    items: List[ReturnItem] = []

    class Config:
        from_attributes = True


class QualityRecordBase(BaseModel):
    application_id: int
    item_id: Optional[int] = None
    inspection_result: str
    defect_description: Optional[str] = None
    photo_urls: Optional[List[str]] = None


class QualityRecordCreate(QualityRecordBase):
    pass


class QualityRecord(QualityRecordBase):
    id: int
    record_no: str
    inspector_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class LogisticsRecordBase(BaseModel):
    application_id: int
    tracking_no: str
    carrier: Optional[str] = None
    shipment_date: Optional[datetime] = None
    delivery_date: Optional[datetime] = None
    weight: Optional[float] = None
    package_count: int = 1
    signed_by: Optional[str] = None
    receipt_photo_url: Optional[str] = None
    status: Optional[str] = None


class LogisticsRecordCreate(LogisticsRecordBase):
    pass


class LogisticsRecord(LogisticsRecordBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ExternalReceiptBase(BaseModel):
    application_id: int
    source: ReceiptSource = ReceiptSource.EXTERNAL_RECEIPT
    supplier_id: Optional[str] = None
    confirmed_items: Optional[List[Dict[str, Any]]] = None
    disputed_items: Optional[List[Dict[str, Any]]] = None
    total_confirmed_qty: int = 0
    total_disputed_qty: int = 0
    confirmation_date: Optional[datetime] = None
    received_by: Optional[str] = None
    notes: Optional[str] = None
    raw_data: Optional[Dict[str, Any]] = None
    import_batch_no: Optional[str] = None


class ExternalReceiptCreate(ExternalReceiptBase):
    retry_strategy: RetryStrategy = RetryStrategy.APPEND


class ExternalReceipt(ExternalReceiptBase):
    id: int
    receipt_no: str
    created_at: datetime
    created_by: Optional[int] = None

    class Config:
        from_attributes = True


class RetryHistoryBase(BaseModel):
    queue_id: int
    attempt_no: int
    status: str
    error_message: Optional[str] = None
    processed_items: Optional[List[Dict[str, Any]]] = None
    failed_items: Optional[List[Dict[str, Any]]] = None


class RetryHistory(RetryHistoryBase):
    id: int
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CompensationQueueBase(BaseModel):
    application_id: int
    source_receipt_id: Optional[int] = None
    max_retries: int = 3


class CompensationQueueCreate(CompensationQueueBase):
    pass


class CompensationQueueUpdate(BaseModel):
    status: Optional[CompensationStatus] = None
    assigned_to: Optional[int] = None


class ManualResolveRequest(BaseModel):
    resolved_items: List[Dict[str, Any]]
    compensation_amount: float
    change_reason: str


class CompensationQueue(CompensationQueueBase):
    id: int
    queue_no: str
    status: CompensationStatus
    retry_count: int = 0
    next_retry_at: Optional[datetime] = None
    last_error: Optional[str] = None
    disputed_items_summary: Optional[Dict[str, Any]] = None
    total_compensation_amount: float = 0.0
    processed_items: Optional[List[Dict[str, Any]]] = None
    failed_items: Optional[List[Dict[str, Any]]] = None
    is_frozen: bool = False
    frozen_until: Optional[datetime] = None
    freeze_reason: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    retry_history: List[RetryHistory] = []

    class Config:
        from_attributes = True


class AuditLogBase(BaseModel):
    operation_type: OperationType
    change_reason: Optional[str] = None
    field_changes: Optional[Dict[str, Any]] = None


class AuditLog(AuditLogBase):
    id: int
    application_id: Optional[int] = None
    queue_id: Optional[int] = None
    operator_id: Optional[int] = None
    operator_name: Optional[str] = None
    old_status: Optional[str] = None
    new_status: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class FreezeRequest(BaseModel):
    hours: int = 24
    reason: str


class QueueStats(BaseModel):
    total_count: int
    pending_count: int
    queued_count: int
    processing_count: int
    retrying_count: int
    partial_success_count: int
    success_count: int
    failed_count: int
    dead_letter_count: int
    manual_review_count: int
    manual_resolved_count: int
    compensated_count: int
    closed_count: int
    frozen_count: int


class RetryableCategory(BaseModel):
    category: str
    count: int
    items: List[Dict[str, Any]]


class DeadLetterAnalysis(BaseModel):
    total_dead_letters: int
    by_error_type: Dict[str, int]
    by_supplier: Dict[str, int]
    eligible_for_recovery: int


class SystemCheckResult(BaseModel):
    check_name: str
    status: str
    message: str
    details: Optional[Dict[str, Any]] = None
    checked_at: datetime
