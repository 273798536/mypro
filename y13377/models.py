from __future__ import annotations

import copy
import hashlib
import json
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple


class NoteSource(Enum):
    BACKFILLED = "backfilled"
    VERBAL = "verbal"
    SYSTEM = "system"


class MaterialType(Enum):
    SAMPLE = "sample"
    FEATURE_SNAPSHOT = "feature_snapshot"
    THRESHOLD = "threshold"
    MANUAL_CORRECTION = "manual_correction"
    NOTE = "note"
    METRIC = "metric"


class InfluenceLevel(Enum):
    DIRECT = "direct"
    INDIRECT = "indirect"
    NONE = "none"


@dataclass
class SampleRecord:
    sample_id: str
    features: Dict[str, Any]
    label: Optional[int] = None
    score: Optional[float] = None
    raw_row_index: Optional[int] = None
    source_file: Optional[str] = None
    is_bad_data: bool = False
    bad_data_reason: Optional[str] = None
    version_tag: str = ""
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())

    def fingerprint(self) -> str:
        payload = json.dumps(
            {"sample_id": self.sample_id, "features": self.features},
            sort_keys=True,
            ensure_ascii=False,
        )
        return hashlib.md5(payload.encode()).hexdigest()


@dataclass
class VersionSnapshot:
    version_id: str
    alias: Optional[str] = None
    resolved_version_id: Optional[str] = None
    feature_snapshot: Dict[str, Any] = field(default_factory=dict)
    thresholds: Dict[str, float] = field(default_factory=dict)
    parent_version_id: Optional[str] = None
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    is_legacy: bool = False

    def resolve(self, registry: Dict[str, "VersionSnapshot"]) -> "VersionSnapshot":
        if self.alias and self.alias in registry:
            resolved = registry[self.alias]
            self.resolved_version_id = resolved.version_id
            return resolved
        if self.resolved_version_id and self.resolved_version_id in registry:
            return registry[self.resolved_version_id]
        return self


@dataclass
class ManualCorrection:
    correction_id: str
    sample_id: str
    original_label: Optional[int]
    corrected_label: int
    operator: str
    reason: str
    version_tag: str = ""
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    source: NoteSource = NoteSource.SYSTEM


@dataclass
class NoteEntry:
    note_id: str
    content: str
    source: NoteSource
    related_sample_ids: List[str] = field(default_factory=list)
    version_tag: str = ""
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    influence: InfluenceLevel = InfluenceLevel.NONE


@dataclass
class TimelineEntry:
    entry_id: str
    material_type: MaterialType
    timestamp: str
    version_tag: str
    payload: Dict[str, Any] = field(default_factory=dict)
    influence_on_conclusion: InfluenceLevel = InfluenceLevel.NONE
    source_description: str = ""


@dataclass
class AnomalyResult:
    sample_id: str
    is_anomaly: bool
    anomaly_score: float
    threshold_used: float
    threshold_version: str
    feature_snapshot_version: str
    manual_corrections_applied: List[str] = field(default_factory=list)
    notes_applied: List[str] = field(default_factory=list)
    timeline: List[TimelineEntry] = field(default_factory=list)
    bad_data_flag: bool = False
    bad_data_detail: Optional[str] = None
    original_row_ref: Optional[str] = None
    object_ref: Optional[str] = None


@dataclass
class VersionDiff:
    dimension: str
    old_value: Any
    new_value: Any
    version_old: str
    version_new: str
    changed: bool


@dataclass
class ReplayReport:
    run_id: str
    version_tag: str
    results: List[AnomalyResult] = field(default_factory=list)
    version_diffs: List[VersionDiff] = field(default_factory=list)
    material_entry_summary: str = ""
    anomaly_exit_summary: str = ""
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
