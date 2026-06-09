from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import List, Optional, Tuple, Dict, Any
import uuid


class AnomalyType(Enum):
    UNIT_MISSING = "unit_missing"
    COORDINATE_INVALID = "coordinate_invalid"
    POINT_INSUFFICIENT = "point_insufficient"
    PARAMETER_OUTDATED = "parameter_outdated"
    CONSTRAINT_CONFLICT = "constraint_conflict"


class AnomalyAction(Enum):
    SUPPLEMENT_MATERIAL = "supplement_material"
    ADJUST_CALIBER = "adjust_caliber"
    REVIEW_DATA = "review_data"
    WAIT_PARAMETER = "wait_parameter"


ANOMALY_GUIDANCE = {
    AnomalyType.UNIT_MISSING: {
        "action": AnomalyAction.SUPPLEMENT_MATERIAL,
        "description": "单位字段缺失",
        "next_step": "请补充该记录的测量单位（如：米、厘米、像素）",
        "blocking": True
    },
    AnomalyType.COORDINATE_INVALID: {
        "action": AnomalyAction.REVIEW_DATA,
        "description": "坐标值无效（非数值）",
        "next_step": "请核对原始数据，修正坐标值或确认导入格式",
        "blocking": True
    },
    AnomalyType.POINT_INSUFFICIENT: {
        "action": AnomalyAction.SUPPLEMENT_MATERIAL,
        "description": "点数不足以构成凸包（<3个有效点）",
        "next_step": "请补充更多坐标点或检查数据过滤条件",
        "blocking": True
    },
    AnomalyType.PARAMETER_OUTDATED: {
        "action": AnomalyAction.WAIT_PARAMETER,
        "description": "参数表版本滞后",
        "next_step": "请等待最新参数表到达，以下结论可能受影响：面积换算、单位校准",
        "blocking": False
    },
    AnomalyType.CONSTRAINT_CONFLICT: {
        "action": AnomalyAction.ADJUST_CALIBER,
        "description": "约束条件互相冲突",
        "next_step": "请与数学老师确认口径，调整约束条件优先级",
        "blocking": True
    }
}


@dataclass
class Point:
    x: float
    y: float
    unit: Optional[str] = None
    record_id: Optional[str] = None
    source: Optional[str] = None

    def to_tuple(self) -> Tuple[float, float]:
        return (self.x, self.y)


@dataclass
class AnomalyRecord:
    anomaly_type: AnomalyType
    record_id: Optional[str] = None
    details: str = ""
    affected_fields: List[str] = field(default_factory=list)

    @property
    def guidance(self) -> Dict[str, Any]:
        return ANOMALY_GUIDANCE[self.anomaly_type]

    @property
    def is_blocking(self) -> bool:
        return self.guidance["blocking"]

    @property
    def action(self) -> AnomalyAction:
        return self.guidance["action"]

    @property
    def description(self) -> str:
        return self.guidance["description"]

    @property
    def next_step(self) -> str:
        return self.guidance["next_step"]


@dataclass
class CalculationResult:
    result_id: str = field(default_factory=lambda: uuid.uuid4().hex[:8])
    points: List[Point] = field(default_factory=list)
    hull_points: List[Tuple[float, float]] = field(default_factory=list)
    raw_area: float = 0.0
    unit: Optional[str] = None
    anomalies: List[AnomalyRecord] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    parameter_version: Optional[str] = None
    parameter_timestamp: Optional[datetime] = None
    notes: str = ""

    @property
    def is_valid(self) -> bool:
        return not any(a.is_blocking for a in self.anomalies)

    @property
    def blocking_anomalies(self) -> List[AnomalyRecord]:
        return [a for a in self.anomalies if a.is_blocking]

    @property
    def warning_anomalies(self) -> List[AnomalyRecord]:
        return [a for a in self.anomalies if not a.is_blocking]

    @property
    def converted_area(self) -> Optional[float]:
        if not self.is_valid or self.unit is None:
            return None
        return self.raw_area


@dataclass
class HistorySnapshot:
    version: str
    timestamp: datetime
    result: CalculationResult
    chart_path: Optional[str] = None
    change_reason: str = ""

    def affected_conclusions(self, newer: "HistorySnapshot") -> List[str]:
        affected = []
        if self.result.raw_area != newer.result.raw_area:
            affected.append("凸包原始面积")
        if self.result.unit != newer.result.unit:
            affected.append("面积单位")
        if self.result.parameter_version != newer.result.parameter_version:
            affected.append("参数表基准版本")
        if {p.record_id for p in self.result.points} != {p.record_id for p in newer.result.points}:
            affected.append("输入点集")
        return affected
