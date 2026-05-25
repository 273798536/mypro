from datetime import datetime
from enum import Enum as PyEnum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from app.models import WorkOrderStatus, SourceType, Role


class UserBase(BaseModel):
    username: str
    real_name: str
    role: Role


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: int
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


class RawRecordBase(BaseModel):
    original_line_number: int
    original_data: Dict[str, Any]
    parsed_data: Optional[Dict[str, Any]] = None


class RawRecord(RawRecordBase):
    id: int
    import_record_id: int
    parse_error: Optional[str] = None
    is_parsed: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ImportRecordBase(BaseModel):
    source_file: str
    source_type: SourceType


class ImportRecordCreate(ImportRecordBase):
    file_hash: Optional[str] = None
    uploaded_by: Optional[int] = None


class ImportRecord(ImportRecordBase):
    id: int
    uploaded_at: datetime
    total_rows: int
    success_rows: int
    failed_rows: int
    error_details: Optional[List[Dict[str, Any]]] = None
    raw_records: List[RawRecord] = []

    class Config:
        from_attributes = True


class StatusTransitionBase(BaseModel):
    to_status: WorkOrderStatus
    reason: str


class StatusTransitionCreate(StatusTransitionBase):
    operator_id: int
    from_status: Optional[WorkOrderStatus] = None


class StatusTransition(StatusTransitionBase):
    id: int
    work_order_id: int
    from_status: Optional[WorkOrderStatus] = None
    operator_id: int
    operator: User
    occurred_at: datetime

    class Config:
        from_attributes = True


class EvidenceBase(BaseModel):
    evidence_type: str
    reference: str
    description: Optional[str] = None


class EvidenceCreate(EvidenceBase):
    work_order_id: int
    uploaded_by: Optional[int] = None
    is_original: bool = True


class Evidence(EvidenceBase):
    id: int
    work_order_id: int
    uploaded_by: Optional[int] = None
    uploaded_at: datetime
    is_original: bool

    class Config:
        from_attributes = True


class JudgmentBase(BaseModel):
    judgment_type: str
    reason: str
    new_data: Optional[Dict[str, Any]] = None


class JudgmentCreate(JudgmentBase):
    work_order_id: int
    judge_id: int
    previous_data: Optional[Dict[str, Any]] = None


class Judgment(JudgmentBase):
    id: int
    work_order_id: int
    judge_id: int
    made_at: datetime
    previous_data: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class WorkOrderBase(BaseModel):
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    spare_part_batch: Optional[str] = None
    hotline_number: Optional[str] = None
    inspection_photo_ref: Optional[str] = None
    manual_price_adjustment: Optional[Dict[str, Any]] = None


class WorkOrderCreate(WorkOrderBase):
    work_order_no: str
    creator_id: int
    raw_record_id: Optional[int] = None


class WorkOrderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    spare_part_batch: Optional[str] = None
    hotline_number: Optional[str] = None
    inspection_photo_ref: Optional[str] = None
    manual_price_adjustment: Optional[Dict[str, Any]] = None


class WorkOrder(WorkOrderBase):
    id: int
    work_order_no: str
    status: WorkOrderStatus
    raw_record_id: Optional[int] = None
    creator_id: int
    creator: User
    created_at: datetime
    updated_at: datetime
    is_frozen: bool
    frozen_at: Optional[datetime] = None
    status_transitions: List[StatusTransition] = []
    evidences: List[Evidence] = []
    judgments: List[Judgment] = []

    class Config:
        from_attributes = True


class WorkOrderDetail(WorkOrder):
    raw_record: Optional[RawRecord] = None


class StatusChangeRequest(BaseModel):
    new_status: WorkOrderStatus
    reason: str
    operator_id: int


class FreezeRequest(BaseModel):
    reason: str
    operator_id: int


class ExportRequest(BaseModel):
    work_order_ids: Optional[List[int]] = None
    export_type: str = "excel"
    mask_sensitive: bool = True
    exported_by: int


class ImportResult(BaseModel):
    import_record_id: int
    total: int
    success: int
    failed: int
    errors: List[Dict[str, Any]] = []


class RoleViewItem(BaseModel):
    field_name: str
    display_name: str
    visible: bool
    masked: bool = False


class RoleViewConfig(BaseModel):
    role: Role
    view_items: List[RoleViewItem]


class TaskStatus(PyEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    RETRYING = "retrying"
    FAILED = "failed"
    COMPLETED = "completed"
    DEAD_LETTER = "dead_letter"


class TaskType(PyEnum):
    IMPORT = "import"
    EXPORT = "export"
    STATUS_CHANGE = "status_change"
    NOTIFICATION = "notification"
    DATA_SYNC = "data_sync"
    EVIDENCE_PROCESS = "evidence_process"


class RetryTaskBase(BaseModel):
    task_type: TaskType
    task_data: Dict[str, Any]
    max_retries: int = 3
    work_order_id: Optional[int] = None
    priority: int = 0


class RetryTaskCreate(RetryTaskBase):
    created_by: Optional[int] = None


class RetryTask(RetryTaskBase):
    id: int
    status: TaskStatus
    retry_count: int
    last_error: Optional[str] = None
    last_retry_at: Optional[datetime] = None
    next_retry_at: datetime
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DeadLetterTaskBase(BaseModel):
    task_type: TaskType
    task_data: Dict[str, Any]
    error_message: str
    retry_count: int
    work_order_id: Optional[int] = None


class DeadLetterTask(DeadLetterTaskBase):
    id: int
    original_task_id: int
    error_stacktrace: Optional[str] = None
    moved_at: datetime
    moved_by: Optional[int] = None
    is_resolved: bool = False
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[int] = None
    resolution_note: Optional[str] = None

    class Config:
        from_attributes = True


class DeadLetterResolveRequest(BaseModel):
    dlq_id: int
    resolved_by: int
    resolution_note: str
    requeue: bool = False


class ReplaySessionBase(BaseModel):
    name: str
    description: Optional[str] = None
    work_order_id: int


class ReplaySessionCreate(ReplaySessionBase):
    created_by: int


class ReplaySession(ReplaySessionBase):
    id: int
    start_time: datetime
    end_time: datetime
    created_by: int
    created_at: datetime
    status: str
    replay_events: Optional[List[Dict[str, Any]]] = None

    class Config:
        from_attributes = True


class ReplayToTimestampRequest(BaseModel):
    session_id: int
    target_timestamp: datetime


class QueueStats(BaseModel):
    retry_queue: Dict[str, int]
    dead_letter_queue: Dict[str, int]
