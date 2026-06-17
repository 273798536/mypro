from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, List, Optional, Dict

from pydantic import BaseModel, ConfigDict, Field


class _Base(BaseModel):
    model_config = ConfigDict(protected_namespaces=())


class QuestionCategory(str, Enum):
    GENERAL = "general"
    SECURITY_SENSITIVE = "security_sensitive"
    MEDICAL = "medical"
    FINANCIAL = "financial"
    LEGAL = "legal"


class SecurityRuleStatus(str, Enum):
    CONFIGURED = "configured"
    MISCONFIGURED = "misconfigured"
    MISSING = "missing"


class EvaluationVerdict(str, Enum):
    PASS = "pass"
    FAIL = "fail"
    PENDING_REVIEW = "pending_review"
    NEEDS_SECURITY_REVIEW = "needs_security_review"


class ResultReadiness(str, Enum):
    DIRECTLY_USABLE = "directly_usable"
    NEEDS_SECURITY_AUDITOR = "needs_security_auditor"


class EvalQuestion(_Base):
    id: str
    text: str
    category: QuestionCategory
    expected_embedding_cluster: Optional[str] = None
    security_rule_id: Optional[str] = None
    reference_material: Optional[str] = None


class EvalBenchmark(_Base):
    id: str
    name: str
    version: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    questions: List[EvalQuestion]


class EmbeddingRecord(_Base):
    question_id: str
    model_version: str
    vector: List[float]
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class SecurityRule(_Base):
    id: str
    name: str
    description: str
    applies_to_categories: List[QuestionCategory]
    configured: bool = True
    threshold: Optional[float] = None


class SecurityRuleCheck(_Base):
    rule_id: str
    rule_name: str
    status: SecurityRuleStatus
    message: str


class DistributionStats(_Base):
    mean_norm: float
    std_norm: float
    mean_cosine_similarity: float
    ks_statistic: float
    ks_p_value: float
    dimension_wise_drift: List[float]


class DriftStatus(str, Enum):
    NO_DRIFT = "no_drift"
    MILD_DRIFT = "mild_drift"
    SIGNIFICANT_DRIFT = "significant_drift"
    SEVERE_DRIFT = "severe_drift"


class QuestionEvalResult(_Base):
    question_id: str
    question_text: str
    category: QuestionCategory
    baseline_model_version: str
    target_model_version: str
    cosine_distance: float
    norm_diff: float
    drift_detected: bool
    security_checks: List[SecurityRuleCheck]
    has_rule_misconfig: bool
    auto_verdict: EvaluationVerdict
    human_verdict: Optional[EvaluationVerdict] = None
    human_note: Optional[str] = None
    human_corrected_by: Optional[str] = None
    readiness: ResultReadiness


class DriftReportSummary(_Base):
    benchmark_id: str
    benchmark_name: str
    baseline_model: str
    target_model: str
    total_questions: int
    drift_count: int
    drift_rate: float
    security_rule_misconfig_count: int
    auto_pass_count: int
    auto_fail_count: int
    needs_security_review_count: int
    directly_usable_count: int
    needs_auditor_count: int
    overall_status: DriftStatus
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class DriftReport(_Base):
    summary: DriftReportSummary
    distribution: DistributionStats
    question_results: List[QuestionEvalResult]
    baseline_embeddings: Dict[str, List[float]]
    target_embeddings: Dict[str, List[float]]


class HumanCorrectionRequest(_Base):
    question_id: str
    verdict: EvaluationVerdict
    note: str
    corrected_by: str = "anonymous"


class ExportFormat(str, Enum):
    JSON = "json"
    CSV = "csv"


class ErrorResponse(_Base):
    error_code: str
    message: str
    actionable_suggestion: str
    details: Optional[Dict[str, Any]] = None
