from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class RecordStatus(str, Enum):
    PROCESSED = "processed"
    PENDING_MATERIAL = "pending_material"
    MANUAL_OVERRIDDEN = "manual_overridden"
    EMPTY_SET = "empty_set"
    EXTRAPOLATION_OUT_OF_BOUNDS = "extrapolation_out_of_bounds"


class CalculationStatus(str, Enum):
    SUCCESS = "success"
    EMPTY_INPUT = "empty_input"
    EXTRAPOLATION_ERROR = "extrapolation_error"
    MISSING_PRIOR = "missing_prior"
    INCONSISTENT口径 = "inconsistent_dimension"


@dataclass
class AnswerVersion:
    version_id: str
    answer_text: str
    timestamp: datetime
    author: Optional[str] = None
    remark: Optional[str] = None
    screenshot_ref: Optional[str] = None
    is_latest: bool = False
    source_note: Optional[str] = None


@dataclass
class HistoryRecord:
    record_id: str
    question_id: str
    question_text: str
    answer_versions: List[AnswerVersion] = field(default_factory=list)
    is_empty_set: bool = False
    empty_set_reason: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

    def get_latest_answer(self) -> Optional[AnswerVersion]:
        for v in self.answer_versions:
            if v.is_latest:
                return v
        return self.answer_versions[-1] if self.answer_versions else None

    def get_mainline_answer(self) -> str:
        if not self.answer_versions:
            return ""
        parts = []
        for v in sorted(self.answer_versions, key=lambda x: x.timestamp):
            if v.answer_text and v.answer_text.strip():
                parts.append(v.answer_text.strip())
        return " ".join(parts)


@dataclass
class BayesianInput:
    prior_probability: float
    likelihood: float
    marginal_likelihood: float
    record_id: str
    question_id: str
    historical_context: Optional[Dict[str, Any]] = None
    source_versions: Optional[List[str]] = None


@dataclass
class ExtrapolationTrace:
    original_claim: str
    source_version_id: str
    source_timestamp: datetime
    extrapolated_value: float
    boundary: float
    direction: str
    trace_path: List[str] = field(default_factory=list)


@dataclass
class BayesianResult:
    posterior_probability: float
    calculation_status: CalculationStatus
    record_id: str
    question_id: str
    prior: float
    likelihood: float
    evidence: float
    is_extrapolated: bool = False
    extrapolation_trace: Optional[ExtrapolationTrace] = None
    calculation_log: List[str] = field(default_factory=list)
    raw_formula: str = ""
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class RecalculationCheck:
    is_consistent: bool
    chart_value: float
    detail_value: float
    difference: float
    tolerance: float
    chart_calculation_path: str
    detail_calculation_path: str
    mismatched_fields: List[str] = field(default_factory=list)


@dataclass
class ProcessingResult:
    record: HistoryRecord
    bayesian_result: Optional[BayesianResult] = None
    recalculation_check: Optional[RecalculationCheck] = None
    status: RecordStatus = RecordStatus.PROCESSED
    failure_reason: Optional[str] = None
    manual_override_note: Optional[str] = None
