from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class JudgmentStatus(str, Enum):
    PENDING = "待确认"
    CORRECT = "正确"
    INCORRECT = "错误"
    SKIPPED = "跳过"


class RowStatus(str, Enum):
    PROCESSED = "已处理"
    BAD = "坏行"
    SKIPPED = "跳过"


class CorrectionRecord(BaseModel):
    operator: str
    old_status: JudgmentStatus
    new_status: JudgmentStatus
    reason: str
    timestamp: datetime = Field(default_factory=datetime.now)


class QASample(BaseModel):
    sample_id: str
    question: str
    answer: str
    reference_answer: Optional[str] = None
    predicted_status: JudgmentStatus
    final_status: JudgmentStatus = JudgmentStatus.PENDING
    corrections: List[CorrectionRecord] = Field(default_factory=list)
    notes: Optional[str] = None
    row_status: RowStatus = RowStatus.PROCESSED
    bad_reason: Optional[str] = None


class Attachment(BaseModel):
    name: str
    content: str
    is_late: bool = False
    arrive_time: Optional[datetime] = None


class VersionNote(BaseModel):
    version: str
    release_time: datetime
    operator: str
    description: str
    referenced_sample_ids: List[str] = Field(default_factory=list)
    attachments: List[Attachment] = Field(default_factory=list)
    threshold_adjustment: Optional[Dict[str, float]] = None
    missing_references: List[str] = Field(default_factory=list)


class ProcessingStats(BaseModel):
    total: int = 0
    processed: int = 0
    bad: int = 0
    skipped: int = 0
    bad_samples: List[str] = Field(default_factory=list)
    skipped_samples: List[str] = Field(default_factory=list)
    processed_samples: List[str] = Field(default_factory=list)


class MissingRefInfo(BaseModel):
    reason: str
    affected_version: str
    affected_sample_ids: List[str]
    impact_scope: str


class HistoryEntry(BaseModel):
    version: str
    timestamp: datetime = Field(default_factory=datetime.now)
    samples: List[QASample]
    stats: ProcessingStats
    version_note: VersionNote
    pending_confirmations: List[MissingRefInfo] = Field(default_factory=list)


class VersionDiff(BaseModel):
    version_a: str
    version_b: str
    sample_changes: Dict[str, Dict[str, str]] = Field(default_factory=dict)
    threshold_changes: Dict[str, Dict[str, Optional[float]]] = Field(default_factory=dict)
    metric_changes: Dict[str, Dict[str, int]] = Field(default_factory=dict)
