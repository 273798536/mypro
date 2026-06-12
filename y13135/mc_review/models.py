"""核心数据模型定义。"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any


class ChangeType(str, Enum):
    """变更类型。"""
    THRESHOLD = "threshold"
    UNIT = "unit"
    NOTE = "note"
    SCORE = "score"
    STATUS = "status"


class ReviewStatus(str, Enum):
    """复盘状态。"""
    PROCESSED = "processed"
    PENDING = "pending"
    MANUAL = "manual"


@dataclass
class HistoryEntry:
    """一条历史记录（备注、截图或判分变更）。"""
    timestamp: datetime
    field: str
    old_value: Optional[str]
    new_value: Optional[str]
    author: str = "system"
    note: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp.isoformat(),
            "field": self.field,
            "old_value": self.old_value,
            "new_value": self.new_value,
            "author": self.author,
            "note": self.note,
        }


@dataclass
class QuestionItem:
    """单道题目。"""
    qid: str
    title: str
    score: float
    max_score: float
    threshold: Optional[str] = None
    unit: str = ""
    status: ReviewStatus = ReviewStatus.PENDING
    original_row: int = 0
    current_index: int = 0
    history: List[HistoryEntry] = field(default_factory=list)
    screenshots: List[str] = field(default_factory=list)
    manual_review_note: str = ""

    @property
    def score_ratio(self) -> float:
        if self.max_score <= 0:
            return 0.0
        return self.score / self.max_score

    def content_hash(self) -> str:
        """基于题目核心内容的哈希，用于检测排序稳定。"""
        raw = f"{self.qid}|{self.title}|{self.max_score}"
        return hashlib.md5(raw.encode("utf-8")).hexdigest()[:8]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "qid": self.qid,
            "title": self.title,
            "score": self.score,
            "max_score": self.max_score,
            "threshold": self.threshold,
            "unit": self.unit,
            "status": self.status.value,
            "original_row": self.original_row,
            "current_index": self.current_index,
            "content_hash": self.content_hash(),
            "history": [h.to_dict() for h in self.history],
            "screenshots": self.screenshots,
            "manual_review_note": self.manual_review_note,
        }


@dataclass
class SortTrace:
    """排序追踪。"""
    qid: str
    original_row: int
    current_index: int
    content_hash: str
    stable: bool

    def to_dict(self) -> Dict[str, Any]:
        return {
            "qid": self.qid,
            "original_row": self.original_row,
            "current_index": self.current_index,
            "content_hash": self.content_hash,
            "stable": self.stable,
        }


@dataclass
class ChangeEvent:
    """结果跳变事件。"""
    qid: str
    change_type: ChangeType
    field_name: str
    before: Optional[str]
    after: Optional[str]
    evidence: str
    severity: str = "medium"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "qid": self.qid,
            "change_type": self.change_type.value,
            "field_name": self.field_name,
            "before": self.before,
            "after": self.after,
            "evidence": self.evidence,
            "severity": self.severity,
        }


@dataclass
class ReviewBundle:
    """复盘结果打包。"""
    questions: List[QuestionItem] = field(default_factory=list)
    sort_traces: List[SortTrace] = field(default_factory=list)
    change_events: List[ChangeEvent] = field(default_factory=list)
    source_file: str = ""
    generated_at: datetime = field(default_factory=datetime.now)

    @property
    def processed(self) -> List[QuestionItem]:
        return [q for q in self.questions if q.status == ReviewStatus.PROCESSED]

    @property
    def pending(self) -> List[QuestionItem]:
        return [q for q in self.questions if q.status == ReviewStatus.PENDING]

    @property
    def manual(self) -> List[QuestionItem]:
        return [q for q in self.questions if q.status == ReviewStatus.MANUAL]

    @property
    def unstable_sorts(self) -> List[SortTrace]:
        return [s for s in self.sort_traces if not s.stable]
