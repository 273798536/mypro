from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional
from datetime import datetime


class AnomalyCategory(str, Enum):
    DUPLICATE_ALIAS = "曲名别名重复"
    MISSING_INTRO = "片头素材缺失"
    CHANNEL_CONFLICT = "通道占用冲突"
    METADATA_MISMATCH = "元数据不一致"
    UNCLASSIFIED = "待分类"


class ProcessingStatus(str, Enum):
    PENDING = "待处理"
    EVIDENCE_NEEDED = "需补证据"
    REJUDGED = "已改判"
    CONFIRMED = "已确认"
    WAIVED = "已豁免"


@dataclass
class ChannelTableEntry:
    entry_id: str
    episode: str
    channel: str
    song_name: str
    song_alias: Optional[str] = None
    intro_file: Optional[str] = None
    duration_sec: Optional[float] = None
    artist: Optional[str] = None
    note: Optional[str] = None

    def display_label(self) -> str:
        parts = [self.episode, self.channel, self.song_name]
        if self.song_alias:
            parts.append(f"({self.song_alias})")
        return " / ".join(parts)


@dataclass
class ManualRejudgment:
    rejudgment_id: str
    anomaly_id: str
    operator: str
    original_verdict: str
    new_verdict: str
    reason: str
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat(timespec="seconds"))
    evidence_refs: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "改判编号": self.rejudgment_id,
            "异常编号": self.anomaly_id,
            "操作人": self.operator,
            "原判定": self.original_verdict,
            "改判为": self.new_verdict,
            "改判原因": self.reason,
            "时间": self.timestamp,
            "证据引用": self.evidence_refs,
        }


@dataclass
class AnomalyRecord:
    anomaly_id: str
    category: AnomalyCategory
    source_entry_ids: list[str]
    description: str
    human_reason: str
    status: ProcessingStatus = ProcessingStatus.PENDING
    rejudgment: Optional[ManualRejudgment] = None
    conclusion: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat(timespec="seconds"))

    def resolve(self, rejudgment: ManualRejudgment, conclusion: str) -> None:
        self.rejudgment = rejudgment
        self.conclusion = conclusion
        self.status = ProcessingStatus.REJUDGED

    def confirm(self, conclusion: str) -> None:
        self.conclusion = conclusion
        self.status = ProcessingStatus.CONFIRMED

    def request_evidence(self) -> None:
        self.status = ProcessingStatus.EVIDENCE_NEEDED

    def waive(self, reason: str) -> None:
        self.conclusion = reason
        self.status = ProcessingStatus.WAIVED

    def is_resolved(self) -> bool:
        return self.status in (
            ProcessingStatus.REJUDGED,
            ProcessingStatus.CONFIRMED,
            ProcessingStatus.WAIVED,
        )

    def to_summary_dict(self) -> dict:
        return {
            "异常编号": self.anomaly_id,
            "分类": self.category.value,
            "来源条目": self.source_entry_ids,
            "异常原因": self.human_reason,
            "状态": self.status.value,
            "结论": self.conclusion or "—",
            "改判": self.rejudgment.to_dict() if self.rejudgment else None,
        }
