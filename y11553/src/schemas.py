from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

from .models import TaskStatus, RecordType, ImportSource, DuplicateType


class InventoryRecordCreate(BaseModel):
    cabinet_id: str
    cell_id: str
    sku_id: str
    sku_name: Optional[str] = None
    quantity: int
    is_hot_cell: Optional[bool] = False
    processing_reason: Optional[str] = None
    record_time: Optional[datetime] = None


class ReplenishmentRecordCreate(BaseModel):
    cabinet_id: str
    cell_id: str
    photo_url: Optional[str] = None
    photo_hash: str
    replenishment_quantity: int
    operator_id: Optional[str] = None
    record_time: Optional[datetime] = None


class RefundRecordCreate(BaseModel):
    cabinet_id: Optional[str] = None
    order_id: str
    user_id: Optional[str] = None
    sku_id: Optional[str] = None
    refund_amount: float
    refund_reason: Optional[str] = None
    record_time: Optional[datetime] = None


class PriceAdjustmentCreate(BaseModel):
    cabinet_id: str
    cell_id: str
    sku_id: str
    original_price: float
    new_price: float
    operator_id: Optional[str] = None
    approval_note: Optional[str] = None
    record_time: Optional[datetime] = None


class ImportRequest(BaseModel):
    records: List[Dict[str, Any]]


class PendingRecordResponse(BaseModel):
    id: int
    task_id: int
    source_file: Optional[str]
    source_row_number: int
    record_type: str
    raw_data: Dict[str, Any]
    status: str
    retry_times: int
    max_retry_times: int
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime
    processed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TaskResponse(BaseModel):
    task_id: str
    record_type: str
    source_type: str
    source_file: Optional[str]
    status: str
    total_count: int
    success_count: int
    duplicate_count: int
    error_count: int
    retry_times: int
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    pending_records: List[PendingRecordResponse] = []

    class Config:
        from_attributes = True


class TaskListItemResponse(BaseModel):
    task_id: str
    record_type: str
    source_type: str
    source_file: Optional[str]
    status: str
    total_count: int
    success_count: int
    duplicate_count: int
    error_count: int
    retry_times: int
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TaskListResponse(BaseModel):
    total: int
    tasks: List[TaskListItemResponse]


class ProcessingLogResponse(BaseModel):
    id: int
    record_id: Optional[str]
    record_type: str
    level: str
    message: str
    created_at: datetime

    class Config:
        from_attributes = True


class DuplicateRecordResponse(BaseModel):
    id: int
    record_type: str
    duplicate_type: str
    original_record_id: str
    reason: str
    source_row_number: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class ReconciliationResponse(BaseModel):
    reconciliation_id: str
    cabinet_id: str
    cell_id: str
    sku_id: str
    expected_quantity: int
    actual_quantity: int
    difference: int
    is_consistent: bool
    issue_type: Optional[str]
    description: Optional[str]
    report_time: datetime

    class Config:
        from_attributes = True


class ReconciliationSummary(BaseModel):
    total_cells: int
    consistent_count: int
    inconsistent_count: int
    consistency_rate: float
    issues_distribution: Dict[str, int]


class InventoryRecordResponse(BaseModel):
    record_id: str
    source_file: Optional[str]
    source_row_number: Optional[int]
    cabinet_id: str
    cell_id: str
    sku_id: str
    sku_name: Optional[str]
    quantity: int
    is_hot_cell: bool
    processing_reason: Optional[str]
    is_duplicate: bool
    record_time: datetime

    class Config:
        from_attributes = True


class RecordDetailResponse(BaseModel):
    record: Dict[str, Any]
    raw_data: Dict[str, Any]
    task: Optional[TaskResponse] = None
    logs: List[ProcessingLogResponse] = []
