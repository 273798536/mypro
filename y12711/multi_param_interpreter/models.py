from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime


class DataSource(Enum):
    HISTORICAL_ANSWERS = "historical_answers"
    STUDENT_MISTAKES = "student_mistakes"
    QUESTION_LIST = "question_list"


class JudgmentStatus(Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    NEEDS_REVIEW = "needs_review"
    EDGE_CASE = "edge_case"


class ReviewAction(Enum):
    CONFIRM = "confirm"
    ADJUST = "adjust"
    REJECT = "reject"
    SUPPLEMENT = "supplement"


@dataclass
class QuestionRecord:
    question_id: str
    source: DataSource
    raw_data: Dict[str, Any]
    difficulty: Optional[float] = None
    discrimination: Optional[float] = None
    guess_rate: Optional[float] = None
    correct_count: Optional[int] = None
    total_count: Optional[int] = None
    mistake_count: Optional[int] = None
    answer_text: Optional[str] = None
    import_batch_id: Optional[str] = None
    id: Optional[int] = None


@dataclass
class ImportBatch:
    batch_id: str
    source: DataSource
    file_name: str
    total_records: int = 0
    success_count: int = 0
    skipped_count: int = 0
    error_count: int = 0
    skipped_details: List[Dict[str, Any]] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    id: Optional[int] = None


@dataclass
class CalculationRecord:
    question_id: str
    batch_id: str
    parameter_name: str
    raw_value: Optional[float]
    adjusted_value: Optional[float]
    formula_before: str
    formula_after: str
    explanation_before: str
    explanation_after: str
    judgment_before: JudgmentStatus
    judgment_after: JudgmentStatus
    is_edge_case: bool = False
    edge_type: Optional[str] = None
    edge_detail: Optional[str] = None
    source_material: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    id: Optional[int] = None


@dataclass
class ReviewRecord:
    calculation_id: int
    action: ReviewAction
    reviewer_note: str
    parameter_adjustment: Optional[Dict[str, float]] = None
    supplementary_data: Optional[Dict[str, Any]] = None
    reviewed_at: str = field(default_factory=lambda: datetime.now().isoformat())
    reviewed_by: str = "editor"
    id: Optional[int] = None


@dataclass
class ReportEntry:
    question_id: str
    final_judgment: JudgmentStatus
    edge_case_info: Optional[str]
    formula_diff: str
    source_trace: str
    review_history: List[str] = field(default_factory=list)
