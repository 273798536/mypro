from __future__ import annotations

import enum
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional


class VariationType(enum.Enum):
    EXACT = "exact"
    TRANSPOSITION = "transposition"
    RHYTHM_STRETCH = "rhythm_stretch"
    MEASURE_MISALIGN = "measure_misalign"
    TRANSPOSITION_PLUS_MISALIGN = "transposition_plus_misalign"
    RHYTHM_STRETCH_PLUS_MISALIGN = "rhythm_stretch_plus_misalign"
    TRANSPOSITION_PLUS_RHYTHM = "transposition_plus_rhythm"
    NO_MATCH = "no_match"


@dataclass
class Note:
    pitch: int
    onset: float
    duration: float
    velocity: int = 80

    @property
    def offset(self) -> float:
        return self.onset + self.duration


@dataclass
class Motif:
    id: str
    name: str
    notes: list[Note] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)
    missing_fields: list[str] = field(default_factory=list)

    @property
    def pitch_intervals(self) -> list[int]:
        if len(self.notes) < 2:
            return []
        return [
            self.notes[i + 1].pitch - self.notes[i].pitch
            for i in range(len(self.notes) - 1)
        ]

    @property
    def duration_ratios(self) -> list[float]:
        if len(self.notes) < 2:
            return []
        ratios = []
        for i in range(len(self.notes) - 1):
            d_cur = self.notes[i].duration
            d_next = self.notes[i + 1].duration
            if d_cur == 0:
                ratios.append(0.0)
            else:
                ratios.append(round(d_next / d_cur, 3))
        return ratios

    @property
    def onset_positions(self) -> list[float]:
        return [n.onset for n in self.notes]


@dataclass
class MIDIFragment:
    id: str
    source_file: str
    notes: list[Note] = field(default_factory=list)
    remarks: list[str] = field(default_factory=list)
    measure_offset: Optional[int] = None
    imported_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_motif(self, motif_id: str, name: str = "", tags: list[str] | None = None, metadata: dict[str, Any] | None = None) -> Motif:
        missing = []
        if not name:
            missing.append("name")
        if tags is None:
            tags = []
            missing.append("tags")
        if metadata is None:
            metadata = {}
        return Motif(
            id=motif_id,
            name=name or f"fragment_{self.id}",
            notes=list(self.notes),
            tags=tags,
            metadata={**metadata, "source_fragment": self.id, "source_file": self.source_file, "remarks": self.remarks},
            missing_fields=missing,
        )


@dataclass
class Measure:
    index: int
    start_beat: float
    end_beat: float
    time_signature: str = "4/4"
    arrived_late: bool = False


@dataclass
class VariationEvidence:
    variation_type: VariationType
    confidence: float
    detail: str
    transposition_semitones: Optional[int] = None
    stretch_ratio: Optional[float] = None
    misalign_beats: Optional[float] = None
    misalign_measures: Optional[int] = None


@dataclass
class CorrectionSuggestion:
    target: str
    action: str
    detail: str
    priority: str = "medium"

    def to_dict(self) -> dict[str, str]:
        return {
            "target": self.target,
            "action": self.action,
            "detail": self.detail,
            "priority": self.priority,
        }


@dataclass
class AnnotationRecord:
    id: str
    fragment_id: str
    motif_id: str
    variation_type: VariationType
    evidence: VariationEvidence
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    superseded_by: Optional[str] = None
    superseded_at: Optional[str] = None


@dataclass
class AuditEntry:
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    action: str = ""
    target_type: str = ""
    target_id: str = ""
    before: Optional[Any] = None
    after: Optional[Any] = None
    operator: str = "system"
    detail: str = ""


@dataclass
class MatchResult:
    query_motif_id: str
    matched_motif_id: str
    variation_type: VariationType
    evidence: VariationEvidence
    suggestions: list[CorrectionSuggestion] = field(default_factory=list)
    annotation_id: Optional[str] = None
    match_timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class Report:
    query_motif_id: str
    matches: list[MatchResult] = field(default_factory=list)
    audit_trail: list[AuditEntry] = field(default_factory=list)
    generated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    summary: str = ""
