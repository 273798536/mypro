from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, field_validator


class ItemStatus(str, Enum):
    PENDING = "pending"
    PROCESSED = "processed"
    SKIPPED = "skipped"
    BAD = "bad"
    NEEDS_EVIDENCE = "needs_evidence"
    NEEDS_CONFIRMATION = "needs_confirmation"


class ConflictType(str, Enum):
    TIME_OVERLAP = "time_overlap"
    NAME_MISMATCH = "name_mismatch"
    MISSING_FILE = "missing_file"
    EXTRA_FILE = "extra_file"
    TIMECODE_DRIFT = "timecode_drift"
    DUPLICATE = "duplicate"


class HistoryAction(str, Enum):
    CREATED = "created"
    UPDATED = "updated"
    NOTE_ADDED = "note_added"
    SCREENSHOT_ADDED = "screenshot_added"
    STATUS_CHANGED = "status_changed"
    CONFLICT_DETECTED = "conflict_detected"
    CONFLICT_RESOLVED = "conflict_resolved"
    MANUAL_CONFIRMATION = "manual_confirmation"


class Timecode(BaseModel):
    hours: int = 0
    minutes: int = 0
    seconds: int = 0
    frames: int = 0
    fps: float = 25.0

    @classmethod
    def from_string(cls, tc_str: str) -> "Timecode":
        parts = tc_str.replace(";", ":").split(":")
        if len(parts) != 4:
            raise ValueError(f"Invalid timecode format: {tc_str}")
        return cls(
            hours=int(parts[0]),
            minutes=int(parts[1]),
            seconds=int(parts[2]),
            frames=int(parts[3]),
        )

    def to_seconds(self) -> float:
        return (
            self.hours * 3600
            + self.minutes * 60
            + self.seconds
            + self.frames / self.fps
        )

    def __str__(self) -> str:
        return f"{self.hours:02d}:{self.minutes:02d}:{self.seconds:02d}:{self.frames:02d}"


class ScheduleItem(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    track_id: str
    title: str
    artist: str
    start_time: Optional[Timecode] = None
    end_time: Optional[Timecode] = None
    expected_filename: str
    booth: str
    day: int
    status: ItemStatus = ItemStatus.PENDING
    notes: List[str] = Field(default_factory=list)
    screenshots: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("track_id")
    @classmethod
    def track_id_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("track_id cannot be empty")
        return v.strip()


class AudioFile(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    filename: str
    file_path: str
    file_size: int
    created_at: datetime
    modified_at: datetime
    track_id: Optional[str] = None
    title: Optional[str] = None
    timecode: Optional[Timecode] = None
    is_screenshot: bool = False
    is_note: bool = False
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ConflictRecord(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    conflict_type: ConflictType
    schedule_item_id: Optional[UUID] = None
    audio_file_id: Optional[UUID] = None
    description: str
    severity: str = "warning"
    resolution: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    requires_manual_confirmation: bool = False
    confirmation_reason: Optional[str] = None
    next_steps: Optional[List[str]] = None


class HistoryEntry(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    timestamp: datetime = Field(default_factory=datetime.now)
    action: HistoryAction
    item_id: Optional[UUID] = None
    actor: str = "system"
    details: Dict[str, Any] = Field(default_factory=dict)
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None
    note: Optional[str] = None
    screenshot_path: Optional[str] = None


class ProcessingStats(BaseModel):
    total: int = 0
    processed: int = 0
    skipped: int = 0
    bad: int = 0
    needs_evidence: int = 0
    needs_confirmation: int = 0
    conflicts_detected: int = 0
    conflicts_resolved: int = 0
    start_time: datetime = Field(default_factory=datetime.now)
    end_time: Optional[datetime] = None

    @property
    def elapsed(self) -> float:
        end = self.end_time or datetime.now()
        return (end - self.start_time).total_seconds()


class ProcessingResult(BaseModel):
    stats: ProcessingStats = Field(default_factory=ProcessingStats)
    schedule_items: List[ScheduleItem] = Field(default_factory=list)
    audio_files: List[AudioFile] = Field(default_factory=list)
    conflicts: List[ConflictRecord] = Field(default_factory=list)
    history: List[HistoryEntry] = Field(default_factory=list)
    bad_rows: List[Dict[str, Any]] = Field(default_factory=list)
    skipped_rows: List[Dict[str, Any]] = Field(default_factory=list)
