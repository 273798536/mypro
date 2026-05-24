from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any
from .models import BatchStatus, DuplicateStrategy, TaskStatus, SourceType


class InspectionSheetBase(BaseModel):
    batch_no: str
    product_code: Optional[str] = None
    product_name: Optional[str] = None
    inspection_date: Optional[datetime] = None
    inspector: Optional[str] = None
    total_quantity: int = 0
    defective_quantity: int = 0
    pass_rate: float = 0.0
    defect_type: Optional[str] = None
    defect_description: Optional[str] = None
    machine_id: Optional[str] = None
    shift_id: Optional[str] = None
    work_order: Optional[str] = None
    remark: Optional[str] = None


class InspectionSheetCreate(InspectionSheetBase):
    created_by: Optional[str] = None


class InspectionSheet(InspectionSheetBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None

    class Config:
        from_attributes = True


class ReworkOrderBase(BaseModel):
    rework_no: str
    batch_no: Optional[str] = None
    inspection_id: Optional[int] = None
    product_code: Optional[str] = None
    rework_date: Optional[datetime] = None
    rework_type: Optional[str] = None
    rework_reason: Optional[str] = None
    rework_quantity: int = 0
    reworked_quantity: int = 0
    passed_quantity: int = 0
    rework_pass_rate: float = 0.0
    rework_operator: Optional[str] = None
    machine_id: Optional[str] = None
    shift_id: Optional[str] = None
    is_secondary_rework: bool = False
    parent_rework_id: Optional[int] = None
    remark: Optional[str] = None


class ReworkOrderCreate(ReworkOrderBase):
    created_by: Optional[str] = None


class ReworkOrder(ReworkOrderBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None

    class Config:
        from_attributes = True


class MachineShiftBase(BaseModel):
    shift_code: str
    machine_id: str
    shift_date: Optional[datetime] = None
    shift_type: Optional[str] = None
    shift_leader: Optional[str] = None
    operator: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    production_quantity: int = 0
    defective_quantity: int = 0
    shift_pass_rate: float = 0.0
    remark: Optional[str] = None


class MachineShiftCreate(MachineShiftBase):
    created_by: Optional[str] = None


class MachineShift(MachineShiftBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None

    class Config:
        from_attributes = True


class PriceAdjustmentBase(BaseModel):
    adjustment_no: str
    batch_no: Optional[str] = None
    product_code: Optional[str] = None
    adjustment_date: Optional[datetime] = None
    original_price: float = 0.0
    adjusted_price: float = 0.0
    price_difference: float = 0.0
    adjustment_reason: Optional[str] = None
    approver: Optional[str] = None
    remark: Optional[str] = None


class PriceAdjustmentCreate(PriceAdjustmentBase):
    created_by: Optional[str] = None


class PriceAdjustment(PriceAdjustmentBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None

    class Config:
        from_attributes = True


class BatchSourceBase(BaseModel):
    source_type: SourceType
    source_data: Optional[Dict[str, Any]] = None


class BatchSource(BatchSourceBase):
    id: int
    batch_id: int
    inspection_id: Optional[int] = None
    rework_id: Optional[int] = None
    machine_shift_id: Optional[int] = None
    price_adjustment_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class BatchAttachmentBase(BaseModel):
    file_name: str
    file_path: Optional[str] = None
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    description: Optional[str] = None


class BatchAttachmentCreate(BatchAttachmentBase):
    uploaded_by: Optional[str] = None


class BatchAttachment(BatchAttachmentBase):
    id: int
    batch_id: int
    uploaded_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class BatchHistoryBase(BaseModel):
    action: str
    previous_state: Optional[Dict[str, Any]] = None
    new_state: Optional[Dict[str, Any]] = None
    changes: Optional[Dict[str, Any]] = None
    operator: Optional[str] = None
    remark: Optional[str] = None


class BatchHistory(BatchHistoryBase):
    id: int
    batch_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class QualityBatchBase(BaseModel):
    batch_no: str
    product_code: Optional[str] = None
    product_name: Optional[str] = None
    remark: Optional[str] = None


class QualityBatchCreate(QualityBatchBase):
    created_by: Optional[str] = None
    duplicate_strategy: DuplicateStrategy = DuplicateStrategy.IGNORE
    inspection_ids: Optional[List[int]] = None
    rework_ids: Optional[List[int]] = None
    machine_shift_ids: Optional[List[int]] = None
    price_adjustment_ids: Optional[List[int]] = None


class QualityBatchUpdate(BaseModel):
    product_code: Optional[str] = None
    product_name: Optional[str] = None
    remark: Optional[str] = None


class QualityBatch(QualityBatchBase):
    id: int
    batch_id: str
    status: BatchStatus
    current_stage: Optional[str] = None
    total_defect_count: int = 0
    rework_count: int = 0
    final_pass_rate: float = 0.0
    responsible_shift: Optional[str] = None
    responsible_machine: Optional[str] = None
    initial_pass_rate: float = 0.0
    best_pass_rate: float = 0.0
    worst_pass_rate: float = 0.0
    review_opinion: Optional[str] = None
    reviewer: Optional[str] = None
    review_time: Optional[datetime] = None
    freeze_reason: Optional[str] = None
    frozen_by: Optional[str] = None
    frozen_at: Optional[datetime] = None
    freeze_snapshot: Optional[Dict[str, Any]] = None
    status_before_freeze: Optional[str] = None
    archive_reason: Optional[str] = None
    archived_by: Optional[str] = None
    archived_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None

    sources: List[BatchSource] = []
    attachments: List[BatchAttachment] = []
    histories: List[BatchHistory] = []

    class Config:
        from_attributes = True


class QualityBatchDetail(QualityBatch):
    sources_detail: List[Dict[str, Any]] = []


class ReviewRequest(BaseModel):
    review_opinion: str
    reviewer: str
    is_approved: bool = True
    remark: Optional[str] = None


class FreezeRequest(BaseModel):
    freeze_reason: str
    frozen_by: str


class UnfreezeRequest(BaseModel):
    unfreeze_reason: str
    operator: str


class ArchiveRequest(BaseModel):
    archive_reason: str
    archived_by: str


class AsyncTaskBase(BaseModel):
    task_type: str
    batch_id: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None


class AsyncTaskCreate(AsyncTaskBase):
    created_by: Optional[str] = None


class AsyncTask(AsyncTaskBase):
    id: int
    task_id: str
    status: TaskStatus
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3
    next_retry_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None

    class Config:
        from_attributes = True


class BatchListResponse(BaseModel):
    total: int
    items: List[QualityBatch]


class DiffResponse(BaseModel):
    field: str
    old_value: Any
    new_value: Any
    change_type: str


class HistoryDiffResponse(BaseModel):
    history_id: int
    action: str
    operator: Optional[str]
    created_at: datetime
    differences: List[DiffResponse]


class ExportRequest(BaseModel):
    batch_ids: Optional[List[str]] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[List[BatchStatus]] = None
    export_format: str = "excel"


class ExportResponse(BaseModel):
    file_path: str
    file_name: str
    file_size: int
    record_count: int
