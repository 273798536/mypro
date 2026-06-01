import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass, field
from enum import Enum


class ReflectionType(Enum):
    NORMAL = "normal"
    EXCEPTION_NEEDS_CONFIRM = "exception_needs_confirm"
    ERROR = "error"


class ReflectionCause(Enum):
    WAVE_EDGE = "wave_edge"
    SOURCE_OVERLAP = "source_overlap"
    PHASE_ABNORMAL = "phase_abnormal"
    AMPLITUDE_SPIKE = "amplitude_spike"
    UNKNOWN = "unknown"


@dataclass
class ReflectionRecord:
    type: ReflectionType
    cause: ReflectionCause
    location: Tuple[int, int]
    value: float
    threshold: float
    description: str
    confidence: float
    requires_human_check: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.type.value,
            "cause": self.cause.value,
            "location": self.location,
            "value": round(self.value, 4),
            "threshold": round(self.threshold, 4),
            "description": self.description,
            "confidence": round(self.confidence, 2),
            "requires_human_check": self.requires_human_check,
        }


class BoundaryReflection:
    def __init__(
        self,
        amplitude_threshold: float = 2.0,
        edge_margin: int = 5,
        spike_threshold: float = 3.0,
    ):
        self.amplitude_threshold = amplitude_threshold
        self.edge_margin = edge_margin
        self.spike_threshold = spike_threshold

    def detect_reflections(
        self, grid: np.ndarray, sources_info: Optional[List[Dict]] = None
    ) -> List[ReflectionRecord]:
        reflections = []
        reflections.extend(self._detect_edge_reflections(grid))
        reflections.extend(self._detect_amplitude_spikes(grid))

        if sources_info:
            reflections.extend(self._analyze_source_relations(sources_info, grid))

        for ref in reflections:
            ref.requires_human_check = ref.type == ReflectionType.EXCEPTION_NEEDS_CONFIRM

        return reflections

    def _detect_edge_reflections(self, grid: np.ndarray) -> List[ReflectionRecord]:
        reflections = []
        rows, cols = grid.shape
        margin = self.edge_margin

        edge_regions = [
            grid[:margin, :],
            grid[-margin:, :],
            grid[:, :margin],
            grid[:, -margin:],
        ]

        for region_idx, region in enumerate(edge_regions):
            max_val = np.max(np.abs(region))
            if max_val > self.amplitude_threshold * 0.8:
                conf = min(max_val / self.amplitude_threshold, 1.0)

                if max_val > self.amplitude_threshold * 1.5:
                    ref_type = ReflectionType.ERROR
                    desc = f"边界振幅异常偏高，可能模拟错误"
                elif max_val > self.amplitude_threshold:
                    ref_type = ReflectionType.EXCEPTION_NEEDS_CONFIRM
                    desc = f"边界振幅接近阈值，需人工确认是否为预期反射"
                else:
                    ref_type = ReflectionType.NORMAL
                    desc = f"边界正常波动，在预期范围内"

                reflections.append(
                    ReflectionRecord(
                        type=ref_type,
                        cause=ReflectionCause.WAVE_EDGE,
                        location=(0 if region_idx < 2 else margin, 0),
                        value=float(max_val),
                        threshold=self.amplitude_threshold,
                        description=desc,
                        confidence=conf,
                    )
                )

        return reflections

    def _detect_amplitude_spikes(self, grid: np.ndarray) -> List[ReflectionRecord]:
        reflections = []
        mean_val = np.mean(np.abs(grid))
        std_val = np.std(grid)
        threshold = mean_val + self.spike_threshold * std_val

        spike_positions = np.where(np.abs(grid) > threshold)

        for i, (y, x) in enumerate(zip(*spike_positions)):
            if i >= 5:
                break

            val = abs(grid[y, x])
            conf = min(val / threshold, 1.0)

            is_edge = (
                y < self.edge_margin
                or y >= grid.shape[0] - self.edge_margin
                or x < self.edge_margin
                or x >= grid.shape[1] - self.edge_margin
            )

            if is_edge:
                ref_type = ReflectionType.NORMAL
                desc = "边缘区域尖峰，可能是正常边界反射"
            elif val > threshold * 2:
                ref_type = ReflectionType.ERROR
                desc = "振幅尖峰异常，可能存在计算错误"
            else:
                ref_type = ReflectionType.EXCEPTION_NEEDS_CONFIRM
                desc = "中心区域异常振幅，需人工确认是否为预期干涉效果"

            reflections.append(
                ReflectionRecord(
                    type=ref_type,
                    cause=ReflectionCause.AMPLITUDE_SPIKE,
                    location=(int(x), int(y)),
                    value=float(val),
                    threshold=float(threshold),
                    description=desc,
                    confidence=conf,
                )
            )

        return reflections

    def _analyze_source_relations(
        self, sources_info: List[Dict], grid: np.ndarray
    ) -> List[ReflectionRecord]:
        reflections = []

        if len(sources_info) >= 2:
            positions = [(s.get("x", 0), s.get("y", 0)) for s in sources_info]
            for i in range(len(positions)):
                for j in range(i + 1, len(positions)):
                    dist = (
                        (positions[i][0] - positions[j][0]) ** 2
                        + (positions[i][1] - positions[j][1]) ** 2
                    ) ** 0.5
                    if dist < 0.5:
                        reflections.append(
                            ReflectionRecord(
                                type=ReflectionType.EXCEPTION_NEEDS_CONFIRM,
                                cause=ReflectionCause.SOURCE_OVERLAP,
                                location=(
                                    int((positions[i][0] + positions[j][0]) / 2),
                                    int((positions[i][1] + positions[j][1]) / 2),
                                ),
                                value=float(dist),
                                threshold=0.5,
                                description=f"波源{sources_info[i].get('id')}与{sources_info[j].get('id')}距离过近，可能产生异常叠加",
                                confidence=0.9,
                            )
                        )

        return reflections

    def get_reflection_summary(
        self, reflections: List[ReflectionRecord]
    ) -> Dict[str, Any]:
        summary = {
            "total": len(reflections),
            "normal": 0,
            "needs_confirm": 0,
            "error": 0,
            "by_cause": {},
            "needs_human_review": [],
        }

        for ref in reflections:
            if ref.type == ReflectionType.NORMAL:
                summary["normal"] += 1
            elif ref.type == ReflectionType.EXCEPTION_NEEDS_CONFIRM:
                summary["needs_confirm"] += 1
                summary["needs_human_review"].append(ref.to_dict())
            elif ref.type == ReflectionType.ERROR:
                summary["error"] += 1

            cause_key = ref.cause.value
            summary["by_cause"][cause_key] = summary["by_cause"].get(cause_key, 0) + 1

        return summary
