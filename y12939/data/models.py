from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class RecordStatus(str, Enum):
    PASSED = "通过"
    BLOCKED = "被拦截"
    PENDING = "待判定"
    RETRYABLE = "可重试"


class FailureCategory(str, Enum):
    SAFETY_RULE_MISSING = "安全规则漏配"
    SAFETY_RULE_MISMATCH = "安全规则与评测题库不匹配"
    DATA_QUALITY = "数据质量问题"
    RESOURCE_TIMEOUT = "资源超时"
    UNKNOWN = "未知原因"


class SafetyRule(BaseModel):
    rule_id: str
    rule_name: str
    description: str
    required_question_types: List[str] = Field(default_factory=list)
    required_coverage: float = 0.8
    is_active: bool = True


class AnnotationRecord(BaseModel):
    annotator: str
    annotated_at: datetime = Field(default_factory=datetime.now)
    manual_note: str = ""
    final_decision: RecordStatus
    reason: str = ""


class TrainingRecord(BaseModel):
    record_id: str
    batch_id: str
    task_name: str
    question_type: str
    question_content: str
    triggered_at: datetime
    failure_category: FailureCategory
    failure_detail: str
    safety_rule_ids: List[str] = Field(default_factory=list)
    matched_question_bank: bool = False
    current_status: RecordStatus = RecordStatus.PENDING
    annotations: List[AnnotationRecord] = Field(default_factory=list)
    raw_manual_note: str = ""
    retry_count: int = 0


class RetryDecision(BaseModel):
    record_id: str
    can_retry: bool
    reason: str
    required_fixes: List[str] = Field(default_factory=list)
    safety_violation_details: List[str] = Field(default_factory=list)


class StatisticsSnapshot(BaseModel):
    generated_at: datetime = Field(default_factory=datetime.now)
    total_records: int = 0
    by_status: Dict[str, int] = Field(default_factory=dict)
    by_failure_category: Dict[str, int] = Field(default_factory=dict)
    by_question_type: Dict[str, int] = Field(default_factory=dict)
    safety_missing_rate: float = 0.0
    retryable_rate: float = 0.0
