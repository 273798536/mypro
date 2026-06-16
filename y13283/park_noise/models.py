from __future__ import annotations

import csv
import json
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import List, Optional, Dict, Any


class PointStatus(str, Enum):
    PENDING = "待处理"
    IN_PROGRESS = "处理中"
    DONE = "已处理"
    NEEDS_EVIDENCE = "待补证据"
    SUPERSEDED = "已被取代"


@dataclass
class SourceTrace:
    source_file: str
    source_row: int
    source_note: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "SourceTrace":
        return cls(**d)


@dataclass
class FeedbackRecord:
    feedback_id: str
    point_id: str
    original_text: str
    merged_text: str
    source: str
    feedback_time: str
    version: int = 1

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "FeedbackRecord":
        return cls(**d)


@dataclass
class NoisePoint:
    point_id: str
    name: str
    gis_x: float
    gis_y: float
    noise_level: float
    standard_limit: float
    impact_range: float
    scheme_id: str
    source: SourceTrace
    status: PointStatus = PointStatus.PENDING
    version: int = 1
    superseded_by: Optional[str] = None
    anomalies: List[str] = field(default_factory=list)
    evidence_notes: str = ""
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def is_over_limit(self) -> bool:
        return self.noise_level > self.standard_limit

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["status"] = self.status.value
        d["source"] = self.source.to_dict()
        return d

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "NoisePoint":
        source = SourceTrace.from_dict(d.pop("source"))
        status = PointStatus(d.pop("status"))
        return cls(source=source, status=status, **d)


@dataclass
class NoiseScheme:
    scheme_id: str
    name: str
    description: str
    barrier_type: str
    estimated_cost: float
    noise_reduction_db: float
    coverage_points: List[str] = field(default_factory=list)
    version: int = 1

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "NoiseScheme":
        return cls(**d)


class DataStore:
    def __init__(self, data_dir: str = "data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.points_file = self.data_dir / "points.json"
        self.schemes_file = self.data_dir / "schemes.json"
        self.feedbacks_file = self.data_dir / "feedbacks.json"

    def save_points(self, points: List[NoisePoint]) -> None:
        with open(self.points_file, "w", encoding="utf-8") as f:
            json.dump([p.to_dict() for p in points], f, ensure_ascii=False, indent=2)

    def load_points(self) -> List[NoisePoint]:
        if not self.points_file.exists():
            return []
        with open(self.points_file, "r", encoding="utf-8") as f:
            return [NoisePoint.from_dict(d) for d in json.load(f)]

    def save_schemes(self, schemes: List[NoiseScheme]) -> None:
        with open(self.schemes_file, "w", encoding="utf-8") as f:
            json.dump([s.to_dict() for s in schemes], f, ensure_ascii=False, indent=2)

    def load_schemes(self) -> List[NoiseScheme]:
        if not self.schemes_file.exists():
            return []
        with open(self.schemes_file, "r", encoding="utf-8") as f:
            return [NoiseScheme.from_dict(d) for d in json.load(f)]

    def save_feedbacks(self, feedbacks: List[FeedbackRecord]) -> None:
        with open(self.feedbacks_file, "w", encoding="utf-8") as f:
            json.dump([fb.to_dict() for fb in feedbacks], f, ensure_ascii=False, indent=2)

    def load_feedbacks(self) -> List[FeedbackRecord]:
        if not self.feedbacks_file.exists():
            return []
        with open(self.feedbacks_file, "r", encoding="utf-8") as f:
            return [FeedbackRecord.from_dict(d) for d in json.load(f)]


def generate_id(prefix: str = "p") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def import_points_from_csv(csv_path: str, source_file: str) -> List[NoisePoint]:
    points: List[NoisePoint] = []
    with open(csv_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row_idx, row in enumerate(reader, start=2):
            name = row.get("点位名称", "").strip()
            if not name:
                continue
            try:
                point = NoisePoint(
                    point_id=row.get("点位ID", generate_id("pt")),
                    name=name,
                    gis_x=float(row.get("X坐标", 0)),
                    gis_y=float(row.get("Y坐标", 0)),
                    noise_level=float(row.get("噪声值dB", 0)),
                    standard_limit=float(row.get("标准限值dB", 60)),
                    impact_range=float(row.get("影响范围m", 0)),
                    scheme_id=row.get("方案ID", ""),
                    source=SourceTrace(
                        source_file=source_file,
                        source_row=row_idx,
                        source_note=row.get("备注", ""),
                    ),
                    status=PointStatus(row.get("状态", PointStatus.PENDING.value)),
                    evidence_notes=row.get("证据说明", ""),
                )
                points.append(point)
            except (ValueError, KeyError) as e:
                print(f"[WARN] 跳过第{row_idx}行 {name}: {e}")
    return points
