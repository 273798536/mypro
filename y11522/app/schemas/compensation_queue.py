from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

from app.models.enums import QueueStatus, FailCategory


class QueueItemBase(BaseModel):
    appointment_no: Optional[str] = None
    order_no: Optional[str] = None
    user_id: Optional[str] = None
    technician_id: Optional[str] = None
    region: Optional[str] = None
    is_rescheduled: bool = False
    is_second_visit: bool = False
    has_negative_review: bool = False
    review_reason: Optional[str] = None
    compensation_amount: int = 0
    compensation_reason: Optional[str] = None


class QueueItemCreate(QueueItemBase):
    queue_key: str
    raw_data_ids: Optional[List[int]] = None
    raw_data_sources: Optional[List[str]] = None


class QueueItemUpdate(BaseModel):
    status: Optional[QueueStatus] = None
    compensation_amount: Optional[int] = None
    compensation_reason: Optional[str] = None
    manual_note: Optional[str] = None
    close_reason: Optional[str] = None


class QueueItemResponse(QueueItemBase):
    id: int
    queue_key: str
    status: QueueStatus
    retry_count: int
    max_retry_times: int
    next_retry_at: Optional[datetime] = None
    fail_category: Optional[FailCategory] = None
    last_error: Optional[str] = None
    last_failed_at: Optional[datetime] = None
    receipt_submitted: bool
    receipt_submitted_at: Optional[datetime] = None
    manual_taken_by: Optional[str] = None
    manual_taken_at: Optional[datetime] = None
    compensated_at: Optional[datetime] = None
    compensated_by: Optional[str] = None
    closed_at: Optional[datetime] = None
    closed_by: Optional[str] = None
    raw_data_ids: Optional[List[int]] = None
    raw_data_sources: Optional[List[str]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StatusHistoryResponse(BaseModel):
    id: int
    queue_id: int
    from_status: Optional[QueueStatus] = None
    to_status: QueueStatus
    changed_at: datetime
    changed_by: Optional[str] = None
    change_reason: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class QueueItemDetailResponse(QueueItemResponse):
    status_history: List[StatusHistoryResponse] = Field(default_factory=list)


class ReceiptSubmitRequest(BaseModel):
    receipt_data: Dict[str, Any]


class ManualTakeoverRequest(BaseModel):
    operator: str
    note: Optional[str] = None


class CompensationRequest(BaseModel):
    amount: int
    reason: str
    operator: str


class CloseQueueRequest(BaseModel):
    reason: str
    operator: str
