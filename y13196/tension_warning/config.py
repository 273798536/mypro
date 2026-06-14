from dataclasses import dataclass, field
from enum import Enum
from typing import List, Dict, Optional


class ProcessStatus(str, Enum):
    PENDING = "待处理"
    LOADED = "已加载"
    STANDARDIZED = "已标准化"
    DIRECTION_CHECKED = "方向已校验"
    DIRECTION_SUSPENDED = "方向挂起待确认"
    ANALYZED = "已分析"
    WARNING_ISSUED = "已预警"
    EXPORTED = "已导出"
    FAILED = "处理失败"


class DirectionSign(str, Enum):
    POSITIVE = "+"
    NEGATIVE = "-"
    UNKNOWN = "?"


class WarningLevel(str, Enum):
    NORMAL = "正常"
    CAUTION = "注意"
    WARNING = "预警"
    DANGER = "危险"
    SUSPENDED = "挂起待确认"


@dataclass
class FieldMapping:
    tension_fields: List[str] = field(default_factory=lambda: [
        "tension", "张力", "tension_force", "force", "拉力", "滑轮张力",
        "Tension", "TENSION", "tension_value", "主绳张力", "主线张力",
    ])
    timestamp_fields: List[str] = field(default_factory=lambda: [
        "timestamp", "时间", "time", "采集时间", "datetime", "日期时间",
        "Timestamp", "TIME", "record_time", "记录时间",
    ])
    direction_fields: List[str] = field(default_factory=lambda: [
        "direction", "方向", "dir", "运动方向", "受力方向", "sign", "符号",
        "Direction", "DIRECTION", "direction_sign",
    ])
    sensor_id_fields: List[str] = field(default_factory=lambda: [
        "sensor_id", "传感器编号", "sensor", "设备编号", "device_id",
        "SensorID", "SENSOR_ID", "铭牌编号", "id",
    ])
    load_stage_fields: List[str] = field(default_factory=lambda: [
        "stage", "阶段", "load_stage", "训练阶段", "环节", "phase",
        "Stage", "STAGE", "work_stage",
    ])
    sequence_fields: List[str] = field(default_factory=lambda: [
        "sequence", "序号", "seq", "index", "记录序号", "order",
        "Sequence", "SEQUENCE", "idx",
    ])


@dataclass
class ThresholdConfig:
    warning_threshold: float = 80.0
    danger_threshold: float = 95.0
    tail_ratio: float = 0.15
    extreme_sustain_points: int = 3
    allow_direction_auto_flip: bool = False
    require_direction_human_review: bool = True
    valid_tension_min: float = 0.0
    valid_tension_max: float = 150.0
    max_gap_ratio: float = 0.4


DEFAULT_THRESHOLD = ThresholdConfig()
DEFAULT_FIELD_MAPPINGS = FieldMapping()


@dataclass
class FailureReason:
    code: str
    message: str
    detail: Optional[str] = None
    suggestion: Optional[str] = None

    def to_dict(self) -> Dict:
        d = {
            "code": self.code,
            "message": self.message,
        }
        if self.detail:
            d["detail"] = self.detail
        if self.suggestion:
            d["suggestion"] = self.suggestion
        return d


FAILURE_REASONS = {
    "NO_TENSION_FIELD": FailureReason(
        code="NO_TENSION_FIELD",
        message="未在铭牌数据中找到张力字段",
        detail="算法值班人提交的字段名未命中映射表",
        suggestion="检查字段名，或在字段映射表中补充别名",
    ),
    "NO_TIMESTAMP_FIELD": FailureReason(
        code="NO_TIMESTAMP_FIELD",
        message="未找到时间戳或序号字段",
        detail="无法确定数据顺序，极值定位将不可靠",
        suggestion="补充时间戳字段，或提供有序列号的记录",
    ),
    "EMPTY_DATA": FailureReason(
        code="EMPTY_DATA",
        message="铭牌数据为空",
        detail="提交的数据记录条数为0",
        suggestion="检查数据源是否正常",
    ),
    "DIRECTION_AMBIGUOUS": FailureReason(
        code="DIRECTION_AMBIGUOUS",
        message="方向符号存在歧义，已挂起待人工确认",
        detail="检测到方向字段与张力变化趋势不一致，可能存在写反",
        suggestion="请算法值班人核对方向字段的物理含义后重新提交",
    ),
    "INVALID_TENSION_VALUE": FailureReason(
        code="INVALID_TENSION_VALUE",
        message="张力值超出物理有效范围",
        detail="存在张力值超出设定的有效区间",
        suggestion="检查传感器校准或数据采集链路",
    ),
    "TOO_MANY_GAPS": FailureReason(
        code="TOO_MANY_GAPS",
        message="数据断续超过容忍阈值",
        detail="数据缺失比例过高，可能漏检风险",
        suggestion="建议补充完整数据后重新分析，或在结论中标注断续风险",
    ),
}
