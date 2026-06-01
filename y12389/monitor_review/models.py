from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any


class ProblemType(Enum):
    CHANNEL_MISMATCH = "通道错配"
    SNAPSHOT_MISSING = "快照缺失"
    FEEDBACK_DUPLICATE = "反馈重复"


@dataclass
class TraceRecord:
    source: str
    imported_at: str
    record_id: str = field(default_factory=lambda: uuid.uuid4().hex[:8])

    def to_dict(self) -> dict[str, str]:
        return {
            "record_id": self.record_id,
            "source": self.source,
            "imported_at": self.imported_at,
        }


@dataclass
class Channel:
    ch_number: int
    name: str
    source_type: str
    bus_assignment: str
    phantom_power: bool = False
    gain_db: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "ch_number": self.ch_number,
            "name": self.name,
            "source_type": self.source_type,
            "bus_assignment": self.bus_assignment,
            "phantom_power": self.phantom_power,
            "gain_db": self.gain_db,
        }


@dataclass
class ChannelList:
    channels: list[Channel]
    trace: TraceRecord
    event_name: str = ""
    timestamp: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "event_name": self.event_name,
            "timestamp": self.timestamp,
            "trace": self.trace.to_dict(),
            "channels": [c.to_dict() for c in self.channels],
        }


@dataclass
class MonitorSetting:
    musician: str
    bus: str
    channels: list[int]
    level_db: float = 0.0
    eq_high_hz: float | None = None
    eq_mid_hz: float | None = None
    eq_low_hz: float | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "musician": self.musician,
            "bus": self.bus,
            "channels": self.channels,
            "level_db": self.level_db,
            "eq_high_hz": self.eq_high_hz,
            "eq_mid_hz": self.eq_mid_hz,
            "eq_low_hz": self.eq_low_hz,
        }


@dataclass
class ConsoleSnapshot:
    snapshot_name: str
    monitor_settings: list[MonitorSetting]
    trace: TraceRecord
    timestamp: str = ""
    scene_label: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "snapshot_name": self.snapshot_name,
            "timestamp": self.timestamp,
            "scene_label": self.scene_label,
            "trace": self.trace.to_dict(),
            "monitor_settings": [m.to_dict() for m in self.monitor_settings],
        }


@dataclass
class MusicianFeedback:
    musician: str
    timestamp: str
    issue: str
    channel_ref: int | None = None
    bus_ref: str | None = None
    severity: str = "medium"

    def to_dict(self) -> dict[str, Any]:
        return {
            "musician": self.musician,
            "timestamp": self.timestamp,
            "issue": self.issue,
            "channel_ref": self.channel_ref,
            "bus_ref": self.bus_ref,
            "severity": self.severity,
        }


@dataclass
class ProblemItem:
    problem_type: ProblemType
    description: str
    severity: str = "medium"
    channel_refs: list[int] = field(default_factory=list)
    bus_refs: list[str] = field(default_factory=list)
    snapshot_refs: list[str] = field(default_factory=list)
    musician_refs: list[str] = field(default_factory=list)
    trace_refs: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "problem_type": self.problem_type.value,
            "description": self.description,
            "severity": self.severity,
            "channel_refs": self.channel_refs,
            "bus_refs": self.bus_refs,
            "snapshot_refs": self.snapshot_refs,
            "musician_refs": self.musician_refs,
            "trace_refs": self.trace_refs,
        }


@dataclass
class FaultAttribution:
    root_cause: str
    affected_channels: list[int]
    affected_buses: list[str]
    confidence: str = "medium"
    evidence: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "root_cause": self.root_cause,
            "affected_channels": self.affected_channels,
            "affected_buses": self.affected_buses,
            "confidence": self.confidence,
            "evidence": self.evidence,
        }


@dataclass
class TimeAlignment:
    event_time: str
    snapshot_time: str | None
    feedback_time: str | None
    offset_seconds: float | None = None
    aligned: bool = False
    note: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "event_time": self.event_time,
            "snapshot_time": self.snapshot_time,
            "feedback_time": self.feedback_time,
            "offset_seconds": self.offset_seconds,
            "aligned": self.aligned,
            "note": self.note,
        }


@dataclass
class CorrectionSuggestion:
    target: str
    action: str
    priority: str = "medium"
    rationale: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "target": self.target,
            "action": self.action,
            "priority": self.priority,
            "rationale": self.rationale,
        }


@dataclass
class CorrespondenceEntry:
    channel_list_trace_id: str
    snapshot_trace_id: str
    report_trace_id: str
    channel_numbers: list[int]
    bus_names: list[str]
    note: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "channel_list_trace_id": self.channel_list_trace_id,
            "snapshot_trace_id": self.snapshot_trace_id,
            "report_trace_id": self.report_trace_id,
            "channel_numbers": self.channel_numbers,
            "bus_names": self.bus_names,
            "note": self.note,
        }


@dataclass
class ReviewReport:
    event_name: str
    problems: list[ProblemItem]
    attributions: list[FaultAttribution]
    time_alignments: list[TimeAlignment]
    corrections: list[CorrectionSuggestion]
    trace: TraceRecord
    correspondences: list[CorrespondenceEntry] = field(default_factory=list)
    channel_list_trace_id: str = ""
    snapshot_trace_id: str = ""
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> dict[str, Any]:
        return {
            "event_name": self.event_name,
            "created_at": self.created_at,
            "trace": self.trace.to_dict(),
            "channel_list_trace_id": self.channel_list_trace_id,
            "snapshot_trace_id": self.snapshot_trace_id,
            "problems": [p.to_dict() for p in self.problems],
            "attributions": [a.to_dict() for a in self.attributions],
            "time_alignments": [t.to_dict() for t in self.time_alignments],
            "corrections": [c.to_dict() for c in self.corrections],
            "correspondences": [c.to_dict() for c in self.correspondences],
        }
