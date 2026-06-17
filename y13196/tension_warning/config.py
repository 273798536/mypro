from dataclasses import dataclass, field
from enum import Enum
from typing import List, Dict, Optional, Any


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


WARNING_LEVEL_ORDER = [
    WarningLevel.NORMAL,
    WarningLevel.CAUTION,
    WarningLevel.WARNING,
    WarningLevel.DANGER,
    WarningLevel.SUSPENDED,
]


def level_rank(level: WarningLevel) -> int:
    return WARNING_LEVEL_ORDER.index(level) if level in WARNING_LEVEL_ORDER else -1


@dataclass
class LevelVerdict:
    level: WarningLevel
    display_status: str
    conclusions: List[Dict[str, str]]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "level": self.level.value,
            "display_status": self.display_status,
            "conclusions": self.conclusions,
        }


def determine_overall_level(
    direction_suspended: bool,
    danger_count: int,
    warning_count: int,
    tail_warning_count: int,
    has_hidden_tail_risk: bool,
    max_tension: Optional[float],
    warning_threshold: float,
) -> LevelVerdict:
    conclusions: List[Dict[str, str]] = []

    if direction_suspended:
        conclusions.append({
            "tag": "挂起",
            "text": "方向符号疑似写反，已挂起待算法值班人确认；未输出假稳定结论，请人工复核后再提交",
        })
        return LevelVerdict(
            level=WarningLevel.SUSPENDED,
            display_status="挂起待确认（方向存疑）",
            conclusions=conclusions,
        )

    if danger_count > 0:
        conclusions.append({
            "tag": "危险",
            "text": f"检测到 {danger_count} 个危险点，请立即核查设备状态和对应时间段",
        })
    if warning_count > 0:
        conclusions.append({
            "tag": "预警",
            "text": f"检测到 {warning_count} 个预警点，其中收尾段 {tail_warning_count} 个",
        })
    if has_hidden_tail_risk:
        conclusions.append({
            "tag": "收尾风险",
            "text": "整体平均可能掩盖收尾段的升高趋势，请重点关注最后15%数据段",
        })

    if danger_count > 0:
        level = WarningLevel.DANGER
        display_status = "已检出危险点"
    elif warning_count > 0 or has_hidden_tail_risk:
        level = WarningLevel.WARNING
        display_status = "已检出预警点"
    elif max_tension is not None and max_tension >= warning_threshold * 0.85:
        level = WarningLevel.CAUTION
        display_status = "接近预警阈值（注意）"
        conclusions.append({
            "tag": "注意",
            "text": (
                f"最高张力 {max_tension:.2f} 已达到预警阈值 {warning_threshold:.2f} 的 "
                f"{(max_tension / warning_threshold) * 100:.0f}%，暂未超限，建议关注"
            ),
        })
    else:
        level = WarningLevel.NORMAL
        display_status = "正常"
        conclusions.append({
            "tag": "正常",
            "text": "本次铭牌数据未检出超限点，张力水平处于可控范围",
        })

    return LevelVerdict(
        level=level,
        display_status=display_status,
        conclusions=conclusions,
    )


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
