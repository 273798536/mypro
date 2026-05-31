from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class ErrorType(Enum):
    OFF_BEAT = "off_beat"
    REST_MISJUDGMENT = "rest_misjudgment"
    VELOCITY_MISSING = "velocity_missing"
    TEMPO_DEVIATION = "tempo_deviation"
    DURATION_ERROR = "duration_error"
    NONE = "none"


class Severity(Enum):
    NORMAL = "normal"
    BOUNDARY = "boundary"
    BAD = "bad"


class BadRowReason(Enum):
    EMPTY_LINE = "empty_line"
    COMMENT_LINE = "comment_line"
    MISSING_COLUMN = "missing_column"
    INVALID_VELOCITY = "invalid_velocity"
    INVALID_PITCH = "invalid_pitch"
    PARSE_FAILURE = "parse_failure"


@dataclass
class TraceStep:
    stage: str
    description: str
    timestamp: str
    details: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "stage": self.stage,
            "description": self.description,
            "timestamp": self.timestamp,
            "details": self.details,
        }


@dataclass
class TraceRecord:
    trace_id: str
    steps: List[TraceStep] = field(default_factory=list)

    def add_step(self, stage: str, description: str, timestamp: str, **details: Any) -> None:
        self.steps.append(TraceStep(stage=stage, description=description, timestamp=timestamp, details=details))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "trace_id": self.trace_id,
            "steps": [s.to_dict() for s in self.steps],
        }


@dataclass
class NoteEvent:
    pitch: int
    velocity: int
    start_tick: int
    duration_tick: int
    channel: int
    track_idx: int
    trace_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])

    def to_dict(self) -> Dict[str, Any]:
        return {
            "pitch": self.pitch,
            "velocity": self.velocity,
            "start_tick": self.start_tick,
            "duration_tick": self.duration_tick,
            "channel": self.channel,
            "track_idx": self.track_idx,
            "trace_id": self.trace_id,
        }


@dataclass
class TempoChange:
    tick: int
    bpm: float
    trace_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])

    def to_dict(self) -> Dict[str, Any]:
        return {"tick": self.tick, "bpm": self.bpm, "trace_id": self.trace_id}


@dataclass
class ParsedMidi:
    notes: List[NoteEvent]
    tempo_changes: List[TempoChange]
    ticks_per_beat: int
    tracks_count: int
    file_path: str
    trace: TraceRecord = field(default_factory=lambda: TraceRecord(trace_id=str(uuid.uuid4())[:8]))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "notes": [n.to_dict() for n in self.notes],
            "tempo_changes": [t.to_dict() for t in self.tempo_changes],
            "ticks_per_beat": self.ticks_per_beat,
            "tracks_count": self.tracks_count,
            "file_path": self.file_path,
            "trace": self.trace.to_dict(),
        }


@dataclass
class AlignedNote:
    note: NoteEvent
    expected_beat: float
    actual_beat: float
    offset_beats: float
    tempo_segment_idx: int
    is_in_tempo_change: bool
    trace_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    parse_trace_id: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "note": self.note.to_dict(),
            "expected_beat": self.expected_beat,
            "actual_beat": self.actual_beat,
            "offset_beats": self.offset_beats,
            "tempo_segment_idx": self.tempo_segment_idx,
            "is_in_tempo_change": self.is_in_tempo_change,
            "trace_id": self.trace_id,
            "parse_trace_id": self.parse_trace_id,
        }


@dataclass
class BeatAlignmentResult:
    aligned_notes: List[AlignedNote]
    tempo_segments: List[TempoSegment]
    trace: TraceRecord = field(default_factory=lambda: TraceRecord(trace_id=str(uuid.uuid4())[:8]))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "aligned_notes": [n.to_dict() for n in self.aligned_notes],
            "tempo_segments": [s.to_dict() for s in self.tempo_segments],
            "trace": self.trace.to_dict(),
        }


@dataclass
class TempoSegment:
    idx: int
    start_tick: int
    end_tick: int
    bpm: float
    is_change_region: bool
    trace_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])

    def to_dict(self) -> Dict[str, Any]:
        return {
            "idx": self.idx,
            "start_tick": self.start_tick,
            "end_tick": self.end_tick,
            "bpm": self.bpm,
            "is_change_region": self.is_change_region,
            "trace_id": self.trace_id,
        }


