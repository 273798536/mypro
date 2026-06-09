"""
统计显著性复核系统
==================
核心数据模型定义
"""

from dataclasses import dataclass, field, asdict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import uuid
import json


class ReviewStatus(str, Enum):
    PASS = "pass"
    PENDING = "pending"
    REJECTED = "rejected"
    AFFECTED = "affected"


class ErrorType(str, Enum):
    NONE = "none"
    APPROXIMATION = "approximation_error"
    EMPTY_SET = "empty_set"
    INVALID_DATA = "invalid_data"
    LATE_ANSWER = "late_answer"


@dataclass
class Question:
    question_id: str
    content: str
    correct_answer: Optional[float] = None
    tolerance: float = 0.01
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Question":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class AnswerRecord:
    record_id: str
    question_id: str
    student_answer: Optional[float]
    submitted_at: str
    batch_id: str
    is_late: bool = False
    arrived_at: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AnswerRecord":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class CounterExample:
    example_id: str
    description: str
    input_values: Dict[str, float]
    expected: float
    actual: float
    error_magnitude: float
    generated_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CounterExample":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class ErrorAnalysis:
    analysis_id: str
    question_id: str
    error_type: ErrorType
    error_magnitude: Optional[float] = None
    threshold: Optional[float] = None
    details: str = ""
    counter_examples: List[CounterExample] = field(default_factory=list)
    analyzed_at: str = field(default_factory=lambda: datetime.now().isoformat())
    version: int = 1

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["error_type"] = self.error_type.value
        d["counter_examples"] = [ce.to_dict() for ce in self.counter_examples]
        return d

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ErrorAnalysis":
        ces = [CounterExample.from_dict(ce) for ce in data.get("counter_examples", [])]
        return cls(
            analysis_id=data["analysis_id"],
            question_id=data["question_id"],
            error_type=ErrorType(data["error_type"]),
            error_magnitude=data.get("error_magnitude"),
            threshold=data.get("threshold"),
            details=data.get("details", ""),
            counter_examples=ces,
            analyzed_at=data.get("analyzed_at", datetime.now().isoformat()),
            version=data.get("version", 1),
        )


@dataclass
class ReviewRecord:
    review_id: str
    record_id: str
    question_id: str
    batch_id: str
    status: ReviewStatus
    error_analysis: Optional[ErrorAnalysis] = None
    previous_status: Optional[ReviewStatus] = None
    affected_by_late_answer: bool = False
    late_answer_record_ids: List[str] = field(default_factory=list)
    reviewed_at: str = field(default_factory=lambda: datetime.now().isoformat())
    run_id: str = ""

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["status"] = self.status.value
        if self.previous_status:
            d["previous_status"] = self.previous_status.value
        if self.error_analysis:
            d["error_analysis"] = self.error_analysis.to_dict()
        return d

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ReviewRecord":
        ea = None
        if data.get("error_analysis"):
            ea = ErrorAnalysis.from_dict(data["error_analysis"])
        prev = None
        if data.get("previous_status"):
            prev = ReviewStatus(data["previous_status"])
        return cls(
            review_id=data["review_id"],
            record_id=data["record_id"],
            question_id=data["question_id"],
            batch_id=data["batch_id"],
            status=ReviewStatus(data["status"]),
            error_analysis=ea,
            previous_status=prev,
            affected_by_late_answer=data.get("affected_by_late_answer", False),
            late_answer_record_ids=data.get("late_answer_record_ids", []),
            reviewed_at=data.get("reviewed_at", datetime.now().isoformat()),
            run_id=data.get("run_id", ""),
        )


def generate_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:12]}"
