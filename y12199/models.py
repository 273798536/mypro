from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Set
from datetime import datetime
import uuid


class SegmentType(Enum):
    DIALOGUE = "dialogue"
    AD = "ad"
    SILENT = "silent"
    MUSIC = "music"
    EFFECTS = "effects"


class FindingType(Enum):
    LOUDNESS_EXCEEDANCE = "loudness_exceedance"
    AD_MARKER_OMISSION = "ad_marker_omission"
    SILENT_MISJUDGMENT = "silent_misjudgment"


class Severity(Enum):
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"


class CorrectionAction(Enum):
    FLAGGED = "flagged"
    CORRECTED = "corrected"
    SUPERSEDED = "superseded"
    REOPENED = "reopened"


class ReportPhase(Enum):
    FIRST_IMPORT = "first_import"
    SECOND_IMPORT = "second_import"


def _gen_id() -> str:
    return uuid.uuid4().hex[:12]


@dataclass
class DialogueSegment:
    segment_id: str
    track_id: str
    start_time: float
    end_time: float
    loudness_lufs: float
    segment_type: SegmentType
    has_ad_marker: bool = False
    is_silent: bool = False
    annotation_version: int = 1

    def update_annotation(self, **kwargs) -> "DialogueSegment":
        new_seg = DialogueSegment(
            segment_id=self.segment_id,
            track_id=self.track_id,
            start_time=kwargs.get("start_time", self.start_time),
            end_time=kwargs.get("end_time", self.end_time),
            loudness_lufs=kwargs.get("loudness_lufs", self.loudness_lufs),
            segment_type=kwargs.get("segment_type", self.segment_type),
            has_ad_marker=kwargs.get("has_ad_marker", self.has_ad_marker),
            is_silent=kwargs.get("is_silent", self.is_silent),
            annotation_version=self.annotation_version + 1,
        )
        return new_seg


@dataclass
class AudioTrack:
    track_id: str
    name: str
    sample_rate: int
    segments: List[DialogueSegment] = field(default_factory=list)

    def add_segment(self, segment: DialogueSegment) -> None:
        self.segments.append(segment)


@dataclass
class PlatformSpec:
    spec_id: str
    platform_name: str
    max_dialogue_loudness_lufs: float = -24.0
    max_ad_loudness_lufs: float = -24.0
    require_ad_markers: bool = True
    silent_threshold_lufs: float = -70.0
    min_silent_duration_s: float = 0.5


@dataclass
class ComplianceFinding:
    finding_id: str
    segment_id: str
    track_id: str
    finding_type: FindingType
    severity: Severity
    measured_value: float
    allowed_value: float
    description: str
    affected_by_spec_ids: Set[str] = field(default_factory=set)
    is_resolved: bool = False
    resolution_note: str = ""

    def resolve(self, note: str = "") -> None:
        self.is_resolved = True
        self.resolution_note = note

    def reopen(self, note: str = "") -> None:
        self.is_resolved = False
        self.resolution_note = note


@dataclass
class CorrectionRecord:
    record_id: str
    finding_id: str
    segment_id: str
    action: CorrectionAction
    timestamp: str
    details: str
    annotation_version_before: int
    annotation_version_after: int


@dataclass
class ComplianceReportSummary:
    total_findings: int = 0
    critical_count: int = 0
    warning_count: int = 0
    info_count: int = 0
    loudness_exceedance_count: int = 0
    ad_marker_omission_count: int = 0
    silent_misjudgment_count: int = 0
    overall_pass: bool = True


@dataclass
class ComplianceReport:
    report_id: str
    phase: ReportPhase
    findings: List[ComplianceFinding]
    summary: ComplianceReportSummary
    spec_snapshot: List[PlatformSpec]
    changes_from_previous: List[str] = field(default_factory=list)
    spec_impact_map: Dict[str, List[str]] = field(default_factory=dict)
