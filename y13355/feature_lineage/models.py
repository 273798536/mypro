from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field, validator


class ConfigSource(str, Enum):
    GRAYSCALE = "grayscale"
    MANUAL = "manual"
    INCREMENTAL = "incremental"
    TEST = "test"


class ChangeType(str, Enum):
    SAMPLE = "sample"
    THRESHOLD = "threshold"
    MANUAL_OVERRIDE = "manual_override"
    CONFIG_UPDATE = "config_update"


class RowStatus(str, Enum):
    PROCESSED = "processed"
    BAD = "bad"
    SKIPPED = "skipped"
    PENDING = "pending"


class GrayscaleFeature(BaseModel):
    feature_id: str
    feature_name: str
    threshold: Optional[float] = None
    sample_ids: List[str] = Field(default_factory=list)
    source_line: Optional[int] = None
    source_file: Optional[str] = None
    config_source: ConfigSource = ConfigSource.GRAYSCALE
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    notes: Optional[str] = None


class GrayscaleConfig(BaseModel):
    config_id: str
    version: str
    source_file: str
    features: List[GrayscaleFeature] = Field(default_factory=list)
    loaded_at: datetime = Field(default_factory=datetime.now)
    is_partial: bool = False
    parent_config_id: Optional[str] = None

    def get_feature(self, feature_id: str) -> Optional[GrayscaleFeature]:
        for f in self.features:
            if f.feature_id == feature_id:
                return f
        return None


class ChangeAudit(BaseModel):
    audit_id: str
    feature_id: str
    change_type: ChangeType
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None
    source: ConfigSource
    source_line: Optional[int] = None
    source_file: Optional[str] = None
    changed_by: str = "system"
    changed_at: datetime = Field(default_factory=datetime.now)
    reason: Optional[str] = None
    is_overwrite: bool = False


class RowDetail(BaseModel):
    row_index: int
    status: RowStatus
    feature_id: Optional[str] = None
    raw_data: Dict[str, Any] = Field(default_factory=dict)
    error_message: Optional[str] = None
    skip_reason: Optional[str] = None
    source_line: Optional[int] = None
    source_object: Optional[str] = None
    matched_feature: Optional[str] = None


class ProcessingStats(BaseModel):
    total: int = 0
    processed: int = 0
    bad: int = 0
    skipped: int = 0
    pending: int = 0

    @property
    def breakdown(self) -> Dict[str, int]:
        return {
            "total": self.total,
            "processed": self.processed,
            "bad": self.bad,
            "skipped": self.skipped,
            "pending": self.pending,
        }


class ProcessingResult(BaseModel):
    task_id: str
    config_id: str
    stats: ProcessingStats = Field(default_factory=ProcessingStats)
    rows: List[RowDetail] = Field(default_factory=list)
    start_time: datetime = Field(default_factory=datetime.now)
    end_time: Optional[datetime] = None
    has_delayed_feature: bool = False
    delayed_feature_id: Optional[str] = None
    changes: List[ChangeAudit] = Field(default_factory=list)

    def get_rows_by_status(self, status: RowStatus) -> List[RowDetail]:
        return [r for r in self.rows if r.status == status]


class ReportSection(BaseModel):
    title: str
    content: List[str] = Field(default_factory=list)
    details: List[Dict[str, Any]] = Field(default_factory=list)


class LineageReport(BaseModel):
    report_id: str
    task_id: str
    config_id: str
    generated_at: datetime = Field(default_factory=datetime.now)
    summary: ReportSection
    sample_changes: ReportSection
    threshold_changes: ReportSection
    manual_overrides: ReportSection
    bad_data_issues: ReportSection
    raw_data_references: ReportSection
    config_traceability: ReportSection
