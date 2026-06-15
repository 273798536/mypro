from __future__ import annotations

import hashlib
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from uuid import uuid4


def _now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _uid() -> str:
    return uuid4().hex[:12]


class NoteType(str, Enum):
    STAGE_CHANNEL = "stage_channel"
    REHEARSAL = "rehearsal"
    AUTHORIZATION = "authorization"
    TEACHER_EDIT = "teacher_edit"
    OTHER = "other"


class CheckStatus(str, Enum):
    PASS = "pass"
    WARNING = "warning"
    FAIL = "fail"
    PENDING = "pending"
    HANG = "hang"


@dataclass
class SampleItem:
    item_id: str = field(default_factory=_uid)
    name: str = ""
    file_path: str = ""
    duration_sec: float = 0.0
    sample_rate: int = 44100
    bit_depth: int = 16
    timecode_offset_beats: float = 0.0
    checksum: str = ""
    channel_count: int = 2

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class Note:
    note_id: str = field(default_factory=_uid)
    note_type: NoteType = NoteType.OTHER
    content: str = ""
    author: str = ""
    created_at: str = field(default_factory=_now_iso)
    affects_fields: List[str] = field(default_factory=list)

    def signature(self) -> str:
        raw = "|".join([
            self.note_type.value,
            self.content,
            self.author,
            ",".join(sorted(self.affects_fields)),
        ])
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["note_type"] = self.note_type.value
        d["signature"] = self.signature()
        return d


@dataclass
class DeliveryChecklistItem:
    name: str
    expected: bool = True
    found: bool = False
    remark: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class DeliveryChecklist:
    items: List[DeliveryChecklistItem] = field(default_factory=list)
    checklist_version: str = "v1.0"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "checklist_version": self.checklist_version,
            "items": [i.to_dict() for i in self.items],
        }


@dataclass
class CheckResult:
    status: CheckStatus = CheckStatus.PASS
    title: str = ""
    detail: str = ""
    affected_item_ids: List[str] = field(default_factory=list)
    requires_confirm_role: str = ""
    changed_by_note_ids: List[str] = field(default_factory=list)
    related_judgments: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["status"] = self.status.value
        return d


@dataclass
class DetectionRecord:
    record_id: str = field(default_factory=_uid)
    package_id: str = ""
    scanned_at: str = field(default_factory=_now_iso)
    operator: str = ""
    results: List[CheckResult] = field(default_factory=list)
    note_signatures_seen: List[str] = field(default_factory=list)
    stage_channel_note_applied: bool = False
    manual_annotations: List[str] = field(default_factory=list)
    package_version: str = ""
    checklist: Optional[DeliveryChecklist] = None
    cross_validation_ok: bool = True
    cross_validation_issues: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "record_id": self.record_id,
            "package_id": self.package_id,
            "scanned_at": self.scanned_at,
            "operator": self.operator,
            "results": [r.to_dict() for r in self.results],
            "note_signatures_seen": self.note_signatures_seen,
            "stage_channel_note_applied": self.stage_channel_note_applied,
            "manual_annotations": self.manual_annotations,
            "package_version": self.package_version,
            "checklist": self.checklist.to_dict() if self.checklist else None,
            "cross_validation_ok": self.cross_validation_ok,
            "cross_validation_issues": self.cross_validation_issues,
        }


@dataclass
class SamplePackage:
    package_id: str = field(default_factory=_uid)
    name: str = ""
    version: str = "v1.0"
    items: List[SampleItem] = field(default_factory=list)
    notes: List[Note] = field(default_factory=list)
    manual_annotations: List[str] = field(default_factory=list)
    delivery_checklist: Optional[DeliveryChecklist] = None
    created_at: str = field(default_factory=_now_iso)
    updated_at: str = field(default_factory=_now_iso)

    def add_note(self, note: Note) -> Note:
        self.notes.append(note)
        self.updated_at = _now_iso()
        return note

    def to_dict(self) -> Dict[str, Any]:
        return {
            "package_id": self.package_id,
            "name": self.name,
            "version": self.version,
            "items": [i.to_dict() for i in self.items],
            "notes": [n.to_dict() for n in self.notes],
            "manual_annotations": list(self.manual_annotations),
            "delivery_checklist": (
                self.delivery_checklist.to_dict()
                if self.delivery_checklist
                else None
            ),
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


@dataclass
class VersionedState:
    version: int = 0
    snapshot: Dict[str, Any] = field(default_factory=dict)
    changed_by: str = ""
    changed_reason: str = ""
    changed_at: str = field(default_factory=_now_iso)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
