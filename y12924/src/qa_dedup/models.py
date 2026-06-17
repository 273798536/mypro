"""核心数据模型定义."""

from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
import hashlib
import json


class SplitType(Enum):
    TRAIN = "train"
    VAL = "val"
    TEST = "test"
    UNASSIGNED = "unassigned"


class IssueSeverity(Enum):
    BLOCKER = "blocker"
    WARNING = "warning"
    INFO = "info"


class IssueType(Enum):
    TRAIN_VAL_LEAK = "train_val_leak"
    DUPLICATE = "duplicate"
    TEMPLATE_DETECTED = "template_detected"
    MANUAL_FLAG = "manual_flag"


@dataclass
class HumanNote:
    content: str
    note_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    author: str = "anonymous"
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    preserved_original: Optional[str] = None

    def __post_init__(self):
        if self.preserved_original is None:
            self.preserved_original = self.content


@dataclass
class QASample:
    question: str
    answer: str
    sample_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    split: SplitType = SplitType.UNASSIGNED
    source: str = "unknown"
    group: Optional[str] = None
    version_tag: str = "v1"
    template_removed: bool = False
    original_question: Optional[str] = None
    original_answer: Optional[str] = None
    human_notes: List[HumanNote] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())

    @property
    def content_hash(self) -> str:
        normalized = self._normalize_text(self.question) + "|||" + self._normalize_text(self.answer)
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

    @property
    def question_hash(self) -> str:
        return hashlib.sha256(self._normalize_text(self.question).encode("utf-8")).hexdigest()

    @staticmethod
    def _normalize_text(text: str) -> str:
        if not text:
            return ""
        import re
        text = re.sub(r"\s+", "", text)
        text = re.sub(r"[，。！？、；：""''（）【】《》,.!?;:\'\"()\[\]<>]", "", text)
        return text.lower()

    def add_human_note(self, content: str, author: str = "anonymous") -> HumanNote:
        note = HumanNote(content=content, author=author)
        self.human_notes.append(note)
        self.updated_at = datetime.now().isoformat()
        return note

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data["split"] = self.split.value
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "QASample":
        notes_data = data.pop("human_notes", [])
        split_value = data.pop("split", "unassigned")
        sample = cls(**data)
        sample.split = SplitType(split_value)
        sample.human_notes = [HumanNote(**n) for n in notes_data]
        return sample


@dataclass
class LeakRecord:
    train_sample_id: str
    val_sample_id: str
    train_question_preview: str
    val_question_preview: str
    similarity_score: float
    leak_reason: str
    plain_text_explanation: str
    leak_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    issue_type: IssueType = IssueType.TRAIN_VAL_LEAK
    severity: IssueSeverity = IssueSeverity.BLOCKER
    matched_fields: List[str] = field(default_factory=list)
    preserved_human_notes: List[str] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data["issue_type"] = self.issue_type.value
        data["severity"] = self.severity.value
        return data


@dataclass
class DedupRecord:
    kept_sample_id: str
    removed_sample_id: str
    kept_question_preview: str
    removed_question_preview: str
    similarity_score: float
    dedup_reason: str
    dedup_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    issue_type: IssueType = IssueType.DUPLICATE
    severity: IssueSeverity = IssueSeverity.WARNING
    is_incremental: bool = False
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data["issue_type"] = self.issue_type.value
        data["severity"] = self.severity.value
        return data


@dataclass
class DatasetVersion:
    version_tag: str
    description: str = ""
    parent_version: Optional[str] = None
    sample_count: int = 0
    train_count: int = 0
    val_count: int = 0
    test_count: int = 0
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    change_log: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class GroupMetrics:
    group_name: str
    total_samples: int = 0
    usable_samples: int = 0
    blocked_samples: int = 0
    train_count: int = 0
    val_count: int = 0
    leak_count: int = 0
    duplicate_count: int = 0
    template_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class WorkflowReport:
    report_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    generated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    version_tag: str = "v1"
    total_processed: int = 0
    total_usable: int = 0
    total_blocked: int = 0
    group_metrics: List[GroupMetrics] = field(default_factory=list)
    leak_records: List[LeakRecord] = field(default_factory=list)
    dedup_records: List[DedupRecord] = field(default_factory=list)
    template_removed_count: int = 0
    blocked_sample_ids: List[str] = field(default_factory=list)
    usable_sample_ids: List[str] = field(default_factory=list)
    export_summary: str = ""

    def to_dict(self) -> Dict[str, Any]:
        data = {
            "report_id": self.report_id,
            "generated_at": self.generated_at,
            "version_tag": self.version_tag,
            "total_processed": self.total_processed,
            "total_usable": self.total_usable,
            "total_blocked": self.total_blocked,
            "group_metrics": [gm.to_dict() for gm in self.group_metrics],
            "leak_records": [lr.to_dict() for lr in self.leak_records],
            "dedup_records": [dr.to_dict() for dr in self.dedup_records],
            "template_removed_count": self.template_removed_count,
            "blocked_sample_ids": self.blocked_sample_ids,
            "usable_sample_ids": self.usable_sample_ids,
            "export_summary": self.export_summary,
        }
        return data

    def to_json(self, indent: int = 2, ensure_ascii: bool = False) -> str:
        return json.dumps(self.to_dict(), indent=indent, ensure_ascii=ensure_ascii)
