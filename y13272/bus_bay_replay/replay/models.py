from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
import hashlib


class ComplaintStatus(str, Enum):
    PENDING_SITE = "待现场看"
    PROCESSED = "已处理"
    CONFLICT = "冲突记录"
    PENDING_REVIEW = "待复核"


class RecordAction(str, Enum):
    SUBMIT = "提交"
    WITHDRAW = "撤回"
    MODIFY = "修改"
    REVIEW = "复核"


@dataclass
class ComplaintRecord:
    complaint_id: str
    bay_name: str
    bay_address: str
    complaint_type: str
    description: str
    submitter: str
    submit_time: datetime
    status: ComplaintStatus = ComplaintStatus.PENDING_SITE
    handler: Optional[str] = None
    handle_result: Optional[str] = None
    handle_time: Optional[datetime] = None
    source: str = "manual"
    extra: Dict[str, Any] = field(default_factory=dict)

    def idempotency_key(self) -> str:
        raw = f"{self.complaint_id}|{self.bay_name}|{self.description}|{self.submitter}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


@dataclass
class MeetingMinute:
    minute_id: str
    meeting_time: datetime
    meeting_title: str
    content: str
    recorder: str
    version: int = 1
    is_appendum: bool = False
    appendum_note: Optional[str] = None
    screenshot_refs: List[str] = field(default_factory=list)
    related_complaint_ids: List[str] = field(default_factory=list)
    raw_source: Optional[str] = None

    def version_key(self) -> str:
        return f"{self.minute_id}_v{self.version}"


@dataclass
class HistoryEntry:
    entry_id: str
    entity_type: str
    entity_id: str
    action: RecordAction
    actor: str
    timestamp: datetime
    before_value: Optional[Dict[str, Any]] = None
    after_value: Optional[Dict[str, Any]] = None
    reason: Optional[str] = None
    source_ref: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "entry_id": self.entry_id,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "action": self.action.value,
            "actor": self.actor,
            "timestamp": self.timestamp.isoformat(),
            "before_value": self.before_value,
            "after_value": self.after_value,
            "reason": self.reason,
            "source_ref": self.source_ref,
        }


@dataclass
class ReplayState:
    records: Dict[str, ComplaintRecord] = field(default_factory=dict)
    minutes: Dict[str, List[MeetingMinute]] = field(default_factory=dict)
    history: List[HistoryEntry] = field(default_factory=list)
    idempotency_seen: set = field(default_factory=set)
    created_at: datetime = field(default_factory=datetime.now)
    last_updated: datetime = field(default_factory=datetime.now)

    def get_minute_versions(self, minute_id: str) -> List[MeetingMinute]:
        return sorted(self.minutes.get(minute_id, []), key=lambda m: m.version)
