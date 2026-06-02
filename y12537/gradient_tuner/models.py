from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from enum import Enum


class IssueType(Enum):
    LEARNING_RATE_EXPLOSION = "learning_rate_explosion"
    LOCAL_MINIMUM = "local_minimum"
    INSUFFICIENT_ITERATIONS = "insufficient_iterations"
    MISSING_LEARNING_RATE = "missing_learning_rate"
    CORRUPTED_LOSS_RECORD = "corrupted_loss_record"
    RENAMED_CLASS_RECORD = "renamed_class_record"


@dataclass
class LossRecord:
    iteration: int
    loss_value: float
    raw_line: str = ""
    note: str = ""
    source_file: str = ""


@dataclass
class TrainingRecord:
    record_id: str
    class_name: str
    loss_function: str
    original_class_name: str = ""
    loss_function_note: str = ""
    learning_rate: Optional[float] = None
    learning_rate_source: str = ""
    iterations: int = 0
    loss_history: List[LossRecord] = field(default_factory=list)
    final_loss: Optional[float] = None
    source_file: str = ""

    @property
    def is_learning_rate_missing(self) -> bool:
        return self.learning_rate is None

    @property
    def actual_iterations(self) -> int:
        return len(self.loss_history)


@dataclass
class Issue:
    issue_type: IssueType
    severity: str
    message: str
    record_id: str
    class_name: str
    details: Dict = field(default_factory=dict)
    suggestion: str = ""


@dataclass
class CheckResult:
    record_id: str
    class_name: str
    issues: List[Issue] = field(default_factory=list)
    learning_rate_ok: bool = True
    convergence_ok: bool = True
    iteration_ok: bool = True
    loss_trend: List[float] = field(default_factory=list)
    explosive_points: List[int] = field(default_factory=list)
    plateau_points: List[Tuple[int, int]] = field(default_factory=list)


@dataclass
class ProcessSnapshot:
    stage: str
    record_id: str
    class_name: str
    data_before: Dict
    data_after: Dict
    timestamp: str
    operation: str
