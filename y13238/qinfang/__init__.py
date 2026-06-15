from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from dataclasses import dataclass, field, asdict
import uuid


class ExceptionType(str, Enum):
    NAMING_INCONSISTENT = "naming_inconsistent"
    ALIAS_CONFLICT = "alias_conflict"
    VERSION_MISMATCH = "version_mismatch"


class ExceptionStatus(str, Enum):
    PENDING = "pending"
    RESOLVED = "resolved"
    MANUAL_OVERRIDE = "manual_override"


class MaterialStatus(str, Enum):
    NORMAL = "normal"
    ANOMALOUS = "anomalous"
    SUPPLEMENTED = "supplemented"


@dataclass
class Note:
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:8])
    content: str = ""
    note_type: str = ""
    author: str = ""
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self):
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "Note":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class Material:
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:8])
    filename: str = ""
    canonical_name: str = ""
    aliases: list = field(default_factory=list)
    version: int = 1
    status: str = MaterialStatus.NORMAL.value
    notes: list = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self):
        d = asdict(self)
        d["notes"] = [n.to_dict() if isinstance(n, Note) else n for n in self.notes]
        return d

    @classmethod
    def from_dict(cls, data: dict) -> "Material":
        notes_data = data.get("notes", [])
        data["notes"] = [Note.from_dict(n) if isinstance(n, dict) else n for n in notes_data]
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class ExceptionItem:
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:8])
    material_id: str = ""
    material_filename: str = ""
    exception_type: str = ""
    status: str = ExceptionStatus.PENDING.value
    reason: str = ""
    next_step: str = ""
    resolved_by: str = ""
    resolved_at: Optional[str] = None
    notes: list = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self):
        d = asdict(self)
        d["notes"] = [n.to_dict() if isinstance(n, Note) else n for n in self.notes]
        return d

    @classmethod
    def from_dict(cls, data: dict) -> "ExceptionItem":
        notes_data = data.get("notes", [])
        data["notes"] = [Note.from_dict(n) if isinstance(n, dict) else n for n in notes_data]
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class ScanRecord:
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:8])
    scan_time: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    files_scanned: int = 0
    exceptions_found: int = 0
    materials_added: int = 0

    def to_dict(self):
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "ScanRecord":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class ProcessingState:
    materials: list = field(default_factory=list)
    exception_queue: list = field(default_factory=list)
    scan_history: list = field(default_factory=list)
    last_scan_time: Optional[str] = None

    def to_dict(self):
        return {
            "materials": [m.to_dict() if isinstance(m, Material) else m for m in self.materials],
            "exception_queue": [e.to_dict() if isinstance(e, ExceptionItem) else e for e in self.exception_queue],
            "scan_history": [s.to_dict() if isinstance(s, ScanRecord) else s for s in self.scan_history],
            "last_scan_time": self.last_scan_time,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "ProcessingState":
        materials = [Material.from_dict(m) for m in data.get("materials", [])]
        exception_queue = [ExceptionItem.from_dict(e) for e in data.get("exception_queue", [])]
        scan_history = [ScanRecord.from_dict(s) for s in data.get("scan_history", [])]
        return cls(
            materials=materials,
            exception_queue=exception_queue,
            scan_history=scan_history,
            last_scan_time=data.get("last_scan_time"),
        )
