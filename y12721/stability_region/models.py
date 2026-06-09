from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any, Tuple
from enum import Enum
from datetime import datetime


class StabilityVerdict(Enum):
    STABLE = "stable"
    UNSTABLE = "unstable"
    UNKNOWN = "unknown"
    INSUFFICIENT_DATA = "insufficient_data"


class ConfirmationStatus(Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"
    SUPPLEMENTED = "supplemented"


@dataclass
class StudentAnswer:
    student_id: str
    problem_id: str
    coefficients: Optional[Dict[str, float]] = None
    answer_text: Optional[str] = None
    is_wrong: Optional[bool] = None
    submitted_at: Optional[datetime] = None
    arrived_at: datetime = field(default_factory=datetime.now)
    is_late: bool = False
    raw_data: Optional[Dict[str, Any]] = None
    notes: str = ""


@dataclass
class BoundarySample:
    sample_id: str
    coefficients: Dict[str, float]
    expected_verdict: StabilityVerdict
    is_bad_data: bool = False
    bad_data_type: Optional[str] = None
    description: str = ""


@dataclass
class Constraint:
    name: str
    description: str
    check_fn_name: str
    enabled: bool = True


@dataclass
class CounterExample:
    example_id: str
    coefficients_before: Dict[str, float]
    coefficients_after: Optional[Dict[str, float]]
    verdict_before: StabilityVerdict
    verdict_after: StabilityVerdict
    constraint_triggered: str
    explanation: str = ""


@dataclass
class ParameterGap:
    problem_id: str
    missing_parameters: List[str]
    student_ids: List[str]
    reason: str = ""


@dataclass
class StabilityResult:
    result_id: str
    problem_id: str
    verdict: StabilityVerdict
    eigenvalues: List[complex] = field(default_factory=list)
    explanation: str = ""
    counter_example: Optional[CounterExample] = None
    student_ids: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    confirmation_status: ConfirmationStatus = ConfirmationStatus.PENDING
    confirmed_by: Optional[str] = None
    confirmed_at: Optional[datetime] = None
    run_count: int = 1
    last_run_at: datetime = field(default_factory=datetime.now)
    review_notes: str = ""
    has_supplement: bool = False


@dataclass
class BatchRunReport:
    batch_id: str
    total_problems: int
    successful: int
    failed: int
    skipped: int
    gaps: List[ParameterGap] = field(default_factory=list)
    results: List[StabilityResult] = field(default_factory=list)
    started_at: datetime = field(default_factory=datetime.now)
    finished_at: Optional[datetime] = None
