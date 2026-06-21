from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class TaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    EVALUATING = "evaluating"
    PARTIAL_FAILED = "partial_failed"
    FAILED = "failed"
    SUCCESS = "success"
    CLOSED = "closed"


class JudgmentResult(str, Enum):
    PASS = "pass"
    FAIL = "fail"
    NEEDS_REVIEW = "needs_review"
    GRAYSCALE_ABNORMAL = "grayscale_abnormal"


class EventType(str, Enum):
    TASK_CREATED = "task_created"
    EVAL_STARTED = "eval_started"
    EVAL_RESULT_RECEIVED = "eval_result_received"
    ATTACHMENT_RECEIVED = "attachment_received"
    LATE_ATTACHMENT_LINKED = "late_attachment_linked"
    SAMPLE_JUDGMENT = "sample_judgment"
    GRAYSCALE_ABNORMAL_MARKED = "grayscale_abnormal_marked"
    MANUAL_JUDGMENT_OVERRIDE = "manual_judgment_override"
    TASK_CONCLUDED = "task_concluded"
    TASK_CLOSED = "task_closed"
    NOTE_ADDED = "note_added"


class TaskBase(BaseModel):
    task_name: str
    model_version: str
    eval_dataset: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    owner: str = "platform_algo"
    description: Optional[str] = None


class TaskCreate(TaskBase):
    pass


class Task(TaskBase):
    task_id: str
    status: TaskStatus = TaskStatus.PENDING
    final_conclusion: Optional[JudgmentResult] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AttachmentBase(BaseModel):
    task_id: str
    attachment_type: str
    source: str
    content_ref: str
    is_late: bool = False
    metadata: Dict[str, Any] = Field(default_factory=dict)


class AttachmentCreate(AttachmentBase):
    pass


class Attachment(AttachmentBase):
    attachment_id: str
    received_at: datetime
    linked_to_conclusion: bool = False

    class Config:
        from_attributes = True


class SampleBase(BaseModel):
    task_id: str
    sample_id: str
    input_data_ref: Optional[str] = None
    expected_output: Optional[str] = None
    actual_output: Optional[str] = None


class SampleCreate(SampleBase):
    pass


class Sample(SampleBase):
    db_id: int
    judgment: Optional[JudgmentResult] = None
    is_outlier: bool = False
    outlier_reason: Optional[str] = None
    judged_at: Optional[datetime] = None
    judged_by: Optional[str] = None

    class Config:
        from_attributes = True


class GrayscaleAbnormalRecordBase(BaseModel):
    task_id: str
    sample_id: Optional[str] = None
    expected_grayscale_ratio: float
    actual_grayscale_ratio: float
    reason: str
    detected_by: str = "platform_algo"


class GrayscaleAbnormalRecordCreate(GrayscaleAbnormalRecordBase):
    pass


class GrayscaleAbnormalRecord(GrayscaleAbnormalRecordBase):
    record_id: str
    detected_at: datetime
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    resolution_note: Optional[str] = None

    class Config:
        from_attributes = True


class JudgmentOverrideBase(BaseModel):
    task_id: str
    sample_id: Optional[str] = None
    original_judgment: JudgmentResult
    new_judgment: JudgmentResult
    reason: str
    operator: str
    original_source: str = "auto_eval"


class JudgmentOverrideCreate(JudgmentOverrideBase):
    pass


class JudgmentOverride(JudgmentOverrideBase):
    override_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class EventBase(BaseModel):
    task_id: str
    event_type: EventType
    message: str
    operator: str = "system"
    metadata: Dict[str, Any] = Field(default_factory=dict)


class EventCreate(EventBase):
    pass


class Event(EventBase):
    event_id: str
    timestamp: datetime

    class Config:
        from_attributes = True


class TaskTimeline(BaseModel):
    task: Task
    events: List[Event]
    attachments: List[Attachment]
    samples: List[Sample]
    grayscale_abnormals: List[GrayscaleAbnormalRecord]
    judgment_overrides: List[JudgmentOverride]


class OutlierSampleSummary(BaseModel):
    sample: Sample
    judgment_overrides: List[JudgmentOverride]
    related_events: List[Event]


class TaskConclusionDetail(BaseModel):
    task: Task
    total_samples: int
    pass_count: int
    fail_count: int
    needs_review_count: int
    grayscale_abnormal_count: int
    outlier_samples: List[OutlierSampleSummary]
    final_attachment: Optional[Attachment]
    judgment_overrides: List[JudgmentOverride]
