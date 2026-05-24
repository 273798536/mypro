from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field, ConfigDict

from models import RecordState, BatchState, DataSource


class BatchBase(BaseModel):
    name: str = Field(..., description="批次名称")
    description: Optional[str] = Field(None, description="批次描述")
    created_by: str = Field(..., description="创建人")


class BatchCreate(BatchBase):
    pass


class BatchUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None


class BatchResponse(BatchBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    state: BatchState
    created_at: datetime
    updated_at: datetime
    frozen_at: Optional[datetime] = None
    frozen_by: Optional[str] = None
    frozen_reason: Optional[str] = None
    settled_at: Optional[datetime] = None
    settled_by: Optional[str] = None
    extra_data: Dict[str, Any] = Field(default_factory=dict)


class BatchDetailResponse(BatchResponse):
    record_count: int
    state_logs: List["BatchStateLogResponse"] = Field(default_factory=list)
    original_files: List["OriginalFileResponse"] = Field(default_factory=list)


class AbnormalRecordBase(BaseModel):
    source: DataSource
    room_code: str
    room_name: Optional[str] = None
    appointment_id: Optional[str] = None
    appointment_subject: Optional[str] = None
    appointment_date: datetime
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    booker: Optional[str] = None
    booker_dept: Optional[str] = None
    has_access_record: Optional[bool] = None
    access_person: Optional[str] = None
    access_time: Optional[datetime] = None
    has_cancel_message: Optional[bool] = None
    cancel_time: Optional[datetime] = None
    cancel_operator: Optional[str] = None
    actual_cost: Optional[int] = None
    estimated_cost: Optional[int] = None
    cost_recovery_status: Optional[str] = None


class AbnormalRecordCreate(AbnormalRecordBase):
    batch_id: str


class AbnormalRecordUpdate(BaseModel):
    room_name: Optional[str] = None
    booker: Optional[str] = None
    booker_dept: Optional[str] = None
    actual_cost: Optional[int] = None
    estimated_cost: Optional[int] = None
    cost_recovery_status: Optional[str] = None


class ReviewRequest(BaseModel):
    record_ids: List[str]
    approved: bool
    reason: str
    operator: str


class OverrideRequest(BaseModel):
    new_state: RecordState
    reason: str
    operator: str
    remark: Optional[str] = None


class AbnormalRecordResponse(AbnormalRecordBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    batch_id: str
    state: RecordState
    reviewer: Optional[str] = None
    review_time: Optional[datetime] = None
    review_reason: Optional[str] = None
    manual_override: bool = False
    override_reason: Optional[str] = None
    override_by: Optional[str] = None
    override_time: Optional[datetime] = None
    final_result: Optional[str] = None
    final_remark: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class AbnormalRecordDetailResponse(AbnormalRecordResponse):
    original_evidences: List["OriginalEvidenceResponse"] = Field(default_factory=list)
    state_logs: List["RecordStateLogResponse"] = Field(default_factory=list)
    attachments: List["AttachmentResponse"] = Field(default_factory=list)


class OriginalEvidenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source_file_id: Optional[int] = None
    original_row_number: Optional[int] = None
    original_value: str
    parsed_field: str
    parsed_value: Optional[str] = None
    parse_note: Optional[str] = None
    created_at: datetime


class OriginalFileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    file_name: str
    file_hash: Optional[str] = None
    file_size: Optional[int] = None
    source_type: DataSource
    uploaded_by: Optional[str] = None
    uploaded_at: datetime
    total_rows: Optional[int] = None
    success_rows: Optional[int] = None
    failed_rows: Optional[int] = None


class RecordStateLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    from_state: Optional[RecordState] = None
    to_state: RecordState
    operator: str
    reason: str
    change_time: datetime
    log_data: Dict[str, Any] = Field(default_factory=dict)


class BatchStateLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    from_state: Optional[BatchState] = None
    to_state: BatchState
    operator: str
    reason: str
    change_time: datetime
    log_data: Dict[str, Any] = Field(default_factory=dict)


class AttachmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    file_name: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    uploaded_by: Optional[str] = None
    uploaded_at: datetime
    description: Optional[str] = None


class StateChangeRequest(BaseModel):
    reason: str
    operator: str
    log_data: Optional[Dict[str, Any]] = None


class ImportResult(BaseModel):
    total: int
    success: int
    failed: int
    failed_details: List[Dict[str, Any]] = Field(default_factory=list)


class ExportSummary(BaseModel):
    batch_id: str
    batch_name: str
    export_time: datetime
    exported_by: str
    state_before_freeze: Optional[BatchState] = None
    state_after_freeze: Optional[BatchState] = None
    freeze_reason: Optional[str] = None
    freeze_operator: Optional[str] = None
    total_records: int
    approved_count: int
    rejected_count: int
    pending_count: int
    manual_override_count: int
    total_cost: int
    recovered_cost: int
    records: List[Dict[str, Any]]


class ErrorResponse(BaseModel):
    detail: str
    code: str
    timestamp: datetime


BatchDetailResponse.model_rebuild()
AbnormalRecordDetailResponse.model_rebuild()
