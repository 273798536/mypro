from enum import Enum
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class RecordStatus(str, Enum):
    CONFIRMED_CLEAN = "confirmed_clean"
    PENDING_REVIEW = "pending_review"
    HALLUCINATION = "hallucination"
    DUPLICATE = "duplicate"
    SAFETY_BLOCKED = "safety_blocked"

    @classmethod
    def get_status_label(cls, status: "RecordStatus") -> str:
        labels = {
            cls.CONFIRMED_CLEAN: "✅ 可直接使用",
            cls.PENDING_REVIEW: "⏳ 待工程师复核",
            cls.HALLUCINATION: "❌ 存在幻觉",
            cls.DUPLICATE: "🔄 重复样本",
            cls.SAFETY_BLOCKED: "🛡️ 安全拦截",
        }
        return labels.get(status, status.value)

    @classmethod
    def get_status_color(cls, status: "RecordStatus") -> str:
        colors = {
            cls.CONFIRMED_CLEAN: "green",
            cls.PENDING_REVIEW: "orange",
            cls.HALLUCINATION: "red",
            cls.DUPLICATE: "blue",
            cls.SAFETY_BLOCKED: "purple",
        }
        return colors.get(status, "gray")


class HallucinationType(str, Enum):
    FACTUAL_INVENTION = "factual_invention"
    ENTITY_HALLUCINATION = "entity_hallucination"
    DATE_CONFUSION = "date_confusion"
    ATTRIBUTE_MISMATCH = "attribute_mismatch"
    LOGICAL_CONTRADICTION = "logical_contradiction"
    REFERENCE_FABRICATION = "reference_fabrication"
    UNKNOWN = "unknown"


class SourceMaterial(BaseModel):
    material_id: str
    source_type: str
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    retrieved_at: datetime = Field(default_factory=datetime.now)


class PromptVersion(BaseModel):
    version_id: str
    version_name: str
    prompt_template: str
    system_prompt: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    created_by: str = "system"
    description: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class HumanCorrection(BaseModel):
    correction_id: str
    record_id: str
    corrected_content: str
    correction_note: str
    corrected_by: str
    corrected_at: datetime = Field(default_factory=datetime.now)
    is_approved: bool = False
    approver: Optional[str] = None
    approved_at: Optional[datetime] = None


class SafetyCheckResult(BaseModel):
    check_name: str
    passed: bool
    severity: str
    message: str
    actionable_guidance: Optional[str] = None
    missing_resources: Optional[List[str]] = None
    details: Dict[str, Any] = Field(default_factory=dict)


class DuplicateGroup(BaseModel):
    group_id: str
    primary_record_id: str
    duplicate_record_ids: List[str]
    similarity_score: float
    match_type: str
    merged_at: Optional[datetime] = None


class GroupMetric(BaseModel):
    group_name: str
    group_dimension: str
    total_records: int = 0
    clean_count: int = 0
    hallucination_count: int = 0
    pending_count: int = 0
    duplicate_count: int = 0
    blocked_count: int = 0
    hallucination_rate: float = 0.0
    top_hallucination_types: List[Dict[str, Any]] = Field(default_factory=list)
    calculated_at: datetime = Field(default_factory=datetime.now)

    @field_validator("hallucination_rate", mode="before")
    @classmethod
    def calculate_rate(cls, v: Any, info: Any) -> float:
        if isinstance(v, float):
            return v
        values = info.data
        total = values.get("total_records", 0)
        if total == 0:
            return 0.0
        return round(values.get("hallucination_count", 0) / total * 100, 2)


class HallucinationRecord(BaseModel):
    record_id: str
    input_query: str
    model_output: str
    expected_output: Optional[str] = None
    prompt_version_id: str
    source_materials: List[SourceMaterial] = Field(default_factory=list)
    status: RecordStatus = RecordStatus.PENDING_REVIEW
    hallucination_types: List[HallucinationType] = Field(default_factory=list)
    confidence_score: float = 0.0
    corrections: List[HumanCorrection] = Field(default_factory=list)
    safety_checks: List[SafetyCheckResult] = Field(default_factory=list)
    duplicate_of: Optional[str] = None
    duplicate_group_id: Optional[str] = None
    group_tags: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    notes: Optional[str] = None

    def get_business_status(self) -> Dict[str, str]:
        return {
            "label": RecordStatus.get_status_label(self.status),
            "color": RecordStatus.get_status_color(self.status),
            "can_use_directly": self.status == RecordStatus.CONFIRMED_CLEAN,
            "needs_engineer_review": self.status in [
                RecordStatus.PENDING_REVIEW,
                RecordStatus.HALLUCINATION,
                RecordStatus.SAFETY_BLOCKED,
            ],
        }

    def has_safety_issues(self) -> bool:
        return any(not check.passed for check in self.safety_checks)

    def get_blocking_safety_issues(self) -> List[SafetyCheckResult]:
        return [check for check in self.safety_checks if not check.passed and check.severity == "high"]
