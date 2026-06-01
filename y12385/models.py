from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Dict, Any
from enum import Enum


class EmotionLevel(Enum):
    VERY_LOW = 1
    LOW = 2
    MODERATE = 3
    HIGH = 4
    VERY_HIGH = 5


class IssueType(Enum):
    EMOTION_MISSING = "情绪缺填"
    TRACK_DUPLICATE = "曲目重复"
    PRIVACY_LEAK = "隐私备注外泄"


class IssueSeverity(Enum):
    LOW = "低"
    MEDIUM = "中"
    HIGH = "高"


@dataclass
class Client:
    client_id: str
    name: str
    age: Optional[int] = None
    notes: str = ""
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class MusicTrack:
    track_id: str
    title: str
    artist: str
    duration: int
    genre: str = ""
    tags: List[str] = field(default_factory=list)


@dataclass
class SessionPlan:
    plan_id: str
    client_id: str
    title: str
    planned_tracks: List[str]
    goals: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class SessionEmotion:
    before: Optional[EmotionLevel] = None
    during: Optional[EmotionLevel] = None
    after: Optional[EmotionLevel] = None


@dataclass
class PlayedTrack:
    track_id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    notes: str = ""


@dataclass
class Issue:
    issue_id: str
    issue_type: IssueType
    severity: IssueSeverity
    description: str
    location: str
    resolved: bool = False
    resolved_at: Optional[datetime] = None


@dataclass
class TherapySession:
    session_id: str
    client_id: str
    plan_id: Optional[str]
    start_time: datetime
    end_time: Optional[datetime] = None
    emotion: SessionEmotion = field(default_factory=SessionEmotion)
    played_tracks: List[PlayedTrack] = field(default_factory=list)
    private_notes: str = ""
    public_notes: str = ""
    issues: List[Issue] = field(default_factory=list)
    is_archived: bool = False
    privacy_mask_level: int = 0
    created_at: datetime = field(default_factory=datetime.now)
    source_references: Dict[str, str] = field(default_factory=dict)


@dataclass
class ArchiveRecord:
    archive_id: str
    session_id: str
    privacy_mask_level: int
    archived_at: datetime = field(default_factory=datetime.now)
    emotion_summary: Optional[Dict[str, Any]] = None
    export_content: Optional[str] = None
