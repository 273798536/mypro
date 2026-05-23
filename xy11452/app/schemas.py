from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from app.models import QueueStatus, RetryCategory, OperationType, ConflictStrategy


class OutboundOrderCreate(BaseModel):
    order_no: str
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    rental_start_date: Optional[datetime] = None
    rental_end_date: Optional[datetime] = None
    total_amount: float = 0
    deposit_amount: float = 0
    items: List[Dict[str, Any]] = Field(default_factory=list)


class ReturnPhotoCreate(BaseModel):
    photo_id: str
    photo_url: str
    photo_type: Optional[str] = None
    upload_time: Optional[datetime] = None
    uploader: Optional[str] = None
    description: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class MaintenanceEstimateCreate(BaseModel):
    estimate_no: str
    estimated_amount: float = 0
    parts_cost: float = 0
    labor_cost: float = 0
    other_cost: float = 0
    damage_description: Optional[str] = None
    estimator: Optional[str] = None
    estimated_at: Optional[datetime] = None
    items: List[Dict[str, Any]] = Field(default_factory=list)


class ScanDetailCreate(BaseModel):
    scan_batch_no: str
    item_code: Optional[str] = None
    item_name: Optional[str] = None
    scan_time: Optional[datetime] = None
    scanner: Optional[str] = None
    scan_location: Optional[str] = None
    condition: Optional[str] = None
    quantity: int = 1
    is_damaged: bool = False
    damage_note: Optional[str] = None


class DepositReviewCreate(BaseModel):
    review_no: str
    batch_return_no: Optional[str] = None
    deduction_amount: float = 0
    deduction_reason: Optional[str] = None
    reviewer: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_status: Optional[str] = None
    evidence_chain_complete: bool = False
    review_note: Optional[str] = None


class QueueSubmitRequest(BaseModel):
    idempotency_key: str
    batch_no: str
    conflict_strategy: ConflictStrategy = ConflictStrategy.APPEND
    outbound_order: Optional[OutboundOrderCreate] = None
    return_photos: List[ReturnPhotoCreate] = Field(default_factory=list)
    maintenance_estimate: Optional[MaintenanceEstimateCreate] = None
    scan_details: List[ScanDetailCreate] = Field(default_factory=list)
    deposit_reviews: List[DepositReviewCreate] = Field(default_factory=list)
    operator: str
    operator_ip: Optional[str] = None
    operator_ua: Optional[str] = None


class QueueRetryRequest(BaseModel):
    operator: str
    retry_category: Optional[RetryCategory] = None
    operator_ip: Optional[str] = None
    operator_ua: Optional[str] = None


class ManualDecisionRequest(BaseModel):
    decision: str
    note: Optional[str] = None
    operator: str
    compensation_amount: Optional[float] = None
    actual_deduction: Optional[float] = None
    operator_ip: Optional[str] = None
    operator_ua: Optional[str] = None


class FreezeRequest(BaseModel):
    reason: str
    operator: str
    operator_ip: Optional[str] = None
    operator_ua: Optional[str] = None


class CloseRequest(BaseModel):
    operator: str
    close_note: Optional[str] = None
    operator_ip: Optional[str] = None
    operator_ua: Optional[str] = None


class CancelRequest(BaseModel):
    operator: str
    cancel_reason: Optional[str] = None
    operator_ip: Optional[str] = None
    operator_ua: Optional[str] = None


class OutboundOrderResponse(BaseModel):
    id: int
    order_no: str
    customer_id: Optional[str]
    customer_name: Optional[str]
    total_amount: float
    deposit_amount: float
    received_at: datetime

    class Config:
        from_attributes = True


class ReturnPhotoResponse(BaseModel):
    id: int
    photo_id: str
    photo_url: str
    photo_type: Optional[str]
    upload_time: Optional[datetime]
    uploader: Optional[str]

    class Config:
        from_attributes = True


class MaintenanceEstimateResponse(BaseModel):
    id: int
    estimate_no: str
    estimated_amount: float
    parts_cost: float
    labor_cost: float
    estimator: Optional[str]

    class Config:
        from_attributes = True


class ScanDetailResponse(BaseModel):
    id: int
    scan_batch_no: str
    item_code: Optional[str]
    item_name: Optional[str]
    scan_time: Optional[datetime]
    quantity: int
    is_damaged: bool

    class Config:
        from_attributes = True


class DepositReviewResponse(BaseModel):
    id: int
    review_no: str
    deduction_amount: float
    evidence_chain_complete: bool
    reviewer: Optional[str]

    class Config:
        from_attributes = True


class OperationHistoryResponse(BaseModel):
    id: int
    operation_type: OperationType
    operator: str
    operated_at: datetime
    old_status: Optional[QueueStatus]
    new_status: Optional[QueueStatus]
    change_summary: Dict[str, Any]
    detail: Optional[str]

    class Config:
        from_attributes = True


class QueueDetailResponse(BaseModel):
    id: int
    idempotency_key: str
    batch_no: str
    status: QueueStatus
    retry_category: Optional[RetryCategory]
    retry_count: int
    max_retries: int
    
    outbound_order_id: Optional[str]
    customer_id: Optional[str]
    customer_name: Optional[str]
    
    has_outbound_order: bool
    has_return_photos: bool
    has_maintenance_estimate: bool
    has_scan_details: bool
    has_deposit_review: bool
    
    deposit_amount: float
    compensation_amount: float
    actual_deduction: float
    
    is_frozen: bool
    frozen_at: Optional[datetime]
    frozen_by: Optional[str]
    frozen_reason: Optional[str]
    
    is_manual: bool
    manual_handler: Optional[str]
    manual_decision: Optional[str]
    manual_at: Optional[datetime]
    
    error_message: Optional[str]
    created_by: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    outbound_order: Optional[OutboundOrderResponse] = None
    return_photos: List[ReturnPhotoResponse] = Field(default_factory=list)
    maintenance_estimate: Optional[MaintenanceEstimateResponse] = None
    scan_details: List[ScanDetailResponse] = Field(default_factory=list)
    deposit_reviews: List[DepositReviewResponse] = Field(default_factory=list)
    operation_histories: List[OperationHistoryResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class QueueListResponse(BaseModel):
    id: int
    batch_no: str
    status: QueueStatus
    retry_category: Optional[RetryCategory]
    retry_count: int
    customer_id: Optional[str]
    customer_name: Optional[str]
    deposit_amount: float
    compensation_amount: float
    actual_deduction: float
    is_frozen: bool
    is_manual: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PaginatedResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[QueueListResponse]


class FinanceSummaryResponse(BaseModel):
    total_count: int
    pending_count: int
    success_count: int
    failed_count: int
    manual_count: int
    dead_letter_count: int
    
    total_deposit: float
    total_compensation: float
    total_actual_deduction: float


class DeadLetterRecoveryRequest(BaseModel):
    queue_ids: List[int]
    operator: str
    recovery_note: Optional[str] = None
    operator_ip: Optional[str] = None
    operator_ua: Optional[str] = None
