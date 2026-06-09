from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from enum import Enum


class SampleQuality(str, Enum):
    GOOD = "good"
    NOISY = "noisy"
    OUTLIER = "outlier"
    MISSING = "missing"
    CONFLICT = "conflict"


@dataclass
class BoundarySample:
    sample_id: str
    x: float
    y_measured: Optional[float]
    stress_measured: Optional[float] = None
    strain_measured: Optional[float] = None
    temp: Optional[float] = None
    quality: SampleQuality = SampleQuality.GOOD
    notes: str = ""
    source: str = ""


@dataclass
class BoundarySampleSet:
    name: str
    samples: List[BoundarySample] = field(default_factory=list)
    meta: Dict = field(default_factory=dict)

    def at_boundary(self, x: float, tol: float = 1e-6) -> List[BoundarySample]:
        return [s for s in self.samples if abs(s.x - x) <= tol]

    def good_samples(self) -> List[BoundarySample]:
        return [s for s in self.samples if s.quality != SampleQuality.MISSING]

    def missing_boundaries(self, expected_x: List[float], tol: float = 1e-6) -> List[float]:
        present = {s.x for s in self.samples if s.quality != SampleQuality.MISSING}
        return [x for x in expected_x if not any(abs(x - p) <= tol for p in present)]

    @classmethod
    def default(cls) -> "BoundarySampleSet":
        return cls(
            name="群补边界样例_2025W23",
            meta={"collector": "数据分析组", "batch": "B20250605"},
            samples=[
                BoundarySample(
                    sample_id="SP001",
                    x=0.0,
                    y_measured=0.012,
                    stress_measured=12.5,
                    strain_measured=0.0008,
                    temp=24.8,
                    quality=SampleQuality.GOOD,
                    source="引伸计#A3",
                    notes="左端点基准样",
                ),
                BoundarySample(
                    sample_id="SP002",
                    x=2.0,
                    y_measured=3.02,
                    stress_measured=448.3,
                    strain_measured=0.0198,
                    temp=25.1,
                    quality=SampleQuality.CONFLICT,
                    source="引伸计#A3+DIC",
                    notes="S1/S2交界：应力逼近S1上限450但S2下限要求100，约束冲突",
                ),
                BoundarySample(
                    sample_id="SP003",
                    x=2.0,
                    y_measured=2.87,
                    stress_measured=95.2,
                    strain_measured=0.0042,
                    temp=25.0,
                    quality=SampleQuality.CONFLICT,
                    source="DIC离线",
                    notes="同2.0处第二组：应力低于S2下限100，约束冲突且与SP002结果不同",
                ),
                BoundarySample(
                    sample_id="SP004",
                    x=4.9997,
                    y_measured=6.51,
                    stress_measured=518.7,
                    strain_measured=0.0395,
                    temp=25.3,
                    quality=SampleQuality.CONFLICT,
                    source="引伸计#B1",
                    notes="接近S2/S3交界(5.0)但有定位偏差：应变逼近S2上限0.04但S3下限要求0.01，同时应力接近S2上限520，约束冲突",
                ),
                BoundarySample(
                    sample_id="SP005",
                    x=5.0,
                    y_measured=None,
                    stress_measured=None,
                    strain_measured=None,
                    temp=None,
                    quality=SampleQuality.MISSING,
                    source="",
                    notes="5.0处缺失样例（预留缺口）",
                ),
                BoundarySample(
                    sample_id="SP006",
                    x=10.0,
                    y_measured=12.48,
                    stress_measured=592.1,
                    strain_measured=0.058,
                    temp=26.2,
                    quality=SampleQuality.OUTLIER,
                    source="旧材料试件#7",
                    notes="右端点：疑似试件老化混入，读数偏低但仍在物理范围内，典型坏数据",
                ),
                BoundarySample(
                    sample_id="SP007",
                    x=2.0003,
                    y_measured=3.11,
                    stress_measured=462.0,
                    strain_measured=0.0205,
                    temp=24.9,
                    quality=SampleQuality.NOISY,
                    source="引伸计#A3",
                    notes="接近2.0但有定位偏差，应力超S1上限，典型小麻烦坏数据",
                ),
            ],
        )
