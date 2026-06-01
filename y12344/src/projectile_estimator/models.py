"""数据模型：轨迹点、角度记录、风速记录及关联机制"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from datetime import datetime
import numpy as np


@dataclass
class SourceInfo:
    """来源信息，追踪每份材料"""
    material_id: str
    material_name: str
    source_type: str  # trajectory, angle, wind, config
    file_path: Optional[str] = None
    record_time: datetime = field(default_factory=datetime.now)


@dataclass
class BoundsConfig:
    """边界配置，所有边界值显式定义"""
    angle_min_deg: float = -10.0
    angle_max_deg: float = 90.0
    wind_speed_min: float = 0.0
    wind_speed_max: float = 30.0
    coordinate_x_min: float = 0.0
    coordinate_x_max: float = 1000.0
    coordinate_y_min: float = -50.0
    coordinate_y_max: float = 500.0
    time_min: float = 0.0
    time_max: float = 60.0

    def to_dict(self) -> Dict[str, Dict[str, float]]:
        return {
            "angle": {"unit": "deg", "min": self.angle_min_deg, "max": self.angle_max_deg},
            "wind_speed": {"unit": "m/s", "min": self.wind_speed_min, "max": self.wind_speed_max},
            "coordinate_x": {"unit": "m", "min": self.coordinate_x_min, "max": self.coordinate_x_max},
            "coordinate_y": {"unit": "m", "min": self.coordinate_y_min, "max": self.coordinate_y_max},
            "time": {"unit": "s", "min": self.time_min, "max": self.time_max},
        }


@dataclass
class TrajectoryPoint:
    """轨迹点数据"""
    t: float  # 时间, 单位: s
    x: float  # x坐标, 单位: m
    y: float  # y坐标, 单位: m
    source: SourceInfo
    point_id: Optional[str] = None
    vx: Optional[float] = None  # x方向速度, 单位: m/s
    vy: Optional[float] = None  # y方向速度, 单位: m/s
    flags: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AngleRecord:
    """角度记录数据"""
    t: float  # 时间, 单位: s
    angle_deg: float  # 角度, 单位: deg
    source: SourceInfo
    record_id: Optional[str] = None
    angle_rad: Optional[float] = None  # 弧度, 自动计算
    flags: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        if self.angle_rad is None:
            self.angle_rad = np.deg2rad(self.angle_deg)


@dataclass
class WindRecord:
    """风速记录数据"""
    t: float  # 时间, 单位: s
    wind_speed: float  # 风速, 单位: m/s
    wind_direction_deg: float  # 风向, 单位: deg (0度为x轴正方向)
    source: SourceInfo
    record_id: Optional[str] = None
    wind_direction_rad: Optional[float] = None
    flags: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        if self.wind_direction_rad is None:
            self.wind_direction_rad = np.deg2rad(self.wind_direction_deg)

    @property
    def wind_x(self) -> float:
        """x方向风速分量, 单位: m/s"""
        return self.wind_speed * np.cos(self.wind_direction_rad)

    @property
    def wind_y(self) -> float:
        """y方向风速分量, 单位: m/s"""
        return self.wind_speed * np.sin(self.wind_direction_rad)


@dataclass
class Event:
    """事件：关联同一时刻的多条记录"""
    event_id: str
    t: float  # 时间, 单位: s
    trajectory_point: Optional[TrajectoryPoint] = None
    angle_record: Optional[AngleRecord] = None
    wind_record: Optional[WindRecord] = None

    @property
    def sources(self) -> List[SourceInfo]:
        sources = []
        if self.trajectory_point:
            sources.append(self.trajectory_point.source)
        if self.angle_record:
            sources.append(self.angle_record.source)
        if self.wind_record:
            sources.append(self.wind_record.source)
        return sources


@dataclass
class Anomaly:
    """异常记录"""
    anomaly_id: str
    anomaly_type: str  # angle_overflow, wind_missing, coordinate_reverse
    severity: str  # warning, error
    message: str
    t: Optional[float] = None
    event: Optional[Event] = None
    source: Optional[SourceInfo] = None
    value: Optional[float] = None
    bound_min: Optional[float] = None
    bound_max: Optional[float] = None
    unit: Optional[str] = None
    next_step: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "anomaly_id": self.anomaly_id,
            "anomaly_type": self.anomaly_type,
            "severity": self.severity,
            "message": self.message,
            "t": self.t,
            "value": self.value,
            "bound_min": self.bound_min,
            "bound_max": self.bound_max,
            "unit": self.unit,
            "source_material": self.source.material_name if self.source else None,
            "source_file": self.source.file_path if self.source else None,
            "next_step": self.next_step,
        }


@dataclass
class ProjectileParams:
    """抛体参数"""
    mass: float  # 质量, 单位: kg
    cross_section_area: float  # 横截面积, 单位: m^2
    drag_coeff: float = 0.47  # 风阻系数 (球体默认值)

    def to_dict(self) -> Dict[str, float]:
        return {
            "mass": self.mass,
            "cross_section_area": self.cross_section_area,
            "drag_coeff": self.drag_coeff,
        }

    def units_dict(self) -> Dict[str, str]:
        return {
            "mass": "kg",
            "cross_section_area": "m^2",
            "drag_coeff": "dimensionless",
        }


@dataclass
class ProjectileState:
    """抛体运动状态"""
    t: float
    x: float
    y: float
    vx: float
    vy: float
    ax: float
    ay: float


@dataclass
class FittingResult:
    """轨迹拟合结果"""
    method: str
    params: Dict[str, float]
    params_units: Dict[str, str]
    r_squared: float
    rmse: float
    estimated_drag_coeff: Optional[float] = None
    intermediate_values: Dict[str, Any] = field(default_factory=dict)
    formula: str = ""


@dataclass
class AnalysisReport:
    """完整分析报告"""
    report_id: str
    created_at: datetime
    bounds_config: BoundsConfig
    events: List[Event]
    anomalies: List[Anomaly]
    fitting_result: Optional[FittingResult] = None
    drag_estimation: Optional[Dict[str, Any]] = None
    error_analysis: Optional[Dict[str, Any]] = None
