from enum import Enum
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any


class RecordSource(str, Enum):
    STUDENT_OLD_VERSION = "student_old_version"
    MANUAL_REVISION = "manual_revision"
    VERBAL_NOTE = "verbal_note"
    OFFICIAL = "official"

    @property
    def display_name(self) -> str:
        return {
            "student_old_version": "学生错题旧版",
            "manual_revision": "人工改判",
            "verbal_note": "口头备注",
            "official": "正式录入",
        }[self.value]


class ReviewStatus(str, Enum):
    PASSED = "passed"
    WARNING = "warning"
    ERROR = "error"
    EMPTY = "empty"

    @property
    def display_name(self) -> str:
        return {
            "passed": "正常通过",
            "warning": "需关注",
            "error": "处理异常",
            "empty": "空集合（无有效数据）",
        }[self.value]

    @property
    def badge(self) -> str:
        return {
            "passed": "✅",
            "warning": "⚠️",
            "error": "❌",
            "empty": "∅",
        }[self.value]


@dataclass
class Evidence:
    field_name: str
    raw_value: Any
    description: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "field_name": self.field_name,
            "raw_value": self.raw_value,
            "description": self.description,
        }


@dataclass
class ReviewRecord:
    record_id: str
    source: RecordSource
    question_text: str
    student_answer: Optional[str] = None
    correct_answer: Optional[str] = None
    condition_number: Optional[float] = None
    unit: Optional[str] = None
    status: ReviewStatus = ReviewStatus.PASSED
    issues: List[str] = field(default_factory=list)
    evidence: List[Evidence] = field(default_factory=list)
    affected_conclusion: bool = False
    raw_data: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "record_id": self.record_id,
            "source": self.source.value,
            "source_display": self.source.display_name,
            "question_text": self.question_text,
            "student_answer": self.student_answer,
            "correct_answer": self.correct_answer,
            "condition_number": self.condition_number,
            "unit": self.unit,
            "status": self.status.value,
            "status_display": self.status.display_name,
            "status_badge": self.status.badge,
            "issues": self.issues,
            "evidence": [e.to_dict() for e in self.evidence],
            "affected_conclusion": self.affected_conclusion,
        }


@dataclass
class ReviewResult:
    total_count: int = 0
    passed_count: int = 0
    warning_count: int = 0
    error_count: int = 0
    empty_count: int = 0
    records: List[ReviewRecord] = field(default_factory=list)
    conclusion_affectors: List[ReviewRecord] = field(default_factory=list)
    generated_at: str = ""
    input_summary: Dict[str, Any] = field(default_factory=dict)

    @property
    def overall_status(self) -> ReviewStatus:
        if self.total_count == 0:
            return ReviewStatus.EMPTY
        if self.error_count > 0 or self.empty_count > 0:
            return ReviewStatus.ERROR
        if self.warning_count > 0:
            return ReviewStatus.WARNING
        return ReviewStatus.PASSED

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_count": self.total_count,
            "passed_count": self.passed_count,
            "warning_count": self.warning_count,
            "error_count": self.error_count,
            "empty_count": self.empty_count,
            "overall_status": self.overall_status.value,
            "overall_status_display": self.overall_status.display_name,
            "overall_status_badge": self.overall_status.badge,
            "records": [r.to_dict() for r in self.records],
            "conclusion_affectors": [r.to_dict() for r in self.conclusion_affectors],
            "generated_at": self.generated_at,
            "input_summary": self.input_summary,
        }
