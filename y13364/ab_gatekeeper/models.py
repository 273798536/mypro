from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime
import uuid


class SampleSource(Enum):
    TRAIN_LOG_CURRENT = "训练日志_当前版本"
    TRAIN_LOG_OLD = "训练日志_旧版本"
    WITHDRAW_RECORD = "撤回记录"
    VERBAL_NOTE = "口头备注"
    VALIDATION_SET = "验证集"
    MISCLASSIFIED_RETURN = "旧模型误判_回检样本"


class SampleStatus(Enum):
    PENDING = "待判定"
    PASSED = "通过"
    FAILED = "失败"
    MANUAL_CONFIRMED = "人工确认"
    CONTAMINATED = "已污染"
    REVISED = "已修正"


class DecisionReason(Enum):
    METRIC_BELOW_THRESHOLD = "指标低于阈值"
    VALIDATION_CONTAMINATION = "验证集污染"
    OLD_LOG_INCONSISTENCY = "旧版日志不一致"
    WITHDRAW_EVIDENCE = "撤回记录佐证"
    VERBAL_NOTE_CONFLICT = "口头备注冲突"
    MANUAL_OVERRIDE = "人工修正"
    MISCLASSIFIED_EXPLAINED = "误判样本已解释"


class ManualAction(Enum):
    APPROVE = "人工通过"
    REJECT = "人工驳回"
    REVISE_DATA = "修正数据"
    ADD_NOTE = "补充说明"
    FLAG_FOR_REVIEW = "标记待复核"


@dataclass
class ModelVersion:
    version_id: str
    model_name: str
    training_time: str
    hyperparams: Dict[str, Any] = field(default_factory=dict)
    parent_version: Optional[str] = None
    changelog: str = ""


@dataclass
class MetricSnapshot:
    auc: Optional[float] = None
    accuracy: Optional[float] = None
    precision: Optional[float] = None
    recall: Optional[float] = None
    f1: Optional[float] = None
    loss: Optional[float] = None
    custom_metrics: Dict[str, float] = field(default_factory=dict)


@dataclass
class Sample:
    sample_id: str
    source: SampleSource
    content: str
    timestamp: str
    task_id: str
    status: SampleStatus = SampleStatus.PENDING
    original_label: Optional[str] = None
    predicted_label: Optional[str] = None
    prediction_score: Optional[float] = None
    metrics: MetricSnapshot = field(default_factory=MetricSnapshot)
    raw_metadata: Dict[str, Any] = field(default_factory=dict)
    is_contaminated: bool = False
    contamination_reason: Optional[str] = None
    is_misclassified_return: bool = False
    old_model_prediction: Optional[str] = None
    old_model_score: Optional[float] = None
    revision_chain: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "sample_id": self.sample_id,
            "source": self.source.value,
            "content": self.content,
            "timestamp": self.timestamp,
            "task_id": self.task_id,
            "status": self.status.value,
            "original_label": self.original_label,
            "predicted_label": self.predicted_label,
            "prediction_score": self.prediction_score,
            "metrics": {
                "auc": self.metrics.auc,
                "accuracy": self.metrics.accuracy,
                "precision": self.metrics.precision,
                "recall": self.metrics.recall,
                "f1": self.metrics.f1,
                "loss": self.metrics.loss,
                "custom": self.metrics.custom_metrics,
            },
            "raw_metadata": self.raw_metadata,
            "is_contaminated": self.is_contaminated,
            "contamination_reason": self.contamination_reason,
            "is_misclassified_return": self.is_misclassified_return,
            "old_model_prediction": self.old_model_prediction,
            "old_model_score": self.old_model_score,
            "revision_chain": self.revision_chain,
        }


@dataclass
class DecisionRecord:
    decision_id: str
    sample_id: str
    passed: bool
    reason: DecisionReason
    detail: str
    evidence_chain: List[str] = field(default_factory=list)
    affected_by_sources: List[SampleSource] = field(default_factory=list)
    timestamp: str = field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d %H:%M:%S"))


@dataclass
class ManualCorrection:
    correction_id: str
    sample_id: str
    action: ManualAction
    operator: str
    comment: str
    before_status: SampleStatus
    after_status: SampleStatus
    before_decision: Optional[DecisionRecord] = None
    after_decision: Optional[DecisionRecord] = None
    timestamp: str = field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    scheduling_note: str = ""


@dataclass
class AuditHistory:
    event_id: str
    event_type: str
    target_id: str
    operator: str
    before_state: Dict[str, Any]
    after_state: Dict[str, Any]
    comment: str
    timestamp: str = field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d %H:%M:%S"))


@dataclass
class GatekeeperResult:
    overall_pass: bool
    blocking_reasons: List[str]
    warning_reasons: List[str]
    sample_summary: Dict[str, int]
    manual_confirmation_required: bool
    manual_confirmation_details: List[Dict[str, Any]]
    contamination_report: Dict[str, Any]
    misclassified_report: Dict[str, Any]
    decisions: List[DecisionRecord]
    corrections: List[ManualCorrection]
    history: List[AuditHistory]
    model_version: ModelVersion
    generated_at: str = field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d %H:%M:%S"))


def generate_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"
