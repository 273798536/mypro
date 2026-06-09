"""数据模型定义"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class CaseStatus(str, Enum):
    """边界样例状态"""

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    NEEDS_RECOLLECTION = "needs_recollection"
    TEMPORARY_HOLD = "temporary_hold"


class DataAvailability(str, Enum):
    """数据可用状态"""

    USABLE = "usable"
    PENDING = "pending"
    NEEDS_RECOLLECTION = "needs_recollection"


class CommitteeDecision(str, Enum):
    """投委会视图决定"""

    DIRECT_USE = "direct_use"
    NEEDS_REVIEW = "needs_review"


class SourceMaterial(BaseModel):
    """来源材料"""

    material_id: str
    case_id: str
    material_type: str
    content: str
    location: str = ""
    created_at: datetime = Field(default_factory=datetime.now)


class ScoringRecord(BaseModel):
    """评分记录"""

    record_id: str
    case_id: str
    scorer: str
    score: float
    timestamp: datetime = Field(default_factory=datetime.now)
    notes: str = ""


class StudentAnswer(BaseModel):
    """学生答题记录（含错题）"""

    answer_id: str
    case_id: str
    student_id: str
    is_correct: bool
    answer_content: str = ""
    error_category: str = ""
    score: float = 0.0


class PriorParams(BaseModel):
    """贝叶斯先验参数"""

    alpha: float = 1.0
    beta: float = 1.0
    distribution: str = "beta"
    description: str = ""


class SensitivityResult(BaseModel):
    """先验敏感性分析结果"""

    case_id: str
    status: CaseStatus
    prior_params: PriorParams
    posterior_mean: float = 0.0
    posterior_std: float = 0.0
    robustness_index: float = 0.0
    is_robust: bool = False
    data_availability: DataAvailability = DataAvailability.PENDING
    committee_decision: CommitteeDecision = CommitteeDecision.NEEDS_REVIEW
    boundary_flag: bool = False
    notes: str = ""
    computed_at: datetime = Field(default_factory=datetime.now)


class AuditEntry(BaseModel):
    """留痕记录 - 人工修正留痕"""

    entry_id: str
    case_id: str
    action: str
    operator: str
    previous_status: Optional[CaseStatus] = None
    new_status: Optional[CaseStatus] = None
    previous_conclusion: str = ""
    new_conclusion: str = ""
    reason: str = ""
    changed_fields: dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.now)


class BoundaryCase(BaseModel):
    """边界样例"""

    case_id: str
    description: str
    boundary_flag: bool = True
    prior_params: PriorParams
    conclusion: str = ""
    status: CaseStatus = CaseStatus.PENDING
    version: int = 1
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    tags: list[str] = Field(default_factory=list)
    extra: dict[str, Any] = Field(default_factory=dict)


class CaseBundle(BaseModel):
    """完整的边界样例数据包"""

    case: BoundaryCase
    scoring_records: list[ScoringRecord] = Field(default_factory=list)
    source_materials: list[SourceMaterial] = Field(default_factory=list)
    student_answers: list[StudentAnswer] = Field(default_factory=list)
    sensitivity_result: Optional[SensitivityResult] = None
    audit_trail: list[AuditEntry] = Field(default_factory=list)


class BatchReport(BaseModel):
    """批量处理报告"""

    total_cases: int = 0
    usable_count: int = 0
    pending_count: int = 0
    needs_recollection_count: int = 0
    constraint_pass_count: int = 0
    constraint_fail_count: int = 0
    cases: list[SensitivityResult] = Field(default_factory=list)
    constraint_violations: dict[str, list[str]] = Field(default_factory=dict)
