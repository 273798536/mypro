from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class JudgmentStatus(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    PENDING = "PENDING"
    SUSPENDED = "SUSPENDED"


class ChangeType(str, Enum):
    SAMPLE_CHANGED = "SAMPLE_CHANGED"
    THRESHOLD_CHANGED = "THRESHOLD_CHANGED"
    MANUAL_REVISED = "MANUAL_REVISED"
    LATE_ATTACHMENT = "LATE_ATTACHMENT"
    NO_CHANGE = "NO_CHANGE"


@dataclass
class ModelOutput:
    raw_line_number: int
    sample_id: str
    model_score: float
    model_prediction: str
    confidence: float
    raw_object: Dict[str, Any]
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class Sample:
    sample_id: str
    product_line: str
    category: str
    batch_number: str
    image_path: str
    captured_at: datetime
    meta: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ThresholdConfig:
    version: str
    product_line: str
    category: str
    pass_threshold: float
    fail_threshold: float
    effective_from: datetime
    effective_to: Optional[datetime] = None
    is_active: bool = True


@dataclass
class ManualJudgment:
    judgment_id: str
    sample_id: str
    operator: str
    judgment: JudgmentStatus
    reason: str
    judged_at: datetime
    is_late: bool = False


@dataclass
class Attachment:
    attachment_id: str
    sample_id: str
    file_path: str
    file_type: str
    uploaded_at: datetime
    is_late_arrival: bool = False
    description: str = ""


@dataclass
class BadDataRecord:
    sample_id: str
    issue_type: str
    description: str
    model_output_line: Optional[int] = None
    model_object_ref: Optional[str] = None
    severity: str = "warning"


@dataclass
class ThresholdDriftRecord:
    sample_id: str
    product_line: str
    category: str
    current_threshold_version: str
    drift_magnitude: float
    suggested_action: str = "SUSPEND_FOR_REVIEW"
    needs_operation_confirm: bool = True


@dataclass
class ComparisonItem:
    sample_id: str
    sample: Sample
    model_output: ModelOutput
    baseline_status: JudgmentStatus
    current_status: JudgmentStatus
    change_type: ChangeType
    threshold_drift: Optional[ThresholdDriftRecord] = None
    manual_judgment: Optional[ManualJudgment] = None
    late_attachment: Optional[Attachment] = None
    bad_data: Optional[BadDataRecord] = None
    is_suspended: bool = False
    suspension_reason: str = ""


@dataclass
class ReportData:
    generated_at: datetime
    filter_conditions: Dict[str, Any]
    items: List[ComparisonItem]
    statistics: Dict[str, Any] = field(default_factory=dict)
    threshold_drifts: List[ThresholdDriftRecord] = field(default_factory=list)
    bad_data_records: List[BadDataRecord] = field(default_factory=list)
    late_attachments: List[Attachment] = field(default_factory=list)
