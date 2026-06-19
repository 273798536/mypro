from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class ReviewStatus(str, Enum):
    PENDING = "待处理"
    PROCESSING = "处理中"
    EVIDENCE_MISSING = "待补证据"
    MANUAL_REVIEW = "人工确认中"
    RESOLVED = "已处理"
    SUSPENDED = "已挂起"


class CorrectionType(str, Enum):
    MODEL_UPDATE = "模型迭代"
    RULE_CHANGE = "规则调整"
    MANUAL_JUDGMENT = "人工改判"
    DATA_FIX = "数据修正"


@dataclass
class VersionNote:
    version_id: str
    publish_date: str
    title: str
    description: str
    related_rules: List[str] = field(default_factory=list)
    affected_scenarios: List[str] = field(default_factory=list)
    evidence_reference: Optional[str] = None
    operator: str = ""
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class ScheduleRecommendation:
    recommendation_id: str
    schedule_date: str
    nurse_id: str
    nurse_name: str
    shift_type: str
    original_recommendation: str
    model_version: str
    confidence_score: float
    evidence_features: Dict[str, Any] = field(default_factory=dict)
    rule_matches: List[str] = field(default_factory=list)
    generated_at: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class ManualCorrection:
    correction_id: str
    recommendation_id: str
    original_result: str
    corrected_result: str
    correction_type: CorrectionType
    reason: str
    evidence_reference: Optional[str] = None
    related_version_id: Optional[str] = None
    operator: str = ""
    corrected_at: str = field(default_factory=lambda: datetime.now().isoformat())
    is_overridden: bool = False
    overridden_by: Optional[str] = None
    overridden_at: Optional[str] = None
    override_reason: Optional[str] = None


@dataclass
class EvidenceReviewRecord:
    review_id: str
    recommendation_id: str
    version_id: Optional[str] = None
    correction_id: Optional[str] = None
    status: ReviewStatus = ReviewStatus.PENDING
    evidence_chain: List[Dict[str, Any]] = field(default_factory=list)
    missing_references: List[str] = field(default_factory=list)
    review_notes: str = ""
    resolution: str = ""
    reviewed_by: str = ""
    reviewed_at: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class ReviewSummary:
    total_count: int = 0
    resolved_count: int = 0
    evidence_missing_count: int = 0
    pending_count: int = 0
    suspended_count: int = 0
    manual_judgment_count: int = 0
    override_count: int = 0
