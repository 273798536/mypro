from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class Severity(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class FeedbackStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"
    NEEDS_REVIEW = "needs_review"


class DataSource(str, Enum):
    TRAINING_SAMPLE = "training_sample"
    PRODUCTION_LOG = "production_log"
    GRAY_RELEASE = "gray_release"
    MANUAL_REVIEW = "manual_review"


class DesensitizationRule(BaseModel):
    rule_id: str
    name: str
    description: str
    pattern: str
    severity: Severity
    category: str
    enabled: bool = True
    version: str = "1.0.0"


class LogEntry(BaseModel):
    model_config = ConfigDict(extra="allow")

    line_number: int
    raw_text: str
    source_file: str
    source_note: Optional[str] = None
    image_name: Optional[str] = None
    timestamp: Optional[datetime] = None
    data_source: DataSource = DataSource.PRODUCTION_LOG
    metadata: Dict[str, Any] = Field(default_factory=dict)


class Finding(BaseModel):
    finding_id: str
    rule_id: str
    rule_name: str
    severity: Severity
    category: str
    matched_text: str
    start_offset: int
    end_offset: int
    line_number: int
    source_file: str
    source_note: Optional[str] = None
    image_name: Optional[str] = None
    suggestion: Optional[str] = None
    truncated: bool = False
    truncation_reason: Optional[str] = None
    feedback_status: FeedbackStatus = FeedbackStatus.PENDING
    feedback_comment: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None


class CheckResult(BaseModel):
    result_id: str
    check_time: datetime
    prompt_version: Optional[str] = None
    sample_batch: Optional[str] = None
    rollback_from: Optional[str] = None
    total_lines: int = 0
    total_findings: int = 0
    findings: List[Finding] = Field(default_factory=list)
    source_files: List[str] = Field(default_factory=list)
    summary: Dict[str, Any] = Field(default_factory=dict)
    data_source: DataSource = DataSource.PRODUCTION_LOG
    review_round: Optional[str] = None


class DistributionStat(BaseModel):
    category: str
    count: int
    percentage: float
    severity_breakdown: Dict[Severity, int]


class ComparisonDiff(BaseModel):
    finding_id: Optional[str] = None
    rule_id: str
    matched_text: str
    line_number: int
    source_file: str
    status: str
    base_only: bool = False
    target_only: bool = False
    severity_changed: bool = False
    base_severity: Optional[Severity] = None
    target_severity: Optional[Severity] = None


class GrayComparisonResult(BaseModel):
    comparison_id: str
    base_result_id: str
    target_result_id: str
    compare_time: datetime
    total_base_findings: int = 0
    total_target_findings: int = 0
    new_findings: int = 0
    resolved_findings: int = 0
    severity_changed: int = 0
    diffs: List[ComparisonDiff] = Field(default_factory=list)
    summary: Dict[str, Any] = Field(default_factory=dict)


class PlaybackRecord(BaseModel):
    playback_id: str
    result_id: str
    finding_id: str
    original_line_number: int
    original_source_file: str
    original_raw_text: str
    context_before: List[str] = Field(default_factory=list)
    context_after: List[str] = Field(default_factory=list)
    source_note: Optional[str] = None
    image_name: Optional[str] = None
