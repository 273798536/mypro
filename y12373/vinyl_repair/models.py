from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional


class NoiseType(Enum):
    BACKGROUND_NOISE = "底噪"
    POP = "爆音"
    BEAT_DRIFT = "节拍漂移"


class Severity(Enum):
    MILD = "轻微"
    MEDIUM = "中等"
    SEVERE = "严重"


class RepairActionType(Enum):
    DENOISE = "降噪"
    REMOVE_POP = "去爆音"
    BEAT_CORRECTION = "节拍修正"


class HistoryEventType(Enum):
    RECOGNITION = "识别"
    REPAIR = "修复"
    MIS_DELETE = "误删原声"
    BEAT_DRIFT = "节拍漂移"
    NOTE_MODIFIED = "备注修改"
    LATE_ADDITION = "晚补"
    PREVIEW_CHANGE = "预览变化"


@dataclass
class AudioClip:
    clip_id: str
    title: str
    duration: float
    source: str
    file_path: Optional[str] = None

    def validate(self):
        issues = []
        if not self.clip_id:
            issues.append("缺少 clip_id")
        if not self.title:
            issues.append("缺少 title")
        if self.duration <= 0:
            issues.append("duration 无效")
        if not self.source:
            issues.append("缺少 source")
        if not self.file_path:
            issues.append("缺少 file_path")
        return issues


@dataclass
class NoiseAnnotation:
    annotation_id: str
    clip_id: str
    noise_type: NoiseType
    severity: Severity
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    description: Optional[str] = None
    is_late_addition: bool = False
    notes_modified: bool = False
    original_notes: Optional[str] = None
    current_notes: Optional[str] = None

    def validate(self):
        issues = []
        if not self.annotation_id:
            issues.append("缺少 annotation_id")
        if not self.clip_id:
            issues.append("缺少 clip_id")
        if self.start_time is None:
            issues.append("缺少 start_time")
        if self.end_time is None:
            issues.append("缺少 end_time")
        if self.description is None:
            issues.append("缺少 description")
        if self.is_late_addition:
            issues.append("晚补记录")
        if self.notes_modified:
            issues.append("备注已被修改")
        return issues


@dataclass
class RepairAction:
    action_id: str
    annotation_id: str
    action_type: RepairActionType
    result: str
    mis_deleted_original: bool = False
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())

    def validate(self):
        issues = []
        if not self.action_id:
            issues.append("缺少 action_id")
        if not self.annotation_id:
            issues.append("缺少 annotation_id")
        if self.mis_deleted_original:
            issues.append("⚠️ 误删原声")
        return issues


@dataclass
class ScoreReport:
    report_id: str
    student_id: str
    clip_id: str
    annotation_id: str
    score: float
    accuracy: float
    repair_quality: float
    issues: list = field(default_factory=list)
    submitted_at: Optional[str] = None

    def validate(self):
        issues = []
        if not self.report_id:
            issues.append("缺少 report_id")
        if not self.student_id:
            issues.append("缺少 student_id")
        if not self.clip_id:
            issues.append("缺少 clip_id")
        if not self.annotation_id:
            issues.append("缺少 annotation_id")
        if self.submitted_at is None:
            issues.append("缺少 submitted_at")
        if not 0 <= self.score <= 100:
            issues.append("score 超出范围")
        if not 0 <= self.accuracy <= 100:
            issues.append("accuracy 超出范围")
        if not 0 <= self.repair_quality <= 100:
            issues.append("repair_quality 超出范围")
        return issues


@dataclass
class HistoryEntry:
    entry_id: str
    annotation_id: str
    event_type: HistoryEventType
    description: str
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    superseded_by: Optional[str] = None
    related_clip_id: Optional[str] = None
    related_report_id: Optional[str] = None

    @property
    def is_active(self):
        return self.superseded_by is None

    @property
    def is_critical(self):
        return self.event_type in (
            HistoryEventType.MIS_DELETE,
            HistoryEventType.BEAT_DRIFT,
        )