@dataclass
class ErrorAnnotation:
    aligned_note: AlignedNote
    error_type: ErrorType
    severity: Severity
    detail: str
    trace_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    parse_trace_id: str = ""
    align_trace_id: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "aligned_note": self.aligned_note.to_dict(),
            "error_type": self.error_type.value,
            "severity": self.severity.value,
            "detail": self.detail,
            "trace_id": self.trace_id,
            "parse_trace_id": self.parse_trace_id,
            "align_trace_id": self.align_trace_id,
        }


@dataclass
class ErrorAnnotationResult:
    annotations: List[ErrorAnnotation]
    trace: TraceRecord = field(default_factory=lambda: TraceRecord(trace_id=str(uuid.uuid4())[:8]))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "annotations": [a.to_dict() for a in self.annotations],
            "trace": self.trace.to_dict(),
        }


@dataclass
class BadRow:
    raw_line: str
    line_number: int
    reason: BadRowReason
    detail: str
    source: str
    trace_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])

    def to_dict(self) -> Dict[str, Any]:
        return {
            "raw_line": self.raw_line,
            "line_number": self.line_number,
            "reason": self.reason.value,
            "detail": self.detail,
            "source": self.source,
            "trace_id": self.trace_id,
        }


@dataclass
class CleanedData:
    valid_rows: List[Dict[str, Any]]
    bad_rows: List[BadRow]
    source: str
    trace: TraceRecord = field(default_factory=lambda: TraceRecord(trace_id=str(uuid.uuid4())[:8]))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "valid_rows": self.valid_rows,
            "bad_rows": [b.to_dict() for b in self.bad_rows],
            "source": self.source,
            "trace": self.trace.to_dict(),
        }


@dataclass
class ClassificationResult:
    normal: List[ErrorAnnotation]
    boundary: List[ErrorAnnotation]
    bad: List[ErrorAnnotation]
    tempo_change_notes: List[ErrorAnnotation]
    bad_rows: List[BadRow]
    trace: TraceRecord = field(default_factory=lambda: TraceRecord(trace_id=str(uuid.uuid4())[:8]))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "normal": [a.to_dict() for a in self.normal],
            "boundary": [a.to_dict() for a in self.boundary],
            "bad": [a.to_dict() for a in self.bad],
            "tempo_change_notes": [a.to_dict() for a in self.tempo_change_notes],
            "bad_rows": [b.to_dict() for b in self.bad_rows],
            "trace": self.trace.to_dict(),
        }

    @property
    def summary(self) -> Dict[str, int]:
        return {
            "normal_count": len(self.normal),
            "boundary_count": len(self.boundary),
            "bad_count": len(self.bad),
            "tempo_change_count": len(self.tempo_change_notes),
            "bad_rows_count": len(self.bad_rows),
        }


@dataclass
class PipelineResult:
    parsed: ParsedMidi
    alignment: BeatAlignmentResult
    annotations: ErrorAnnotationResult
    classification: ClassificationResult
    cleaned_data: Optional[CleanedData]
    trace: TraceRecord = field(default_factory=lambda: TraceRecord(trace_id=str(uuid.uuid4())[:8]))

    def to_dict(self) -> Dict[str, Any]:
        result = {
            "parsed": self.parsed.to_dict(),
            "alignment": self.alignment.to_dict(),
            "annotations": self.annotations.to_dict(),
            "classification": self.classification.to_dict(),
            "trace": self.trace.to_dict(),
        }
        if self.cleaned_data is not None:
            result["cleaned_data"] = self.cleaned_data.to_dict()
        return result

    def trace_for(self, annotation: ErrorAnnotation) -> Dict[str, Any]:
        return {
            "annotation_trace_id": annotation.trace_id,
            "parse_trace_id": annotation.parse_trace_id,
            "align_trace_id": annotation.align_trace_id,
            "note_trace_id": annotation.aligned_note.note.trace_id,
            "parse_file": self.parsed.file_path,
            "tempo_segment": annotation.aligned_note.tempo_segment_idx,
            "pipeline_trace_id": self.trace.trace_id,
        }
