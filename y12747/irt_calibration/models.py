from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime
import uuid


class RecordStatus(Enum):
    PENDING = "待处理"
    IMPORTED = "已导入"
    VALID = "校验通过"
    INVALID = "校验失败"
    PROCESSED = "已校准"
    GAP = "数据缺失"
    REVIEWED = "已复核"
    EXCLUDED = "已排除"


class IssueType(Enum):
    DIVISION_BY_ZERO = "除零风险"
    MISSING_HISTORY = "历史答案缺失"
    LOW_RESPONSE_COUNT = "答题人数不足"
    PERFECT_SCORE = "全对/全错题"
    CONSTRAINT_VIOLATION = "约束违反"
    OUTLIER_ABILITY = "能力值异常"
    UNSTABLE_RANK = "排序不稳定"


@dataclass
class StudentAnswer:
    student_id: str
    item_id: str
    is_correct: Optional[int] = None
    timestamp: Optional[str] = None
    source: str = "导入"
    raw_row: Optional[Dict[str, Any]] = None


@dataclass
class Item:
    item_id: str
    course_id: str
    item_name: str
    difficulty: Optional[float] = None
    discrimination: float = 1.0
    guess: float = 0.0
    response_count: int = 0
    correct_rate: Optional[float] = None


@dataclass
class Student:
    student_id: str
    ability: Optional[float] = None
    ability_se: Optional[float] = None
    answered_count: int = 0
    valid_answers: int = 0


@dataclass
class Issue:
    issue_id: str = field(default_factory=lambda: f"ISS-{uuid.uuid4().hex[:8]}")
    issue_type: IssueType = IssueType.MISSING_HISTORY
    severity: str = "medium"
    description: str = ""
    related_student_id: Optional[str] = None
    related_item_id: Optional[str] = None
    affected_records: List[str] = field(default_factory=list)
    suggestion: str = ""
    reviewed: bool = False
    review_note: Optional[str] = None
    resolved: bool = False


@dataclass
class ProcessingRecord:
    record_id: str = field(default_factory=lambda: f"REC-{uuid.uuid4().hex[:8]}")
    batch_id: str = field(default_factory=lambda: f"BATCH-{datetime.now().strftime('%Y%m%d%H%M%S')}")
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

    student_answers: List[StudentAnswer] = field(default_factory=list)
    items: Dict[str, Item] = field(default_factory=dict)
    students: Dict[str, Student] = field(default_factory=dict)

    valid_answer_count: int = 0
    excluded_answer_count: int = 0
    gap_count: int = 0

    constraint_checks: List[Dict[str, Any]] = field(default_factory=list)
    error_analysis: List[Dict[str, Any]] = field(default_factory=list)
    issues: List[Issue] = field(default_factory=list)

    status: RecordStatus = RecordStatus.PENDING
    review_notes: List[Dict[str, Any]] = field(default_factory=list)
    irt_params: Dict[str, Any] = field(default_factory=dict)
    raw_materials_ref: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "record_id": self.record_id,
            "batch_id": self.batch_id,
            "created_at": self.created_at,
            "status": self.status.value,
            "valid_answer_count": self.valid_answer_count,
            "excluded_answer_count": self.excluded_answer_count,
            "gap_count": self.gap_count,
            "student_answers": [
                {
                    "student_id": a.student_id,
                    "item_id": a.item_id,
                    "is_correct": a.is_correct,
                    "timestamp": a.timestamp,
                    "source": a.source,
                    "raw_row": a.raw_row,
                }
                for a in self.student_answers
            ],
            "items": {
                iid: {
                    "item_id": it.item_id,
                    "course_id": it.course_id,
                    "item_name": it.item_name,
                    "difficulty": it.difficulty,
                    "discrimination": it.discrimination,
                    "guess": it.guess,
                    "response_count": it.response_count,
                    "correct_rate": it.correct_rate,
                }
                for iid, it in self.items.items()
            },
            "students": {
                sid: {
                    "student_id": s.student_id,
                    "ability": s.ability,
                    "ability_se": s.ability_se,
                    "answered_count": s.answered_count,
                    "valid_answers": s.valid_answers,
                }
                for sid, s in self.students.items()
            },
            "constraint_checks": self.constraint_checks,
            "error_analysis": self.error_analysis,
            "issues": [self._issue_to_dict(i) for i in self.issues],
            "irt_params": self.irt_params,
            "review_notes": self.review_notes,
            "raw_materials": self.raw_materials_ref,
        }

    @staticmethod
    def _issue_to_dict(i: "Issue") -> Dict[str, Any]:
        return {
            "issue_id": i.issue_id,
            "issue_type": i.issue_type.value,
            "severity": i.severity,
            "description": i.description,
            "related_student_id": i.related_student_id,
            "related_item_id": i.related_item_id,
            "affected_records": i.affected_records,
            "suggestion": i.suggestion,
            "reviewed": i.reviewed,
            "review_note": i.review_note,
            "resolved": i.resolved,
        }


@dataclass
class GapRecord:
    gap_id: str = field(default_factory=lambda: f"GAP-{uuid.uuid4().hex[:8]}")
    student_id: Optional[str] = None
    item_id: Optional[str] = None
    missing_fields: List[str] = field(default_factory=list)
    raw_data: Optional[Dict[str, Any]] = None
    reason: str = ""
    assigned_to: str = "风控分析师"
