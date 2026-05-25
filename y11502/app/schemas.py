from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Any
from app.models import SourceType, QueueStatus, TaskStatus


class SourceEvidenceBase(BaseModel):
    source_file: str
    source_line: int
    source_type: SourceType
    raw_data: str
    parsed_value: str


class SourceEvidenceCreate(SourceEvidenceBase):
    pass


class SourceEvidenceResponse(SourceEvidenceBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class MaintenanceOrderBase(BaseModel):
    order_no: str
    customer_name: str
    product_model: str
    fault_description: Optional[str] = None


class MaintenanceOrderCreate(MaintenanceOrderBase):
    source_evidence_id: Optional[int] = None


class MaintenanceOrderResponse(MaintenanceOrderBase):
    id: int
    status: str
    created_at: datetime
    updated_at: datetime
    source_evidence: Optional[SourceEvidenceResponse] = None

    class Config:
        from_attributes = True


class SparePartScanBase(BaseModel):
    scan_no: str
    part_code: str
    part_name: str
    quantity: int
    scan_time: datetime
    operator: str


class SparePartScanCreate(SparePartScanBase):
    source_evidence_id: Optional[int] = None


class SparePartScanResponse(SparePartScanBase):
    id: int
    created_at: datetime
    source_evidence: Optional[SourceEvidenceResponse] = None

    class Config:
        from_attributes = True


class CustomerReceiptBase(BaseModel):
    receipt_no: str
    order_no: str
    customer_name: str
    receipt_time: datetime
    image_url: Optional[str] = None
    signed_by: str


class CustomerReceiptCreate(CustomerReceiptBase):
    source_evidence_id: Optional[int] = None


class CustomerReceiptResponse(CustomerReceiptBase):
    id: int
    created_at: datetime
    source_evidence: Optional[SourceEvidenceResponse] = None

    class Config:
        from_attributes = True


class SupplierStatementBase(BaseModel):
    statement_no: str
    supplier_name: str
    order_no: str
    part_code: str
    quantity: int
    unit_price: float
    total_amount: float
    statement_date: datetime


class SupplierStatementCreate(SupplierStatementBase):
    source_evidence_id: Optional[int] = None


class SupplierStatementResponse(SupplierStatementBase):
    id: int
    status: str
    created_at: datetime
    updated_at: datetime
    source_evidence: Optional[SourceEvidenceResponse] = None

    class Config:
        from_attributes = True


class ApprovalEmailBase(BaseModel):
    email_id: str
    subject: str
    sender: str
    recipient: str
    order_no: str
    approval_status: str = "pending"
    approval_note: Optional[str] = None
    approver: str
    sent_at: datetime


class ApprovalEmailCreate(ApprovalEmailBase):
    source_evidence_id: Optional[int] = None


class ApprovalEmailResponse(ApprovalEmailBase):
    id: int
    created_at: datetime
    updated_at: datetime
    source_evidence: Optional[SourceEvidenceResponse] = None

    class Config:
        from_attributes = True


class AsyncTaskResponse(BaseModel):
    id: int
    task_id: str
    task_type: str
    status: TaskStatus
    error_message: Optional[str] = None
    retry_count: int
    max_retry: int
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CompensationQueueBase(BaseModel):
    order_no: str
    part_code: str
    quantity: int


class CompensationQueueCreate(CompensationQueueBase):
    idempotent_key: str
    max_retry: int = 3


class CompensationQueueResponse(CompensationQueueBase):
    id: int
    idempotent_key: str
    status: QueueStatus
    retry_count: int
    max_retry: int
    last_error: Optional[str] = None
    next_retry_at: Optional[datetime] = None
    processed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    manual_handler: Optional[str] = None
    manual_note: Optional[str] = None

    class Config:
        from_attributes = True


class CompensationRecordResponse(BaseModel):
    id: int
    queue_id: int
    order_no: str
    part_code: str
    quantity: int
    amount: float
    compensated_at: datetime
    operator: str
    remark: Optional[str] = None

    class Config:
        from_attributes = True


class ManualHandleRequest(BaseModel):
    handler: str
    note: str
    action: str = Field(..., description="approve|reject|retry")


class ImportResponse(BaseModel):
    success: bool
    message: str
    total_count: int
    success_count: int
    failed_count: int
    details: List[Any] = []


class QueueStatsResponse(BaseModel):
    pending: int
    retrying: int
    waiting_manual: int
    dead_letter: int
    compensated: int
    closed: int


class RetryCategoryStats(BaseModel):
    category: str
    count: int
    error_types: List[dict]


class DeadLetterStats(BaseModel):
    total: int
    by_error_type: List[dict]
    oldest_entry: Optional[datetime] = None
    newest_entry: Optional[datetime] = None


class RecoveryStats(BaseModel):
    recovered_tasks: int
    pending_recovery: int
    last_recovery_at: Optional[datetime] = None


class ServiceMetricsResponse(BaseModel):
    retry_categories: List[RetryCategoryStats]
    dead_letter: DeadLetterStats
    recovery: RecoveryStats
