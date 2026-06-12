from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
import uuid
import json


class Unit(str, Enum):
    PERSON = "人"
    VEHICLE = "辆"
    GROUP = "组"
    MINUTE = "分钟"
    HOUR = "小时"
    SECOND = "秒"
    METER = "米"
    SQUARE_METER = "平方米"


class ExceptionType(str, Enum):
    UNIT_MISMATCH = "unit_mismatch"
    EXTRAPOLATION_OUT_OF_RANGE = "extrapolation_out_of_range"
    FORMULA_ERROR = "formula_error"
    MISSING_DATA = "missing_data"
    PARAMETER_OUT_OF_BOUNDS = "parameter_out_of_bounds"


class ConfirmationStatus(str, Enum):
    PENDING = "pending_confirmation"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"
    AUTO_PASSED = "auto_passed"


class CalculationStatus(str, Enum):
    SUCCESS = "success"
    WARNING = "warning"
    FAILED = "failed"
    NEEDS_CONFIRMATION = "needs_confirmation"


@dataclass
class QuestionItem:
    question_id: str
    name: str
    description: str
    formula_expression: str
    input_params: Dict[str, Any] = field(default_factory=dict)
    input_unit: Optional[Unit] = None
    expected_output_unit: Optional[Unit] = None
    supplementary_note: Optional[str] = None
    historical_reference: Optional[Dict[str, Any]] = field(default_factory=dict)
    source_trace: Dict[str, str] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        if self.input_unit:
            d["input_unit"] = self.input_unit.value
        if self.expected_output_unit:
            d["expected_output_unit"] = self.expected_output_unit.value
        return d


@dataclass
class CalculationException:
    exception_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    exception_type: ExceptionType = ExceptionType.UNIT_MISMATCH
    question_id: str = ""
    message: str = ""
    detail: Dict[str, Any] = field(default_factory=dict)
    suggestion: str = ""
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat(timespec="seconds"))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "exception_id": self.exception_id,
            "exception_type": self.exception_type.value,
            "question_id": self.question_id,
            "message": self.message,
            "detail": self.detail,
            "suggestion": self.suggestion,
            "timestamp": self.timestamp,
        }


@dataclass
class ManualConfirmation:
    confirmation_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    question_id: str = ""
    reason: str = ""
    original_value: Any = None
    original_unit: Optional[Unit] = None
    adjusted_value: Any = None
    adjusted_unit: Optional[Unit] = None
    operator: str = ""
    status: ConfirmationStatus = ConfirmationStatus.PENDING
    next_step: str = ""
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat(timespec="seconds"))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "confirmation_id": self.confirmation_id,
            "question_id": self.question_id,
            "reason": self.reason,
            "original_value": self.original_value,
            "original_unit": self.original_unit.value if self.original_unit else None,
            "adjusted_value": self.adjusted_value,
            "adjusted_unit": self.adjusted_unit.value if self.adjusted_unit else None,
            "operator": self.operator,
            "status": self.status.value,
            "next_step": self.next_step,
            "timestamp": self.timestamp,
        }


@dataclass
class CalculationResult:
    result_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    question_id: str = ""
    question_name: str = ""
    raw_value: Any = None
    raw_unit: Optional[Unit] = None
    adjusted_value: Any = None
    adjusted_unit: Optional[Unit] = None
    final_value: Any = None
    final_unit: Optional[Unit] = None
    conclusion: str = ""
    linked_note: Optional[str] = None
    value_trace: List[Dict[str, Any]] = field(default_factory=list)
    exceptions: List[CalculationException] = field(default_factory=list)
    confirmations: List[ManualConfirmation] = field(default_factory=list)
    status: CalculationStatus = CalculationStatus.SUCCESS
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat(timespec="seconds"))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "result_id": self.result_id,
            "question_id": self.question_id,
            "question_name": self.question_name,
            "raw_value": self.raw_value,
            "raw_unit": self.raw_unit.value if self.raw_unit else None,
            "adjusted_value": self.adjusted_value,
            "adjusted_unit": self.adjusted_unit.value if self.adjusted_unit else None,
            "final_value": self.final_value,
            "final_unit": self.final_unit.value if self.final_unit else None,
            "conclusion": self.conclusion,
            "linked_note": self.linked_note,
            "value_trace": self.value_trace,
            "exceptions": [e.to_dict() for e in self.exceptions],
            "confirmations": [c.to_dict() for c in self.confirmations],
            "status": self.status.value,
            "timestamp": self.timestamp,
        }


@dataclass
class HistoryRecord:
    history_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    result_id: str = ""
    question_id: str = ""
    change_type: str = ""
    before: Dict[str, Any] = field(default_factory=dict)
    after: Dict[str, Any] = field(default_factory=dict)
    operator: str = ""
    change_reason: str = ""
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat(timespec="seconds"))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "history_id": self.history_id,
            "result_id": self.result_id,
            "question_id": self.question_id,
            "change_type": self.change_type,
            "before": self.before,
            "after": self.after,
            "operator": self.operator,
            "change_reason": self.change_reason,
            "timestamp": self.timestamp,
        }


@dataclass
class BatchRunReport:
    batch_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    total_questions: int = 0
    success_count: int = 0
    warning_count: int = 0
    failed_count: int = 0
    needs_confirmation_count: int = 0
    results: List[CalculationResult] = field(default_factory=list)
    exceptions_summary: List[Dict[str, Any]] = field(default_factory=list)
    generated_at: str = field(default_factory=lambda: datetime.now().isoformat(timespec="seconds"))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "batch_id": self.batch_id,
            "total_questions": self.total_questions,
            "success_count": self.success_count,
            "warning_count": self.warning_count,
            "failed_count": self.failed_count,
            "needs_confirmation_count": self.needs_confirmation_count,
            "results": [r.to_dict() for r in self.results],
            "exceptions_summary": self.exceptions_summary,
            "generated_at": self.generated_at,
        }
