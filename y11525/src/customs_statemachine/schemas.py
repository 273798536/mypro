from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from .models import BatchStatus, TaskStatus, IdempotencyMode, DataSource


class PackageBase(BaseModel):
    package_no: str
    waybill_no: Optional[str] = None
    declared_value: Optional[float] = None
    tax_amount: Optional[float] = None
    is_abnormal: bool = False
    abnormal_reason: Optional[str] = None
    source: Optional[DataSource] = None
    raw_data: Optional[Dict[str, Any]] = None


class PackageCreate(PackageBase):
    pass


class Package(PackageBase):
    id: str
    batch_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TrackingNodeBase(BaseModel):
    package_no: Optional[str] = None
    node_type: Optional[str] = None
    node_time: Optional[datetime] = None
    location: Optional[str] = None
    status: Optional[str] = None
    remark: Optional[str] = None
    raw_data: Optional[Dict[str, Any]] = None


class TrackingNodeCreate(TrackingNodeBase):
    pass


class TrackingNode(TrackingNodeBase):
    id: str
    batch_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class TaxNoticeBase(BaseModel):
    notice_no: Optional[str] = None
    package_no: Optional[str] = None
    tax_amount: Optional[float] = None
    tax_type: Optional[str] = None
    issue_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    is_paid: bool = False
    paid_at: Optional[datetime] = None
    raw_data: Optional[Dict[str, Any]] = None


class TaxNoticeCreate(TaxNoticeBase):
    pass


class TaxNotice(TaxNoticeBase):
    id: str
    batch_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class TempRecordBase(BaseModel):
    record_type: Optional[str] = None
    package_no: Optional[str] = None
    content: Optional[str] = None
    recorded_by: Optional[str] = None
    recorded_at: Optional[datetime] = None
    raw_data: Optional[Dict[str, Any]] = None


class TempRecordCreate(TempRecordBase):
    pass


class TempRecord(TempRecordBase):
    id: str
    batch_id: str

    class Config:
        from_attributes = True


class AttachmentBase(BaseModel):
    file_name: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    description: Optional[str] = None


class AttachmentCreate(AttachmentBase):
    file_path: str
    uploaded_by: str


class Attachment(AttachmentBase):
    id: str
    batch_id: str
    file_path: str
    uploaded_by: str
    uploaded_at: datetime

    class Config:
        from_attributes = True


class AuditLogBase(BaseModel):
    action: str
    old_status: Optional[str] = None
    new_status: Optional[str] = None
    changed_by: str
    reason: Optional[str] = None
    changes: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class AuditLogCreate(AuditLogBase):
    pass


class AuditLog(AuditLogBase):
    id: str
    batch_id: str
    changed_at: datetime

    class Config:
        from_attributes = True


class AsyncTaskBase(BaseModel):
    task_type: str
    payload: Optional[Dict[str, Any]] = None
    max_retries: int = 3


class AsyncTaskCreate(AsyncTaskBase):
    batch_id: str
    created_by: str


class AsyncTask(AsyncTaskBase):
    id: str
    batch_id: str
    status: TaskStatus
    retry_count: int
    last_error: Optional[str] = None
    error_traceback: Optional[str] = None
    queued_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    next_retry_at: Optional[datetime] = None
    result: Optional[Dict[str, Any]] = None
    created_by: Optional[str] = None

    class Config:
        from_attributes = True


class BatchBase(BaseModel):
    batch_no: str
    source_type: Optional[str] = None
    customs_code: Optional[str] = None


class BatchCreate(BatchBase):
    created_by: str
    packages: List[PackageCreate] = Field(default_factory=list)
    tracking_nodes: List[TrackingNodeCreate] = Field(default_factory=list)
    tax_notices: List[TaxNoticeCreate] = Field(default_factory=list)
    temp_records: List[TempRecordCreate] = Field(default_factory=list)
    idempotency_mode: IdempotencyMode = IdempotencyMode.IGNORE


class BatchUpdate(BaseModel):
    source_type: Optional[str] = None
    customs_code: Optional[str] = None
    manual_remark: Optional[str] = None


class Batch(BatchBase):
    id: str
    status: BatchStatus
    total_packages: int
    total_tax_amount: float
    created_at: datetime
    updated_at: datetime
    created_by: str
    frozen_at: Optional[datetime] = None
    frozen_by: Optional[str] = None
    frozen_reason: Optional[str] = None
    status_before_frozen: Optional[str] = None
    manual_remark: Optional[str] = None

    packages: List[Package] = Field(default_factory=list)
    tracking_nodes: List[TrackingNode] = Field(default_factory=list)
    tax_notices: List[TaxNotice] = Field(default_factory=list)
    temp_records: List[TempRecord] = Field(default_factory=list)
    attachments: List[Attachment] = Field(default_factory=list)
    audit_logs: List[AuditLog] = Field(default_factory=list)
    tasks: List[AsyncTask] = Field(default_factory=list)

    class Config:
        from_attributes = True


class BatchList(BaseModel):
    id: str
    batch_no: str
    status: BatchStatus
    source_type: Optional[str] = None
    customs_code: Optional[str] = None
    total_packages: int
    total_tax_amount: float
    created_at: datetime
    updated_at: datetime
    created_by: str
    frozen_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PaginatedResponse(BaseModel):
    total: int
    skip: int
    limit: int
    items: List[BatchList]


class StatusTransition(BaseModel):
    target_status: BatchStatus
    changed_by: str
    reason: Optional[str] = None


class FreezeRequest(BaseModel):
    frozen_by: str
    frozen_reason: str


class UnfreezeRequest(BaseModel):
    unfrozen_by: str
    reason: Optional[str] = None


class BatchDataAppend(BaseModel):
    packages: List[PackageCreate] = Field(default_factory=list)
    tracking_nodes: List[TrackingNodeCreate] = Field(default_factory=list)
    tax_notices: List[TaxNoticeCreate] = Field(default_factory=list)
    temp_records: List[TempRecordCreate] = Field(default_factory=list)
    idempotency_mode: IdempotencyMode = IdempotencyMode.APPEND
    changed_by: str


class ExportRequest(BaseModel):
    format: str = "xlsx"
    include_history: bool = True
    include_packages: bool = True


class ExportResponse(BaseModel):
    file_path: str
    file_name: str
    file_size: int
    created_at: datetime


class TaskRetryRequest(BaseModel):
    retried_by: str
    reason: Optional[str] = None


class TaskResolveRequest(BaseModel):
    resolved_by: str
    resolution: str
    result: Optional[Dict[str, Any]] = None
