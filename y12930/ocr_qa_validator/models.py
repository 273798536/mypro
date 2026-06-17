"""核心数据模型定义"""

from dataclasses import dataclass, field, asdict
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
import json


def _generate_id() -> str:
    """生成唯一 ID"""
    return uuid.uuid4().hex[:12]


def _now_iso() -> str:
    """当前时间 ISO 格式"""
    return datetime.now().isoformat()


@dataclass
class SourceTrace:
    """来源追踪信息 - 保留原始行号、图片名、来源备注"""

    source_file: str = ""
    source_row: Optional[int] = None
    image_name: str = ""
    source_note: str = ""

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "SourceTrace":
        return cls(**data)


@dataclass
class Sample:
    """OCR 问答样本 - 训练样本数据"""

    sample_id: str = field(default_factory=_generate_id)
    question: str = ""
    answer: str = ""
    context: str = ""
    confidence: float = 1.0
    data_type: str = "general"
    difficulty: str = "medium"
    source_trace: SourceTrace = field(default_factory=SourceTrace)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=_now_iso)
    version: str = "v1"

    def to_dict(self) -> dict:
        data = asdict(self)
        data["source_trace"] = self.source_trace.to_dict()
        return data

    @classmethod
    def from_dict(cls, data: dict) -> "Sample":
        source_trace_data = data.pop("source_trace", {})
        sample = cls(**data)
        sample.source_trace = SourceTrace.from_dict(source_trace_data)
        return sample


@dataclass
class AnnotationRecord:
    """标注记录 - 人工标注/修正记录"""

    annotation_id: str = field(default_factory=_generate_id)
    sample_id: str = ""
    annotator: str = ""
    question_corrected: Optional[str] = None
    answer_corrected: Optional[str] = None
    context_corrected: Optional[str] = None
    status: str = "pending"
    comment: str = ""
    created_at: str = field(default_factory=_now_iso)
    updated_at: str = field(default_factory=_now_iso)
    metadata: Dict[str, Any] = field(default_factory=dict)

    VALID_STATUSES = {"pending", "approved", "rejected", "needs_review", "corrected"}

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "AnnotationRecord":
        return cls(**data)


@dataclass
class SafetyCheckResult:
    """安全检查结果"""

    passed: bool = True
    blocked_reasons: List[str] = field(default_factory=list)
    risk_level: str = "low"
    checks: Dict[str, bool] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "SafetyCheckResult":
        return cls(**data)


@dataclass
class ValidationResult:
    """单条样本校验结果"""

    sample_id: str = ""
    sample_version: str = ""
    validation_status: str = "pending"
    safety_check: SafetyCheckResult = field(default_factory=SafetyCheckResult)
    metrics: Dict[str, Any] = field(default_factory=dict)
    annotation: Optional[AnnotationRecord] = None
    validated_at: str = field(default_factory=_now_iso)

    STATUS_PASSED = "passed"
    STATUS_PENDING = "pending"
    STATUS_BLOCKED = "blocked"
    STATUS_NEEDS_REVIEW = "needs_review"

    def to_dict(self) -> dict:
        data = asdict(self)
        data["safety_check"] = self.safety_check.to_dict()
        if self.annotation:
            data["annotation"] = self.annotation.to_dict()
        return data

    @classmethod
    def from_dict(cls, data: dict) -> "ValidationResult":
        safety_data = data.pop("safety_check", {})
        annotation_data = data.pop("annotation", None)
        result = cls(**data)
        result.safety_check = SafetyCheckResult.from_dict(safety_data)
        if annotation_data:
            result.annotation = AnnotationRecord.from_dict(annotation_data)
        return result


@dataclass
class DatasetVersion:
    """数据集版本 - 版本追踪"""

    version_id: str = field(default_factory=_generate_id)
    version_name: str = "v1"
    description: str = ""
    sample_count: int = 0
    parent_version: Optional[str] = None
    created_by: str = "system"
    created_at: str = field(default_factory=_now_iso)
    sample_ids: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "DatasetVersion":
        return cls(**data)
