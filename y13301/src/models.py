from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class JudgmentStatus(str, Enum):
    PROCESSED = "已处理"
    PENDING_MATERIAL = "待补材料"
    MANUAL_REVISED = "人工改判"
    TO_CONFIRM = "待确认"
    WITHDRAWN = "已撤回"


class SampleSource(str, Enum):
    NORMAL = "正常样本"
    BACKTEST = "回测样本"
    SUPPLEMENTARY = "后补样本"


@dataclass
class ModelPrediction:
    model_version: str
    score: float
    judgment: str
    threshold: float
    features: Dict[str, Any] = field(default_factory=dict)
    explanation: str = ""


@dataclass
class EvaluationSample:
    sample_id: str
    conversation_id: str
    content: str
    source: SampleSource = SampleSource.NORMAL
    old_model: Optional[ModelPrediction] = None
    new_model: Optional[ModelPrediction] = None
    manual_judgment: Optional[str] = None
    manual_reason: str = ""
    status: JudgmentStatus = JudgmentStatus.PROCESSED
    tags: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    notes: str = ""
    is_misjudgment_backtest: bool = False
    revision_explanation: str = ""


@dataclass
class VersionNote:
    version: str
    date: str
    content: str
    author: str = ""
    is_duplicate: bool = False
    duplicate_with: Optional[str] = None


@dataclass
class WithdrawalRecord:
    record_id: str
    sample_id: str
    reason: str
    date: str
    operator: str = ""


@dataclass
class SupplementaryNote:
    note_id: str
    sample_id: Optional[str]
    content: str
    date: str
    source: str = ""


@dataclass
class DuplicateEvaluation:
    sample_id: str
    duplicate_count: int
    versions: List[str]
    reason: str = ""
    impact_scope: str = ""
    confirmed: bool = False


@dataclass
class ComparisonResult:
    total_samples: int
    consistent_count: int
    inconsistent_count: int
    manual_revised_count: int
    pending_count: int
    to_confirm_count: int
    threshold_impact_count: int
    backtest_samples: List[EvaluationSample] = field(default_factory=list)
    duplicate_evaluations: List[DuplicateEvaluation] = field(default_factory=list)
    samples: List[EvaluationSample] = field(default_factory=list)
