import json
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from typing import Optional


class SampleClassification(Enum):
    NORMAL = "normal"
    BOUNDARY = "boundary"
    BAD = "bad"


class MatchResult(Enum):
    MATCH = "match"
    MISMATCH = "mismatch"
    UNCERTAIN = "uncertain"


class ConflictType(Enum):
    CHORD_CONFLICT = "chord_conflict"
    BAR_MISALIGNMENT = "bar_misalignment"
    MISSED_MODULATION = "missed_modulation"


class Severity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class VersionSource(Enum):
    TEACHER_ANNOTATION = "teacher_annotation"
    AI_ANALYSIS = "ai_analysis"
    MANUAL_CORRECTION = "manual_correction"
    SYSTEM_AUTO = "system_auto"


@dataclass
class ChordAnalysis:
    bar_start: int
    bar_end: int
    expected_chord: str
    actual_chord: str
    match_result: MatchResult = MatchResult.UNCERTAIN
    chroma_vector: list = field(default_factory=list)
    confidence: float = 0.0
    note: str = ""

    def to_dict(self):
        d = asdict(self)
        d["match_result"] = self.match_result.value
        return d

    @classmethod
    def from_dict(cls, data: dict):
        data = dict(data)
        data["match_result"] = MatchResult(data["match_result"])
        return cls(**data)


@dataclass
class VersionRecord:
    version_id: str = field(default_factory=lambda: uuid.uuid4().hex[:8])
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    source: VersionSource = VersionSource.AI_ANALYSIS
    chord_conclusion: str = ""
    content: str = ""
    previous_version_id: Optional[str] = None
    is_latest: bool = True

    def to_dict(self):
        d = asdict(self)
        d["source"] = self.source.value
        return d

    @classmethod
    def from_dict(cls, data: dict):
        data = dict(data)
        data["source"] = VersionSource(data["source"])
        return cls(**data)


@dataclass
class ConflictRecord:
    conflict_type: ConflictType
    description: str
    severity: Severity = Severity.MEDIUM
    evidence_version_ids: list = field(default_factory=list)
    related_bar_range: tuple = (0, 0)
    resolution: str = ""
    resolved: bool = False

    def to_dict(self):
        d = asdict(self)
        d["conflict_type"] = self.conflict_type.value
        d["severity"] = self.severity.value
        return d

    @classmethod
    def from_dict(cls, data: dict):
        data = dict(data)
        data["conflict_type"] = ConflictType(data["conflict_type"])
        data["severity"] = Severity(data["severity"])
        return cls(**data)


@dataclass
class Sample:
    sample_id: str = field(default_factory=lambda: uuid.uuid4().hex[:8])
    melody_midi_path: str = ""
    classification: SampleClassification = SampleClassification.NORMAL
    chord_analyses: list = field(default_factory=list)
    version_records: list = field(default_factory=list)
    conflicts: list = field(default_factory=list)
    conclusion_consistent: bool = True
    meta: dict = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self):
        return {
            "sample_id": self.sample_id,
            "melody_midi_path": self.melody_midi_path,
            "classification": self.classification.value,
            "chord_analyses": [a.to_dict() for a in self.chord_analyses],
            "version_records": [v.to_dict() for v in self.version_records],
            "conflicts": [c.to_dict() for c in self.conflicts],
            "conclusion_consistent": self.conclusion_consistent,
            "meta": self.meta,
            "created_at": self.created_at,
        }

    @classmethod
    def from_dict(cls, data: dict):
        obj = cls(
            sample_id=data.get("sample_id", uuid.uuid4().hex[:8]),
            melody_midi_path=data.get("melody_midi_path", ""),
            classification=SampleClassification(data.get("classification", "normal")),
            conclusion_consistent=data.get("conclusion_consistent", True),
            meta=data.get("meta", {}),
            created_at=data.get("created_at", datetime.now().isoformat()),
        )
        obj.chord_analyses = [
            ChordAnalysis.from_dict(a) for a in data.get("chord_analyses", [])
        ]
        obj.version_records = [
            VersionRecord.from_dict(v) for v in data.get("version_records", [])
        ]
        obj.conflicts = [
            ConflictRecord.from_dict(c) for c in data.get("conflicts", [])
        ]
        return obj

    def add_version(self, version: VersionRecord):
        for v in self.version_records:
            if v.is_latest:
                v.is_latest = False
                version.previous_version_id = v.version_id
                break
        self.version_records.append(version)

    def get_latest_version(self) -> Optional[VersionRecord]:
        for v in reversed(self.version_records):
            if v.is_latest:
                return v
        return self.version_records[-1] if self.version_records else None

    def get_version_chain(self) -> list:
        if not self.version_records:
            return []
        id_map = {v.version_id: v for v in self.version_records}
        latest = self.get_latest_version()
        chain = []
        current = latest
        visited = set()
        while current and current.version_id not in visited:
            chain.append(current)
            visited.add(current.version_id)
            prev_id = current.previous_version_id
            current = id_map.get(prev_id) if prev_id else None
        return chain
