from typing import Optional, Dict, Any
from dataclasses import dataclass, field
from enum import Enum


class WaveSourceStatus(Enum):
    VALID = "valid"
    INCOMPLETE = "incomplete"
    OVERLAPPING = "overlapping"


@dataclass
class WaveSource:
    id: str
    x: float
    y: float
    amplitude: float
    frequency: float
    phase: Optional[float] = None
    remark: Optional[str] = None
    status: WaveSourceStatus = WaveSourceStatus.VALID
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        self._validate_and_infer()

    def _validate_and_infer(self):
        missing_fields = []
        if self.phase is None:
            missing_fields.append("phase")
            self.phase = 0.0

        if missing_fields:
            self.status = WaveSourceStatus.INCOMPLETE
            self.metadata["missing_fields"] = missing_fields

    def is_overlapping_with(self, other: "WaveSource", threshold: float = 0.5) -> bool:
        distance = ((self.x - other.x) ** 2 + (self.y - other.y) ** 2) ** 0.5
        return distance < threshold

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "x": self.x,
            "y": self.y,
            "amplitude": self.amplitude,
            "frequency": self.frequency,
            "phase": self.phase,
            "remark": self.remark,
            "status": self.status.value,
            "metadata": self.metadata,
        }
