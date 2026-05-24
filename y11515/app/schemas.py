from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class RecordStateEnum(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    FROZEN = "frozen"
    ARCHIVED = "archived"
    WITHDRAWN = "withdrawn"


class AttachmentTypeEnum(str, Enum):
    SITE_PHOTO = "site_photo"
    SMS_SCREENSHOT = "sms_screenshot"
    HANDOVER_PAPER = "handover_paper"
    OTHER = "other"


class RecordCreate(BaseModel):
    original_row_no: int
    work_order_no: str
    valve_code: Optional[str] = None
    valve_name: Optional[str] = None
    inventory_before: Optional[float] = None
    used_quantity: Optional[float] = None
    inventory_after: Optional[float] = None
    repair_date: Optional[datetime] = None
    site: Optional[str] = None
    construction_person: Optional[str] = None
    raw_data: Optional[str] = None
    parsed_data: Optional[str] = None


class BatchCreate(BaseModel):
    batch_no: str
    source_file_name: Optional[str] = None
    operator: str
    station: str
    records: List[RecordCreate]


class BatchResponse(BaseModel):
    id: int
    batch_no: str
    source_file_name: Optional[str]
    operator: str
    station: str
    total_count: int
    success_count: int
    failed_count: int
    status: str
    is_frozen: bool
    freeze_reason: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RecordResponse(BaseModel):
    id: int
    batch_id: int
    original_row_no: int
    work_order_no: str
    valve_code: Optional[str]
    valve_name: Optional[str]
    inventory_before: Optional[float]
    used_quantity: Optional[float]
    inventory_after: Optional[float]
    is_negative_inventory: bool
    repair_date: Optional[datetime]
    site: Optional[str]
    construction_person: Optional[str]
    status: str
    original_status: Optional[str]
    review_reason: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RecordDetailResponse(RecordResponse):
    has_site_photo: bool
    has_handover_paper: bool
    override_count: int
    state_history_count: int


class AttachmentResponse(BaseModel):
    id: int
    attachment_type: str
    file_name: str
    file_size: int
    uploaded_by: str
    uploaded_at: datetime
    description: Optional[str]

    class Config:
        from_attributes = True


class StateHistoryResponse(BaseModel):
    id: int
    from_state: Optional[str]
    to_state: str
    transition_type: str
    operator: str
    reason: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class OverrideRecordResponse(BaseModel):
    id: int
    original_status: str
    new_status: str
    override_reason: str
    operator: str
    permission_level: str
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewRequest(BaseModel):
    new_status: RecordStateEnum
    reason: str
    operator: str
    permission_level: str = "normal"


class FreezeRequest(BaseModel):
    reason: str
    operator: str


class UnfreezeRequest(BaseModel):
    reason: str
    operator: str


class BatchDetailResponse(BatchResponse):
    records: List[RecordResponse]
    attachments: List[AttachmentResponse]
    state_histories: List[StateHistoryResponse]


class ExportSummaryResponse(BaseModel):
    batch_no: str
    station: str
    operator: str
    export_time: datetime
    total_count: int
    approved_count: int
    rejected_count: int
    submitted_count: int
    frozen_count: int
    withdrawn_count: int
    is_frozen: bool
    status_before_freeze: Optional[str]
    freeze_reason: Optional[str]
    frozen_at: Optional[datetime]
    frozen_by: Optional[str]
    records: List[dict]


class FailedRecordResponse(BaseModel):
    batch_no: str
    original_row_no: int
    work_order_no: str
    error_message: str


class BatchImportResponse(BaseModel):
    batch_id: int
    batch_no: str
    total_count: int
    success_count: int
    failed_count: int
    failed_records: List[FailedRecordResponse]
    created_at: datetime
