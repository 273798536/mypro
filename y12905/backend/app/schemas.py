from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from datetime import datetime
import enum


class EvalStatus(str, enum.Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    REVIEW = "REVIEW"


class TaskStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class FinalDecision(str, enum.Enum):
    APPROVED = "APPROVED"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    RERUN = "RERUN"


class SafetyRule(BaseModel):
    id: str
    text: str
    version: str = "1.0"


class SafetyRulesSnapshot(BaseModel):
    rules: List[SafetyRule] = []


# -------- Prompt Version --------
class PromptVersionBase(BaseModel):
    version_tag: str = Field(..., min_length=1, description="提示词版本标签, 如 v2.5")
    content: str
    safety_rules_snapshot: SafetyRulesSnapshot = SafetyRulesSnapshot()
    change_log: str = ""


class PromptVersionCreate(PromptVersionBase):
    pass


class PromptVersionOut(PromptVersionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# -------- Eval Sample --------
class EvalSampleBase(BaseModel):
    input_text: str
    model_output: str
    score: float = Field(..., ge=0, le=5)
    safety_violations: List[str] = []
    eval_status: EvalStatus = EvalStatus.PASS
    source_material_ref: str = ""


class EvalSampleBatchCreate(BaseModel):
    prompt_version_id: int
    samples: List[EvalSampleBase]


class EvalSampleOut(EvalSampleBase):
    id: int
    prompt_version_id: int
    created_at: datetime
    latest_decision: Optional[FinalDecision] = None
    latest_reason: Optional[str] = None

    class Config:
        from_attributes = True


# -------- Gray Compare --------
class GrayCompareCreate(BaseModel):
    version_a_id: int
    version_b_id: int


class SampleDiff(BaseModel):
    sample_id: int
    source_material_ref: str
    input_text: str
    output_a: str
    output_b: str
    score_a: float
    score_b: float
    status_a: EvalStatus
    status_b: EvalStatus
    violations_a: List[str]
    violations_b: List[str]
    decision: Optional[FinalDecision] = None
    reason: Optional[str] = None
    score_delta: float


class MetricsSummary(BaseModel):
    total_samples: int = 0
    pass_rate_a: float = 0.0
    pass_rate_b: float = 0.0
    avg_score_a: float = 0.0
    avg_score_b: float = 0.0
    violation_count_a: int = 0
    violation_count_b: int = 0
    improved_count: int = 0
    regressed_count: int = 0
    unchanged_count: int = 0
    decision_counts: Dict[str, int] = {}


class GrayCompareTaskOut(BaseModel):
    id: int
    version_a_id: int
    version_b_id: int
    version_a_tag: str = ""
    version_b_tag: str = ""
    metrics_summary: MetricsSummary = MetricsSummary()
    status: TaskStatus
    consistency_flag: bool
    created_at: datetime
    sample_diffs: Optional[List[SampleDiff]] = None
    summary_hash: str = ""

    class Config:
        from_attributes = True


# -------- Human Feedback --------
class HumanFeedbackCreate(BaseModel):
    eval_sample_id: int
    evaluator: str = "anonymous"
    feedback_text: str = ""
    revised_score: float = Field(..., ge=0, le=5)
    affects_safety_rules: bool = False
    affected_rule_ids: List[str] = []


class HumanFeedbackOut(BaseModel):
    id: int
    eval_sample_id: int
    evaluator: str
    feedback_text: str
    original_score: float
    revised_score: float
    affects_safety_rules: bool
    affected_rule_ids: List[str]
    final_decision: FinalDecision
    reason: str
    created_at: datetime

    class Config:
        from_attributes = True


# -------- Statistics --------
class DistributionItem(BaseModel):
    bucket: str
    count: int


class ViolationItem(BaseModel):
    rule_id: str
    count: int


class TrendPoint(BaseModel):
    version_tag: str
    metric: float
    timestamp: datetime


# -------- Replay Trace --------
class ReplayTrace(BaseModel):
    sample_id: int
    source_material_ref: str
    input_text: str
    model_output: str
    score: float
    eval_status: EvalStatus
    feedback_history: List[HumanFeedbackOut] = []
    affected_rules: List[SafetyRule] = []
    prompt_version_tag: str
    prompt_content_snippet: str


# -------- Error Response --------
class ActionableError(BaseModel):
    error_code: str
    message: str
    action: str
    request_id: str
