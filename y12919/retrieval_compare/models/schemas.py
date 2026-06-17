from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime


class AnomalyType(str, Enum):
    SAFETY_RULE_MISSING = "safety_rule_missing"
    SEGMENT_MISMATCH = "segment_mismatch"
    MODEL_LOG_ONLY = "model_log_only"
    SEGMENT_ONLY = "segment_only"
    SCORE_DEVIATION = "score_deviation"
    HUMAN_REVIEW_REQUIRED = "human_review_required"


class NextAction(str, Enum):
    SUPPLEMENT_MATERIAL = "supplement_material"
    ADJUST_CRITERION = "adjust_criterion"
    CONFIRM_RULE = "confirm_rule"
    AWAIT_REVIEW = "await_review"


class RecordStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    RESOLVED = "resolved"
    DISPUTED = "disputed"


@dataclass
class HumanRemark:
    remark_id: str
    content: str
    reviewer: str
    created_at: str
    modified_at: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "remark_id": self.remark_id,
            "content": self.content,
            "reviewer": self.reviewer,
            "created_at": self.created_at,
            "modified_at": self.modified_at,
        }


@dataclass
class ModelLog:
    log_id: str
    query: str
    segment_id: str
    retrieved_segments: List[str]
    score: float
    safety_rule_hit: List[str] = field(default_factory=list)
    timestamp: str = ""
    human_remarks: List[HumanRemark] = field(default_factory=list)
    extra: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "log_id": self.log_id,
            "query": self.query,
            "segment_id": self.segment_id,
            "retrieved_segments": self.retrieved_segments,
            "score": self.score,
            "safety_rule_hit": self.safety_rule_hit,
            "timestamp": self.timestamp,
            "human_remarks": [r.to_dict() for r in self.human_remarks],
            "extra": self.extra,
        }


@dataclass
class SegmentItem:
    segment_id: str
    content: str
    category: str
    safety_rules: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    human_remarks: List[HumanRemark] = field(default_factory=list)
    extra: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "segment_id": self.segment_id,
            "content": self.content,
            "category": self.category,
            "safety_rules": self.safety_rules,
            "tags": self.tags,
            "human_remarks": [r.to_dict() for r in self.human_remarks],
            "extra": self.extra,
        }


@dataclass
class SafetyRule:
    rule_id: str
    rule_name: str
    description: str
    applicable_categories: List[str] = field(default_factory=list)
    enabled: bool = True
    human_remarks: List[HumanRemark] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "rule_id": self.rule_id,
            "rule_name": self.rule_name,
            "description": self.description,
            "applicable_categories": self.applicable_categories,
            "enabled": self.enabled,
            "human_remarks": [r.to_dict() for r in self.human_remarks],
        }


@dataclass
class HumanFeedback:
    feedback_id: str
    record_id: str
    feedback_type: str
    content: str
    reviewer: str
    created_at: str
    corrected_value: Optional[Any] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "feedback_id": self.feedback_id,
            "record_id": self.record_id,
            "feedback_type": self.feedback_type,
            "content": self.content,
            "reviewer": self.reviewer,
            "created_at": self.created_at,
            "corrected_value": self.corrected_value,
        }


@dataclass
class AnomalyRecord:
    record_id: str
    anomaly_type: AnomalyType
    model_log: Optional[ModelLog] = None
    segment: Optional[SegmentItem] = None
    description: str = ""
    next_action: NextAction = NextAction.AWAIT_REVIEW
    status: RecordStatus = RecordStatus.PENDING
    human_remarks: List[HumanRemark] = field(default_factory=list)
    feedback_history: List[HumanFeedback] = field(default_factory=list)
    detected_at: str = ""
    last_updated_at: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "record_id": self.record_id,
            "anomaly_type": self.anomaly_type.value,
            "model_log": self.model_log.to_dict() if self.model_log else None,
            "segment": self.segment.to_dict() if self.segment else None,
            "description": self.description,
            "next_action": self.next_action.value,
            "status": self.status.value,
            "human_remarks": [r.to_dict() for r in self.human_remarks],
            "feedback_history": [f.to_dict() for f in self.feedback_history],
            "detected_at": self.detected_at,
            "last_updated_at": self.last_updated_at,
        }


@dataclass
class ComparisonResult:
    total_model_logs: int = 0
    total_segments: int = 0
    matched_records: int = 0
    anomalies: List[AnomalyRecord] = field(default_factory=list)
    statistics: Dict[str, Any] = field(default_factory=dict)
    generated_at: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_model_logs": self.total_model_logs,
            "total_segments": self.total_segments,
            "matched_records": self.matched_records,
            "anomalies": [a.to_dict() for a in self.anomalies],
            "statistics": self.statistics,
            "generated_at": self.generated_at,
        }
