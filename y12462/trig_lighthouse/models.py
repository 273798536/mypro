"""核心数据模型"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from enum import Enum
import math


class AngleUnit(Enum):
    """角度单位"""
    DEGREE = "degree"
    RADIAN = "radian"


class Quadrant(Enum):
    """象限"""
    Q1 = 1
    Q2 = 2
    Q3 = 3
    Q4 = 4
    AXIS = 0


class GameStatus(Enum):
    """游戏状态"""
    NOT_STARTED = "not_started"
    PLAYING = "playing"
    SUCCESS = "success"
    FAILED = "failed"


class ErrorType(Enum):
    """错误类型"""
    ANGLE_UNIT_MIX = "angle_unit_mix"
    QUADRANT_MISJUDGE = "quadrant_misjudge"
    PROJECTION_OUT_OF_BOUNDS = "projection_out_of_bounds"
    BAD_ROW = "bad_row"


@dataclass
class Angle:
    """角度"""
    value: float
    unit: AngleUnit

    def to_radian(self) -> float:
        if self.unit == AngleUnit.RADIAN:
            return self.value
        return math.radians(self.value)

    def to_degree(self) -> float:
        if self.unit == AngleUnit.DEGREE:
            return self.value
        return math.degrees(self.value)

    def normalize(self) -> "Angle":
        """标准化到 [0, 360) 度或 [0, 2π) 弧度"""
        if self.unit == AngleUnit.DEGREE:
            normalized = self.value % 360
            if normalized < 0:
                normalized += 360
            return Angle(normalized, AngleUnit.DEGREE)
        else:
            normalized = self.value % (2 * math.pi)
            if normalized < 0:
                normalized += 2 * math.pi
            return Angle(normalized, AngleUnit.RADIAN)

    def get_quadrant(self) -> Quadrant:
        """获取象限"""
        deg = self.normalize().to_degree()
        if abs(deg) < 1e-9 or abs(deg - 90) < 1e-9 or abs(deg - 180) < 1e-9 or abs(deg - 270) < 1e-9:
            return Quadrant.AXIS
        if deg < 90:
            return Quadrant.Q1
        elif deg < 180:
            return Quadrant.Q2
        elif deg < 270:
            return Quadrant.Q3
        else:
            return Quadrant.Q4


@dataclass
class UnitCirclePoint:
    """单位圆上的点"""
    angle: Angle
    x: float
    y: float
    sin: float
    cos: float
    tan: float
    quadrant: Quadrant
    source_version: str = "original"


@dataclass
class Lighthouse:
    """灯塔"""
    id: str
    name: str
    position_x: float
    position_y: float
    beam_angle: Angle
    target_angle: Optional[Angle] = None
    is_lit: bool = False


@dataclass
class Target:
    """目标"""
    id: str
    expected_angle: Angle
    expected_quadrant: Quadrant
    tolerance: float = 5.0
    hit: bool = False
    hit_angle: Optional[Angle] = None


@dataclass
class DataError:
    """数据错误"""
    error_type: ErrorType
    row_number: int
    message: str
    raw_data: str


@dataclass
class Level:
    """关卡"""
    id: str
    name: str
    description: str
    lighthouses: List[Lighthouse]
    targets: List[Target]
    difficulty: int = 1
    time_limit: Optional[int] = None


@dataclass
class GameState:
    """游戏状态"""
    current_level: Optional[Level] = None
    status: GameStatus = GameStatus.NOT_STARTED
    current_beam_angle: Optional[Angle] = None
    hits: List[str] = field(default_factory=list)
    errors: List[DataError] = field(default_factory=list)
    attempts: int = 0
    score: int = 0


@dataclass
class GameResult:
    """游戏结果"""
    level_id: str
    level_name: str
    status: GameStatus
    total_targets: int
    hit_targets: int
    accuracy: float
    score: int
    errors: List[DataError]
    beam_angles: List[Dict[str, Any]]
    timestamp: float
    version: str
