from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Dict, Any
from enum import Enum
import uuid
import json


class RecordStatus(str, Enum):
    PENDING = "待处理"
    CALCULATED = "已计算"
    CONSTRAINT_FAILED = "约束失败"
    UNIT_MISSING = "单位缺失"
    REVIEWED = "已复核"


class ConstraintStatus(str, Enum):
    PASS = "通过"
    FAIL = "失败"
    SKIPPED = "跳过"


@dataclass
class SourceData:
    source_id: str
    name: str
    value: float
    unit: Optional[str] = None
    description: str = ""
    raw_input: Dict[str, Any] = field(default_factory=dict)


@dataclass
class FormulaSpec:
    expression: str
    latex: str
    description: str
    applicable_range: str
    units: str


@dataclass
class ConstraintViolation:
    constraint_name: str
    constraint_expr: str
    message: str
    actual_value: Any
    expected_range: str


@dataclass
class ConstraintCheckResult:
    status: ConstraintStatus
    violations: List[ConstraintViolation] = field(default_factory=list)
    passed: List[str] = field(default_factory=list)


@dataclass
class CalculationResult:
    result_id: str
    value: Optional[float]
    unit: Optional[str]
    formula: FormulaSpec
    absolute_error: Optional[float] = None
    relative_error: Optional[float] = None
    confidence_interval: Optional[Dict[str, float]] = None
    monte_carlo_samples: int = 0
    raw_trace: List[Dict[str, Any]] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    error_message: Optional[str] = None


@dataclass
class ReviewRecord:
    review_id: str
    reviewer: str
    score: Optional[float] = None
    comment: str = ""
    handling_opinion: str = ""
    reviewed_at: datetime = field(default_factory=datetime.now)
    corrections: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ProcessingBatch:
    batch_id: str
    run_timestamp: datetime
    sources: List[SourceData]
    calculation: Optional[CalculationResult] = None
    constraint_check: Optional[ConstraintCheckResult] = None
    status: RecordStatus = RecordStatus.PENDING
    review: Optional[ReviewRecord] = None
    note: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "batch_id": self.batch_id,
            "run_timestamp": self.run_timestamp.isoformat(),
            "status": self.status.value,
            "sources": [
                {
                    "source_id": s.source_id,
                    "name": s.name,
                    "value": s.value,
                    "unit": s.unit,
                    "description": s.description,
                }
                for s in self.sources
            ],
            "calculation": None
            if self.calculation is None
            else {
                "result_id": self.calculation.result_id,
                "value": self.calculation.value,
                "unit": self.calculation.unit,
                "formula": {
                    "expression": self.calculation.formula.expression,
                    "latex": self.calculation.formula.latex,
                    "description": self.calculation.formula.description,
                    "applicable_range": self.calculation.formula.applicable_range,
                    "units": self.calculation.formula.units,
                },
                "absolute_error": self.calculation.absolute_error,
                "relative_error": self.calculation.relative_error,
                "confidence_interval": self.calculation.confidence_interval,
                "monte_carlo_samples": self.calculation.monte_carlo_samples,
                "warnings": self.calculation.warnings,
                "error_message": self.calculation.error_message,
            },
            "constraint_check": None
            if self.constraint_check is None
            else {
                "status": self.constraint_check.status.value,
                "violations": [
                    {
                        "constraint_name": v.constraint_name,
                        "constraint_expr": v.constraint_expr,
                        "message": v.message,
                        "actual_value": v.actual_value,
                        "expected_range": v.expected_range,
                    }
                    for v in self.constraint_check.violations
                ],
                "passed": self.constraint_check.passed,
            },
            "review": None
            if self.review is None
            else {
                "review_id": self.review.review_id,
                "reviewer": self.review.reviewer,
                "score": self.review.score,
                "comment": self.review.comment,
                "handling_opinion": self.review.handling_opinion,
                "reviewed_at": self.review.reviewed_at.isoformat(),
                "corrections": self.review.corrections,
            },
            "note": self.note,
        }


class BatchStore:
    def __init__(self):
        self._batches: Dict[str, ProcessingBatch] = {}

    def save(self, batch: ProcessingBatch) -> None:
        self._batches[batch.batch_id] = batch

    def get(self, batch_id: str) -> Optional[ProcessingBatch]:
        return self._batches.get(batch_id)

    def get_by_result(self, result_id: str) -> Optional[ProcessingBatch]:
        for b in self._batches.values():
            if b.calculation and b.calculation.result_id == result_id:
                return b
        return None

    def list_all(self) -> List[ProcessingBatch]:
        return sorted(
            self._batches.values(), key=lambda b: b.run_timestamp, reverse=True
        )

    def find_unit_missing(self) -> List[ProcessingBatch]:
        return [b for b in self._batches.values() if b.status == RecordStatus.UNIT_MISSING]

    def find_by_status(self, status: RecordStatus) -> List[ProcessingBatch]:
        return [b for b in self._batches.values() if b.status == status]


store = BatchStore()


def new_batch_id() -> str:
    return "B" + datetime.now().strftime("%Y%m%d%H%M%S") + uuid.uuid4().hex[:4]


def new_result_id() -> str:
    return "R" + datetime.now().strftime("%Y%m%d%H%M%S") + uuid.uuid4().hex[:4]


def new_source_id() -> str:
    return "S" + datetime.now().strftime("%Y%m%d%H%M%S") + uuid.uuid4().hex[:4]


def new_review_id() -> str:
    return "V" + datetime.now().strftime("%Y%m%d%H%M%S") + uuid.uuid4().hex[:4]
