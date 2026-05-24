from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from app.enums import BatchStatus, WorkOrderStatus, DuplicateStrategy, TaskStatus, TaskType, AttachmentType, ChangeType


class WorkOrderBase(BaseModel):
    order_no: str
    external_order_no: Optional[str] = None
    road_section: Optional[str] = None
    pole_number: Optional[str] = None
    fault_description: Optional[str] = None
    status: WorkOrderStatus = WorkOrderStatus.NEW
    is_abnormal: bool = False
    abnormal_reason: Optional[str] = None
    repair_result: Optional[str] = None
    review_result: Optional[str] = None
    review_comment: Optional[str] = None
    original_price: Optional[float] = None
    adjusted_price: Optional[float] = None
    price_adjust_reason: Optional[str] = None
    report_time: Optional[datetime] = None
    repair_time: Optional[datetime] = None
    complete_time: Optional[datetime] = None
    shift: Optional[str] = None
    operator: Optional[str] = None
    spare_part_used: Optional[str] = None


class WorkOrderCreate(WorkOrderBase):
    pass


class WorkOrderUpdate(BaseModel):
    external_order_no: Optional[str] = None
    road_section: Optional[str] = None
    pole_number: Optional[str] = None
    fault_description: Optional[str] = None
    status: Optional[WorkOrderStatus] = None
    is_abnormal: Optional[bool] = None
    abnormal_reason: Optional[str] = None
    repair_result: Optional[str] = None
    review_result: Optional[str] = None
    review_comment: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    original_price: Optional[float] = None
    adjusted_price: Optional[float] = None
    price_adjust_reason: Optional[str] = None
    report_time: Optional[datetime] = None
    repair_time: Optional[datetime] = None
    complete_time: Optional[datetime] = None
    shift: Optional[str] = None
    operator: Optional[str] = None
    spare_part_used: Optional[str] = None


class WorkOrder(WorkOrderBase):
    id: int
    batch_id: int
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BatchBase(BaseModel):
    batch_no: str
    name: str
    description: Optional[str] = None
    road_section: Optional[str] = None
    shift: Optional[str] = None
    operator: Optional[str] = None
    spare_part_batch: Optional[str] = None


class BatchCreate(BatchBase):
    work_orders: List[WorkOrderCreate] = Field(default_factory=list)
    duplicate_strategy: DuplicateStrategy = DuplicateStrategy.IGNORE


class BatchUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    road_section: Optional[str] = None
    shift: Optional[str] = None
    operator: Optional[str] = None
    spare_part_batch: Optional[str] = None


class BatchReview(BaseModel):
    review_result: str
    review_comment: Optional[str] = None
    reviewed_by: str


class BatchFreeze(BaseModel):
    freeze_reason: str
    frozen_by: str


class BatchCancel(BaseModel):
    cancel_reason: str
    cancelled_by: str


class Batch(BatchBase):
    id: int
    status: BatchStatus
    total_work_orders: int
    abnormal_count: int
    frozen_at: Optional[datetime] = None
    frozen_by: Optional[str] = None
    freeze_reason: Optional[str] = None
    status_before_freeze: Optional[str] = None
    settled_at: Optional[datetime] = None
    settled_by: Optional[str] = None
    archived_at: Optional[datetime] = None
    archived_by: Optional[str] = None
    cancelled_at: Optional[datetime] = None
    cancelled_by: Optional[str] = None
    cancel_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    work_orders: List[WorkOrder] = Field(default_factory=list)

    class Config:
        from_attributes = True


class BatchList(BaseModel):
    id: int
    batch_no: str
    name: str
    status: BatchStatus
    road_section: Optional[str] = None
    shift: Optional[str] = None
    total_work_orders: int
    abnormal_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AttachmentBase(BaseModel):
    file_name: str
    file_type: AttachmentType = AttachmentType.OTHER
    description: Optional[str] = None


class AttachmentCreate(AttachmentBase):
    file_path: str
    file_size: Optional[int] = None
    uploaded_by: Optional[str] = None


class Attachment(AttachmentBase):
    id: int
    batch_id: Optional[int] = None
    work_order_id: Optional[int] = None
    file_path: str
    file_size: Optional[int] = None
    uploaded_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ChangeLogBase(BaseModel):
    change_type: ChangeType
    field_name: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    change_reason: Optional[str] = None
    changed_by: Optional[str] = None


class ChangeLogCreate(ChangeLogBase):
    batch_id: Optional[int] = None
    work_order_id: Optional[int] = None


class ChangeLog(ChangeLogBase):
    id: int
    batch_id: Optional[int] = None
    work_order_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AsyncTaskBase(BaseModel):
    task_type: TaskType
    batch_id: Optional[int] = None
    created_by: Optional[str] = None


class AsyncTaskCreate(AsyncTaskBase):
    task_id: str


class AsyncTask(AsyncTaskBase):
    id: int
    task_id: str
    status: TaskStatus
    progress: int
    message: Optional[str] = None
    result_data: Optional[str] = None
    retry_count: int
    max_retries: int
    next_retry_at: Optional[datetime] = None
    failed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ExportRequest(BaseModel):
    batch_ids: Optional[List[int]] = None
    include_frozen: bool = True
    include_change_logs: bool = True
    format: str = "xlsx"


class BatchImportRequest(BaseModel):
    duplicate_strategy: DuplicateStrategy = DuplicateStrategy.IGNORE
    operator: Optional[str] = None


class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    page_size: int


class BatchWithDetails(Batch):
    attachments: List[Attachment] = Field(default_factory=list)
    change_logs: List[ChangeLog] = Field(default_factory=list)
