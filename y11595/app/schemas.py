from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

from app.models import BatchStatus, RecordStatus, RecordType, UserRole


class BatchBase(BaseModel):
    title: str = Field(..., max_length=200)
    description: Optional[str] = None


class BatchCreate(BatchBase):
    pass


class BatchUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    extra_metadata: Optional[Dict[str, Any]] = None


class BatchResponse(BatchBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    batch_no: str
    status: BatchStatus
    created_by: str
    created_at: datetime
    updated_at: datetime
    imported_at: Optional[datetime] = None
    frozen_at: Optional[datetime] = None
    frozen_by: Optional[str] = None
    frozen_reason: Optional[str] = None
    status_before_frozen: Optional[BatchStatus] = None
    stats: Optional[Dict[str, Any]] = None


class BatchDetailResponse(BatchResponse):
    record_count: int = 0
    attachment_count: int = 0


class RecordBase(BaseModel):
    record_type: RecordType
    unique_key: Optional[str] = None
    parsed_data: Dict[str, Any]


class RecordCreate(RecordBase):
    original_data: Dict[str, Any]
    source_file: Optional[str] = None
    source_row: Optional[int] = None
    source_sheet: Optional[str] = None
    change_order_no: Optional[str] = None
    audit_opinion_no: Optional[str] = None
    cs_reference_no: Optional[str] = None
    cs_agent_id: Optional[str] = None
    cs_agent_name: Optional[str] = None
    store_id: Optional[str] = None
    store_name: Optional[str] = None
    compensation_amount: Optional[float] = 0


class RecordUpdate(BaseModel):
    status: Optional[RecordStatus] = None
    parsed_data: Optional[Dict[str, Any]] = None
    review_result: Optional[str] = None
    review_reason: Optional[str] = None
    correction_note: Optional[str] = None
    is_correct: Optional[bool] = None
    extra_metadata: Optional[Dict[str, Any]] = None


class RecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    batch_id: int
    record_type: RecordType
    status: RecordStatus
    unique_key: Optional[str] = None
    source_file: Optional[str] = None
    source_row: Optional[int] = None
    change_order_no: Optional[str] = None
    audit_opinion_no: Optional[str] = None
    cs_reference_no: Optional[str] = None
    cs_agent_id: Optional[str] = None
    cs_agent_name: Optional[str] = None
    store_id: Optional[str] = None
    store_name: Optional[str] = None
    compensation_amount: float
    is_correct: Optional[bool] = None
    review_result: Optional[str] = None
    review_reason: Optional[str] = None
    reviewer: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    correction_note: Optional[str] = None
    corrected_by: Optional[str] = None
    corrected_at: Optional[datetime] = None
    error_message: Optional[str] = None
    warning_message: Optional[str] = None
    is_duplicate: bool
    created_at: datetime
    updated_at: datetime


class RecordDetailResponse(RecordResponse):
    original_data: Dict[str, Any]
    parsed_data: Dict[str, Any]


class ImportSourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    batch_id: int
    file_name: str
    record_type: RecordType
    total_rows: int
    success_count: int
    failed_count: int
    imported_by: Optional[str] = None
    imported_at: datetime
    sheet_name: Optional[str] = None
    parse_errors: List[Dict[str, Any]] = []


class AttachmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    batch_id: Optional[int] = None
    record_id: Optional[int] = None
    file_name: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    attachment_type: Optional[str] = None
    description: Optional[str] = None
    uploaded_by: Optional[str] = None
    uploaded_at: datetime


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    batch_id: Optional[int] = None
    record_id: Optional[int] = None
    action: str
    old_status: Optional[str] = None
    new_status: Optional[str] = None
    reason: Optional[str] = None
    operator: str
    operator_role: Optional[str] = None
    operated_at: datetime
    changes: Optional[Dict[str, Any]] = None


class ImportResult(BaseModel):
    batch_id: int
    batch_no: str
    total_records: int
    success_count: int
    failed_count: int
    duplicate_count: int
    failed_records: List[Dict[str, Any]] = []
    import_sources: List[ImportSourceResponse] = []


class BatchReviewRequest(BaseModel):
    action: str = Field(..., pattern="^(approve|reject)$")
    opinion: str
    record_results: Optional[Dict[int, Dict[str, Any]]] = None


class FreezeRequest(BaseModel):
    reason: str


class WithdrawRequest(BaseModel):
    reason: str


class RecordCorrectionRequest(BaseModel):
    status: RecordStatus
    correction_note: str
    review_reason: Optional[str] = None
    is_correct: Optional[bool] = None
    compensation_amount: Optional[float] = None


class ExportSummary(BaseModel):
    batch_id: int
    batch_no: str
    batch_title: str
    status_before_frozen: Optional[str] = None
    status_after_frozen: Optional[str] = None
    frozen_reason: Optional[str] = None
    total_records: int
    verified_count: int
    corrected_count: int
    waived_count: int
    invalid_count: int
    duplicate_count: int
    pending_count: int
    total_compensation: float
    correct_compensation: float
    incorrect_compensation: float
    export_at: datetime
    exported_by: str


class PaginatedResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[Any]


class ErrorResponse(BaseModel):
    detail: str
    code: Optional[str] = None
