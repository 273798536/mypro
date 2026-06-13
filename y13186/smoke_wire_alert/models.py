from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any


class ProcessingStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    ALERT = "alert"
    NORMAL = "normal"
    BLOCKED = "blocked"
    MANUAL_OVERRIDDEN = "manual_overridden"
    REPROCESSED = "reprocessed"


class BlockReason(str, Enum):
    FORMULA_ERROR = "formula_error"
    UNIT_MISMATCH = "unit_mismatch"
    THRESHOLD_MISSING = "threshold_missing"
    LATE_ATTACHMENT = "late_attachment"


class JumpCause(str, Enum):
    THRESHOLD_CHANGED = "threshold_changed"
    UNIT_CHANGED = "unit_changed"
    LATE_ATTACHMENT_ARRIVED = "late_attachment_arrived"


@dataclass
class AlertAttachment:
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:8])
    name: str = ""
    content: Dict[str, Any] = field(default_factory=dict)
    arrived_at: str = field(default_factory=lambda: datetime.now().isoformat())
    is_late: bool = False
    fields_affected: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AlertAttachment":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class ManualNote:
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:8])
    author: str = ""
    content: str = ""
    judgment: Optional[str] = None
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    aligns_with_alert: Optional[bool] = None
    misalignment_reason: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ManualNote":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class HistoryChange:
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:8])
    field_name: str = ""
    old_value: Any = None
    new_value: Any = None
    operator: str = ""
    reason: str = ""
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    is_temporary: bool = False

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "HistoryChange":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class WindTunnelSmokeAlert:
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:8])
    source: str = ""
    record_time: str = field(default_factory=lambda: datetime.now().isoformat())

    raw_fields: Dict[str, Any] = field(default_factory=dict)

    smoke_density: Optional[float] = None
    smoke_density_unit: Optional[str] = None
    wind_speed: Optional[float] = None
    wind_speed_unit: Optional[str] = None
    wind_direction: Optional[float] = None
    wind_direction_sign_correct: Optional[bool] = None

    formula: Optional[str] = None
    formula_result: Optional[float] = None

    threshold_high: Optional[float] = None
    threshold_low: Optional[float] = None
    threshold_unit: Optional[str] = None

    status: ProcessingStatus = ProcessingStatus.PENDING
    block_reason: Optional[BlockReason] = None
    block_detail: Optional[str] = None

    attachments: List[AlertAttachment] = field(default_factory=list)
    manual_notes: List[ManualNote] = field(default_factory=list)
    history: List[HistoryChange] = field(default_factory=list)

    jump_detected: bool = False
    jump_cause: Optional[JumpCause] = None
    jump_detail: Optional[str] = None
    previous_result: Optional[float] = None

    next_step: Optional[str] = None
    final_judgment: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data["status"] = self.status.value
        if self.block_reason:
            data["block_reason"] = self.block_reason.value
        if self.jump_cause:
            data["jump_cause"] = self.jump_cause.value
        data["attachments"] = [a.to_dict() for a in self.attachments]
        data["manual_notes"] = [n.to_dict() for n in self.manual_notes]
        data["history"] = [h.to_dict() for h in self.history]
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "WindTunnelSmokeAlert":
        obj = cls()
        for k, v in data.items():
            if k == "status":
                obj.status = ProcessingStatus(v)
            elif k == "block_reason" and v:
                obj.block_reason = BlockReason(v)
            elif k == "jump_cause" and v:
                obj.jump_cause = JumpCause(v)
            elif k == "attachments":
                obj.attachments = [AlertAttachment.from_dict(a) for a in v]
            elif k == "manual_notes":
                obj.manual_notes = [ManualNote.from_dict(n) for n in v]
            elif k == "history":
                obj.history = [HistoryChange.from_dict(h) for h in v]
            elif k in cls.__dataclass_fields__:
                setattr(obj, k, v)
        return obj

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=indent)
