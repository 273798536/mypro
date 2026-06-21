from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class DataQuality(str, Enum):
    CLEAN = "clean"
    MISSING = "missing"
    OUTLIER = "outlier"
    LATE = "late"
    INVALID = "invalid"


@dataclass
class FeatureSource:
    original_row: int
    original_file: str
    raw_value: Any
    column_name: str
    source_task: str = ""

    def to_dict(self) -> dict:
        return {
            "original_row": self.original_row,
            "original_file": self.original_file,
            "raw_value": self.raw_value,
            "column_name": self.column_name,
            "source_task": self.source_task,
        }


@dataclass
class FeatureRecord:
    feature_name: str
    value: Any
    unit: str
    formula: str
    boundary_low: float | None = None
    boundary_high: float | None = None
    quality: DataQuality = DataQuality.CLEAN
    source: FeatureSource | None = None
    late_reason: str = ""
    screenshot_note: str = ""

    @property
    def is_in_boundary(self) -> bool | None:
        if self.boundary_low is None and self.boundary_high is None:
            return None
        try:
            v = float(self.value)
        except (TypeError, ValueError):
            return None
        low_ok = self.boundary_low is None or v >= self.boundary_low
        high_ok = self.boundary_high is None or v <= self.boundary_high
        return low_ok and high_ok

    def to_dict(self) -> dict:
        return {
            "feature_name": self.feature_name,
            "value": self.value,
            "unit": self.unit,
            "formula": self.formula,
            "boundary_low": self.boundary_low,
            "boundary_high": self.boundary_high,
            "quality": self.quality.value,
            "source": self.source.to_dict() if self.source else None,
            "late_reason": self.late_reason,
            "screenshot_note": self.screenshot_note,
            "is_in_boundary": self.is_in_boundary,
        }


@dataclass
class SkewedSample:
    sample_id: str
    feature_name: str
    sample_value: Any
    expected_range: str
    contribution_score: float
    source: FeatureSource | None = None

    def to_dict(self) -> dict:
        return {
            "sample_id": self.sample_id,
            "feature_name": self.feature_name,
            "sample_value": self.sample_value,
            "expected_range": self.expected_range,
            "contribution_score": self.contribution_score,
            "source": self.source.to_dict() if self.source else None,
        }


@dataclass
class BadDataPointer:
    original_row: int
    original_file: str
    column_name: str
    raw_value: Any
    issue: str
    feature_name: str

    def to_dict(self) -> dict:
        return {
            "original_row": self.original_row,
            "original_file": self.original_file,
            "column_name": self.column_name,
            "raw_value": self.raw_value,
            "issue": self.issue,
            "feature_name": self.feature_name,
        }


@dataclass
class VersionSnapshot:
    version: str
    client_name: str
    snapshot_time: str
    features: list[FeatureRecord] = field(default_factory=list)
    skewed_samples: list[SkewedSample] = field(default_factory=list)
    bad_data_pointers: list[BadDataPointer] = field(default_factory=list)
    summary_note: str = ""

    @property
    def total_features(self) -> int:
        return len(self.features)

    @property
    def clean_count(self) -> int:
        return sum(1 for f in self.features if f.quality == DataQuality.CLEAN)

    @property
    def dirty_count(self) -> int:
        return self.total_features - self.clean_count

    @property
    def out_of_boundary_count(self) -> int:
        return sum(1 for f in self.features if f.is_in_boundary is False)

    def to_dict(self) -> dict:
        return {
            "version": self.version,
            "client_name": self.client_name,
            "snapshot_time": self.snapshot_time,
            "features": [f.to_dict() for f in self.features],
            "skewed_samples": [s.to_dict() for s in self.skewed_samples],
            "bad_data_pointers": [b.to_dict() for b in self.bad_data_pointers],
            "summary_note": self.summary_note,
            "total_features": self.total_features,
            "clean_count": self.clean_count,
            "dirty_count": self.dirty_count,
            "out_of_boundary_count": self.out_of_boundary_count,
        }
