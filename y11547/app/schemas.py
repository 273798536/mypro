from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any
from app.models import QueueStatus, DirtyType, RetryCategory, MaterialSource


class StatusHistoryBase(BaseModel):
    from_status: Optional[str] = None
    to_status: str
    changed_by: str
    change_reason: str


class StatusHistoryResponse(StatusHistoryBase):
    id: int
    receipt_queue_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ReceiptQueueBase(BaseModel):
    material_name: str
    material_code: Optional[str] = None
    quantity: float
    amount: float = 0
    source_type: str
    source_id: int


class ReceiptQueueCreate(ReceiptQueueBase):
    logistics_receipt_id: Optional[int] = None
    borrow_record_id: Optional[int] = None
    store_transfer_id: Optional[int] = None
    original_data: str
    max_retry_count: int = 3


class ReceiptQueueResponse(BaseModel):
    id: int
    queue_no: str
    source_type: str
    material_name: str
    material_code: Optional[str] = None
    quantity: float
    amount: float
    status: str
    retry_count: int
    max_retry_count: int
    last_retry_time: Optional[datetime] = None
    next_retry_time: Optional[datetime] = None
    retry_category: Optional[str] = None
    is_dirty: bool
    dirty_type: Optional[str] = None
    dirty_note: Optional[str] = None
    handler: Optional[str] = None
    handled_at: Optional[datetime] = None
    handle_note: Optional[str] = None
    compensated_amount: float
    compensated_at: Optional[datetime] = None
    compensated_by: Optional[str] = None
    closed_at: Optional[datetime] = None
    closed_by: Optional[str] = None
    close_note: Optional[str] = None
    original_data: str
    corrected_data: Optional[str] = None
    correction_note: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    status_history: List[StatusHistoryResponse] = []

    class Config:
        from_attributes = True


class ReceiptQueueListResponse(BaseModel):
    items: List[ReceiptQueueResponse]
    total: int
    page: int
    page_size: int


class ManualReviewRequest(BaseModel):
    handler: str
    handle_note: str
    corrected_data: Optional[Dict[str, Any]] = None
    correction_note: Optional[str] = None


class CompensationRequest(BaseModel):
    compensated_amount: float
    compensated_by: str
    compensation_note: str


class CloseRequest(BaseModel):
    closed_by: str
    close_note: str


class RetryRequest(BaseModel):
    triggered_by: str
    reason: str


class DeadLetterRecoverRequest(BaseModel):
    recovered_by: str
    recovery_note: str
    new_max_retry: int = 3


class DashboardStats(BaseModel):
    total_queue: int
    pending: int
    processing: int
    retrying: int
    manual_review: int
    compensated: int
    closed: int
    dead_letter: int
    dirty_records: int


class RetryCategoryStats(BaseModel):
    category: str
    count: int
    amount: float


class DirtyTypeStats(BaseModel):
    dirty_type: str
    count: int


class SourceStats(BaseModel):
    source_type: str
    count: int
    amount: float


class DashboardResponse(BaseModel):
    stats: DashboardStats
    retry_categories: List[RetryCategoryStats]
    dirty_types: List[DirtyTypeStats]
    sources: List[SourceStats]


class LogisticsReceiptCreate(BaseModel):
    tracking_number: str
    material_name: str
    material_code: Optional[str] = None
    quantity: float
    sender: str
    receiver: str
    receive_time: datetime
    signatory: str
    sms_screenshot_url: Optional[str] = None
    raw_data: Optional[str] = None


class BorrowRecordCreate(BaseModel):
    borrow_no: str
    material_name: str
    material_code: Optional[str] = None
    quantity: float
    borrower: str
    borrower_department: str
    borrow_time: datetime
    expected_return_time: Optional[datetime] = None
    handler: str
    remark: Optional[str] = None
    raw_data: Optional[str] = None


class StoreTransferCreate(BaseModel):
    transfer_no: str
    material_name: str
    material_code: Optional[str] = None
    quantity: float
    from_store: str
    to_store: str
    transfer_time: datetime
    handler: str
    receiver: str
    raw_data: Optional[str] = None


class MaterialListCreate(BaseModel):
    list_no: str
    exhibition_name: str
    material_name: str
    material_code: Optional[str] = None
    planned_quantity: float
    actual_quantity: Optional[float] = None
    unit_price: float = 0
    responsible_person: str
    raw_data: Optional[str] = None


class ExportRequest(BaseModel):
    status: Optional[List[str]] = None
    source_type: Optional[List[str]] = None
    is_dirty: Optional[bool] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
