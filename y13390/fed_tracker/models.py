from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator


class TaskStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    PROCESSED = "processed"
    SKIPPED = "skipped"
    BAD_RECORD = "bad_record"
    REVISED = "revised"


class RecordIssue(str, Enum):
    LATE_ATTACHMENT = "late_attachment"
    VERSION_ALIAS = "version_alias"
    OLD_MODEL_MISJUDGE = "old_model_misjudge"
    INVALID_FORMAT = "invalid_format"
    MISSING_REQUIRED = "missing_required"
    DATA_CORRUPTED = "data_corrupted"


class TaskRecord(BaseModel):
    task_id: str
    client_id: str
    task_type: str
    payload: Dict[str, Any]
    created_at: datetime = Field(default_factory=datetime.now)
    status: TaskStatus = TaskStatus.PENDING
    issues: List[RecordIssue] = Field(default_factory=list)
    notes: List[str] = Field(default_factory=list)
    attachment_arrived: bool = True
    attachment_delay_seconds: int = 0
    is_version_alias: bool = False
    model_version: str = "v2"
    old_model_prediction: Optional[bool] = None
    revision_reason: Optional[str] = None

    @field_validator("task_id")
    def task_id_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("task_id cannot be empty")
        return v


class ProcessingResult(BaseModel):
    total: int = 0
    processed: int = 0
    skipped: int = 0
    bad_records: int = 0
    revised: int = 0
    processed_ids: List[str] = Field(default_factory=list)
    skipped_ids: List[str] = Field(default_factory=list)
    bad_record_ids: List[str] = Field(default_factory=list)
    revised_ids: List[str] = Field(default_factory=list)
    bad_record_details: List[Dict[str, Any]] = Field(default_factory=list)
    skip_reasons: Dict[str, str] = Field(default_factory=dict)
    revision_explanations: Dict[str, str] = Field(default_factory=dict)
    started_at: datetime = Field(default_factory=datetime.now)
    finished_at: Optional[datetime] = None
    run_id: str = ""


class TaskSummary(BaseModel):
    run_id: str
    started_at: datetime
    finished_at: Optional[datetime]
    total: int
    processed: int
    skipped: int
    bad_records: int
    revised: int
    status: str
    page_summary: str
    historical_notes: List[str] = Field(default_factory=list)


class GrayConfig(BaseModel):
    name: str
    description: str
    enabled: bool = True
    records: List[TaskRecord]
