from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class SourceType(str, Enum):
    VERSION_NOTE = "version_note"
    REVIEW_RECORD = "review_record"
    ORAL_NOTE = "oral_note"


class ReviewStatus(str, Enum):
    PASS = "pass"
    FAIL = "fail"
    PENDING = "pending"
    DUPLICATE = "duplicate"


class ReferenceItem(BaseModel):
    id: str
    text: str
    source: str
    version: Optional[str] = None


class SampleRecord(BaseModel):
    sample_id: str
    sample_name: str
    category: Optional[str] = None
    content: str
    status: ReviewStatus
    references: List[ReferenceItem] = Field(default_factory=list)
    missing_references: List[str] = Field(default_factory=list)
    is_duplicate: bool = False
    duplicate_of: Optional[str] = None
    review_version: str
    source_type: SourceType
    raw_content: str
    created_at: datetime = Field(default_factory=datetime.now)


class VersionNote(BaseModel):
    version: str
    title: str
    content: str
    created_at: datetime = Field(default_factory=datetime.now)
    source_file: str


class MaterialVersion(BaseModel):
    version: str
    source_type: SourceType
    content: str
    created_at: datetime
    source_file: str


class ChangeItem(BaseModel):
    field: str
    old_value: str
    new_value: str
    change_type: str
    sample_id: Optional[str] = None


class VersionDiff(BaseModel):
    old_version: str
    new_version: str
    changes: List[ChangeItem] = Field(default_factory=list)
    changed_samples: List[str] = Field(default_factory=list)


class ReviewMetric(BaseModel):
    total_samples: int = 0
    pass_count: int = 0
    fail_count: int = 0
    pending_count: int = 0
    duplicate_count: int = 0
    pass_rate: float = 0.0
    missing_ref_count: int = 0
    missing_ref_rate: float = 0.0
    avg_refs_per_sample: float = 0.0


class MetricDetail(BaseModel):
    metric: ReviewMetric
    top_influential_samples: List[SampleRecord] = Field(default_factory=list)
    duplicate_samples: List[SampleRecord] = Field(default_factory=list)
    missing_ref_samples: List[SampleRecord] = Field(default_factory=list)


class FilterCriteria(BaseModel):
    versions: Optional[List[str]] = None
    categories: Optional[List[str]] = None
    statuses: Optional[List[ReviewStatus]] = None
    source_types: Optional[List[SourceType]] = None
    has_missing_refs: Optional[bool] = None
    is_duplicate: Optional[bool] = None


class ReportConfig(BaseModel):
    title: str = "代码审查指标报告"
    include_details: bool = True
    include_filter_criteria: bool = True
    include_version_diff: bool = True


class DashboardSummary(BaseModel):
    versions: List[str]
    categories: List[str]
    source_types: List[SourceType]
    overall_metric: ReviewMetric
    by_version: Dict[str, ReviewMetric] = Field(default_factory=dict)
    by_category: Dict[str, ReviewMetric] = Field(default_factory=dict)
    by_source_type: Dict[str, ReviewMetric] = Field(default_factory=dict)
