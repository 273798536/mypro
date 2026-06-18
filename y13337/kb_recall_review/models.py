from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class JudgmentType(str, Enum):
    CORRECT = "correct"
    INCORRECT = "incorrect"
    UNCERTAIN = "uncertain"


class ReviewStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    NEEDS_CONFIRMATION = "needs_confirmation"


@dataclass
class SampleRecord:
    sample_id: str
    query: str
    expected_knowledge_id: str
    expected_knowledge_title: str
    raw_row_index: Optional[int] = None
    source_sheet: Optional[str] = None
    notes: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    is_bad_data: bool = False
    bad_data_reason: Optional[str] = None


@dataclass
class ModelResult:
    sample_id: str
    model_version: str
    recall_knowledge_id: str
    recall_knowledge_title: str
    confidence_score: float
    rank: int
    threshold: float
    is_above_threshold: bool = False
    is_hit: bool = False

    def __post_init__(self):
        self.is_above_threshold = self.confidence_score >= self.threshold


@dataclass
class ManualReviewRecord:
    sample_id: str
    reviewer: str
    review_time: datetime
    judgment: JudgmentType
    original_judgment: JudgmentType
    changed_by_threshold: bool = False
    review_notes: Optional[str] = None
    knowledge_id_confirmed: Optional[str] = None


@dataclass
class DuplicateInfo:
    sample_id: str
    duplicate_count: int
    occurrences: List[Dict[str, Any]]
    conflict_found: bool = False
    conflict_details: Optional[str] = None


@dataclass
class ProcessTimelineEntry:
    timestamp: datetime
    event_type: str
    description: str
    sample_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ReviewSummary:
    total_samples: int = 0
    unique_samples: int = 0
    bad_data_count: int = 0
    duplicate_count: int = 0
    old_model_hit_rate: float = 0.0
    new_model_hit_rate: float = 0.0
    manual_changed_count: int = 0
    threshold_changed_count: int = 0
    needs_confirmation_count: int = 0
