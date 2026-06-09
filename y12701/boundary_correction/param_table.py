from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


@dataclass
class SegmentParams:
    seg_id: str
    x_range: Tuple[float, float]
    coeffs: Dict[str, float]
    constraints: Dict[str, Tuple[float, float]] = field(default_factory=dict)
    continuity: Optional[str] = None


@dataclass
class ParameterTable:
    material: str
    segments: List[SegmentParams] = field(default_factory=list)
    meta: Dict = field(default_factory=dict)

    def get_segment_at(self, x: float) -> Optional[SegmentParams]:
        for seg in self.segments:
            lo, hi = seg.x_range
            if lo <= x <= hi:
                return seg
        return None

    def boundary_points(self) -> List[float]:
        pts = set()
        for seg in self.segments:
            lo, hi = seg.x_range
            pts.add(lo)
            pts.add(hi)
        return sorted(pts)

    @classmethod
    def default(cls) -> "ParameterTable":
        return cls(
            material="TC4钛合金",
            meta={"source": "旧参数表_v2025Q1", "ref_temp": 25.0},
            segments=[
                SegmentParams(
                    seg_id="S1",
                    x_range=(0.0, 2.0),
                    coeffs={"a": 1.0, "b": 0.5, "c": 0.0},
                    constraints={"stress": (0.0, 450.0), "strain": (0.0, 0.02)},
                    continuity="C0",
                ),
                SegmentParams(
                    seg_id="S2",
                    x_range=(2.0, 5.0),
                    coeffs={"a": 0.8, "b": 1.2, "c": -0.6},
                    constraints={"stress": (100.0, 520.0), "strain": (0.005, 0.04)},
                    continuity="C0",
                ),
                SegmentParams(
                    seg_id="S3",
                    x_range=(5.0, 10.0),
                    coeffs={"a": 0.5, "b": 2.0, "c": -2.5},
                    constraints={"stress": (200.0, 600.0), "strain": (0.01, 0.06)},
                    continuity="C0",
                ),
            ],
        )
