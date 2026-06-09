from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Optional


class ProjectionType(str, Enum):
    ORTHOGRAPHIC = "orthographic"
    PERSPECTIVE = "perspective"
    OBLIQUE = "oblique"


class MaterialStatus(str, Enum):
    RAW = "raw"
    LOADED = "loaded"
    PARTIAL = "partial"
    REVIEWED = "reviewed"
    REJECTED = "rejected"


class Severity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class ReviewDecision(str, Enum):
    ACCEPT = "accept"
    REVISE = "revise"
    ESCALATE = "escalate"
    DEFER = "defer"


@dataclass
class ProjectionParams:
    projection_type: ProjectionType = ProjectionType.ORTHOGRAPHIC
    focal_length: Optional[float] = None
    view_angle_deg: float = 0.0
    scale_factor: float = 1.0
    origin_x: float = 0.0
    origin_y: float = 0.0
    tolerance_px: float = 2.0
    source_file: Optional[str] = None
    last_maintained_by: Optional[str] = None
    maintained_at: Optional[datetime] = None
    notes: list[str] = field(default_factory=list)

    def validate(self) -> list[str]:
        problems: list[str] = []
        if self.projection_type == ProjectionType.PERSPECTIVE and self.focal_length is None:
            problems.append("透视投影需要指定 focal_length")
        if self.scale_factor <= 0:
            problems.append("scale_factor 必须为正数")
        if self.tolerance_px < 0:
            problems.append("tolerance_px 不能为负数")
        return problems


@dataclass
class QuestionItem:
    item_id: str
    content: str
    expected_projection: Optional[tuple[float, float]] = None
    legacy_note: Optional[str] = None
    source_file: Optional[str] = None
    tags: list[str] = field(default_factory=list)
    is_placeholder: bool = False


@dataclass
class ScoreRecord:
    item_id: str
    scorer: str
    projected_point: tuple[float, float]
    score: float
    record_id: str = ""
    scored_at: datetime = field(default_factory=datetime.now)
    source_file: Optional[str] = None
    raw_note: Optional[str] = None

    def __post_init__(self) -> None:
        if not self.record_id:
            self.record_id = uuid.uuid4().hex[:8]


@dataclass
class ChartSnapshot:
    name: str
    points: dict[str, tuple[float, float]] = field(default_factory=dict)
    snapshot_id: str = ""
    captured_at: datetime = field(default_factory=datetime.now)
    source_file: Optional[str] = None
    meta: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.snapshot_id:
            self.snapshot_id = uuid.uuid4().hex[:8]


@dataclass
class MaterialBundle:
    label: str = ""
    params: Optional[ProjectionParams] = None
    questions: list[QuestionItem] = field(default_factory=list)
    scores: list[ScoreRecord] = field(default_factory=list)
    chart_before: Optional[ChartSnapshot] = None
    chart_after: Optional[ChartSnapshot] = None
    bundle_id: str = ""
    loaded_at: datetime = field(default_factory=datetime.now)
    status: MaterialStatus = MaterialStatus.RAW
    load_warnings: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        if not self.bundle_id:
            self.bundle_id = uuid.uuid4().hex[:10]

    def missing_boundary_items(self) -> list[str]:
        boundaries = [q.item_id for q in self.questions if "边界" in (q.legacy_note or "") or "boundary" in " ".join(q.tags).lower()]
        scored = {s.item_id for s in self.scores}
        missing: list[str] = []
        for q in self.questions:
            if q.item_id not in scored and (q.item_id in boundaries or not q.is_placeholder):
                missing.append(q.item_id)
        return missing


@dataclass
class ErrorEntry:
    item_id: str
    expected: Optional[tuple[float, float]]
    actual: tuple[float, float]
    distance_px: float
    within_tolerance: bool
    severity: Severity
    message: str
    entry_id: str = ""
    source_material: Optional[str] = None
    chart_diff_delta: Optional[tuple[float, float]] = None

    def __post_init__(self) -> None:
        if not self.entry_id:
            self.entry_id = uuid.uuid4().hex[:8]


@dataclass
class ConflictEntry:
    constraint_a: str
    constraint_b: str
    item_ids: list[str]
    material_sources: list[str]
    description: str
    conflict_id: str = ""
    severity: Severity = Severity.ERROR

    def __post_init__(self) -> None:
        if not self.conflict_id:
            self.conflict_id = uuid.uuid4().hex[:8]


@dataclass
class ReviewNote:
    author: str
    decision: ReviewDecision
    note_id: str = ""
    target_error_id: Optional[str] = None
    target_conflict_id: Optional[str] = None
    comment: str = ""
    created_at: datetime = field(default_factory=datetime.now)

    def __post_init__(self) -> None:
        if not self.note_id:
            self.note_id = uuid.uuid4().hex[:8]


@dataclass
class ValidationResult:
    bundle: MaterialBundle
    errors: list[ErrorEntry] = field(default_factory=list)
    conflicts: list[ConflictEntry] = field(default_factory=list)
    skipped_items: list[str] = field(default_factory=list)
    boundary_gaps: list[str] = field(default_factory=list)
    computed_at: datetime = field(default_factory=datetime.now)
    notes: list[ReviewNote] = field(default_factory=list)
    chart_comparison: Optional[dict[str, Any]] = None

    @property
    def total_errors(self) -> int:
        return len(self.errors)

    @property
    def out_of_tolerance(self) -> int:
        return sum(1 for e in self.errors if not e.within_tolerance)

    @property
    def has_conflicts(self) -> bool:
        return len(self.conflicts) > 0


@dataclass
class ReviewSession:
    result: Optional[ValidationResult] = None
    session_id: str = ""
    started_at: datetime = field(default_factory=datetime.now)
    current_index: int = 0
    finished: bool = False

    def __post_init__(self) -> None:
        if not self.session_id:
            self.session_id = uuid.uuid4().hex[:8]
