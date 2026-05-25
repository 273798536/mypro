from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from app.models.models import (
    DataSourceType,
    CompensationStatus,
    FailureType,
    OperationType
)


class ImportRecordBase(BaseModel):
    source_file: str
    source_type: DataSourceType
    original_row_number: int
    original_data: Dict[str, Any]
    parsed_data: Dict[str, Any]
    import_batch_no: Optional[str] = None
    imported_by: Optional[str] = "system"
    remark: Optional[str] = None


class ImportRecordCreate(ImportRecordBase):
    pass


class ImportRecord(ImportRecordBase):
    id: int
    imported_at: datetime
    is_used: bool

    class Config:
        from_attributes = True


class CompensationQueueBase(BaseModel):
    source_type: DataSourceType
    check_in_no: Optional[str] = None
    room_no: Optional[str] = None
    guest_name: Optional[str] = None
    amount: float
    deposit_amount: Optional[float] = 0
    invoice_amount: Optional[float] = 0
    max_retry_times: Optional[int] = 3
    extra_data: Optional[Dict[str, Any]] = None


class CompensationQueueCreate(CompensationQueueBase):
    import_record_id: Optional[int] = None


class CompensationQueueUpdate(BaseModel):
    judgment_remark: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None


class CompensationQueue(CompensationQueueBase):
    id: int
    compensation_no: str
    import_record_id: Optional[int] = None
    status: CompensationStatus
    retry_count: int
    last_failure_type: Optional[FailureType] = None
    last_error_message: Optional[str] = None
    last_processed_at: Optional[datetime] = None
    next_retry_at: Optional[datetime] = None
    judged_by: Optional[str] = None
    judged_at: Optional[datetime] = None
    judgment_remark: Optional[str] = None
    compensated_at: Optional[datetime] = None
    compensated_by: Optional[str] = None
    compensation_remark: Optional[str] = None
    closed_at: Optional[datetime] = None
    closed_by: Optional[str] = None
    close_remark: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    celery_task_id: Optional[str] = None

    class Config:
        from_attributes = True


class CompensationQueueDetail(CompensationQueue):
    import_record: Optional[ImportRecord] = None


class StateTransitionBase(BaseModel):
    compensation_id: int
    from_status: Optional[CompensationStatus] = None
    to_status: CompensationStatus
    transition_reason: str
    operated_by: Optional[str] = "system"
    extra_info: Optional[Dict[str, Any]] = None


class StateTransitionCreate(StateTransitionBase):
    pass


class StateTransition(StateTransitionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class OperationLogBase(BaseModel):
    compensation_id: Optional[int] = None
    operation_type: OperationType
    operator: Optional[str] = "system"
    operation_detail: Optional[Dict[str, Any]] = None
    original_data_snapshot: Optional[Dict[str, Any]] = None
    new_data_snapshot: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class OperationLogCreate(OperationLogBase):
    pass


class OperationLog(OperationLogBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class BatchImportRequest(BaseModel):
    source_type: DataSourceType
    source_file: str
    import_batch_no: Optional[str] = None
    imported_by: Optional[str] = "system"
    records: List[Dict[str, Any]]


class BatchImportResponse(BaseModel):
    success: bool
    import_batch_no: str
    total_count: int
    success_count: int
    skipped_count: int = 0
    failed_count: int
    failed_records: List[Dict[str, Any]]


class CompensationActionResponse(BaseModel):
    success: bool
    compensation_no: str
    new_status: CompensationStatus
    message: str


class RetryRequest(BaseModel):
    operator: Optional[str] = "system"
    remark: Optional[str] = None


class ManualTakeoverRequest(BaseModel):
    operator: str
    judgment_remark: str


class CompensateRequest(BaseModel):
    operator: str
    compensation_remark: Optional[str] = None
    actual_amount: Optional[float] = None


class CloseRequest(BaseModel):
    operator: str
    close_remark: str


class PaginatedResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[Any]


class NightAuditReportItem(BaseModel):
    compensation_no: str
    source_type: str
    check_in_no: Optional[str]
    room_no: Optional[str]
    guest_name: Optional[str]
    amount: float
    deposit_amount: float
    invoice_amount: float
    status: str
    retry_count: int
    last_error_message: Optional[str]
    created_at: datetime
    source_file: Optional[str]
    original_row_number: Optional[int]


class StatisticsSummary(BaseModel):
    total_count: int
    pending_count: int
    processing_count: int
    waiting_retry_count: int
    waiting_manual_count: int
    manual_takeover_count: int
    compensated_count: int
    permanent_failed_count: int
    closed_count: int
    total_amount: float
    compensated_amount: float
