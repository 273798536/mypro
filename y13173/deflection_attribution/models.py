"""核心数据模型定义。"""

from dataclasses import dataclass, field, asdict
from typing import Optional, Dict, Any, List
from enum import Enum
import uuid
import datetime


class ProcessStatus(str, Enum):
    """处理状态。"""
    PENDING = "待处理"
    PROCESSING = "处理中"
    PROCESSED = "已处理"
    NEED_EVIDENCE = "待补证据"
    REVIEWED = "已复核"
    ERROR = "处理异常"


class AttributionCategory(str, Enum):
    """误差归因分类。"""
    MATERIAL = "材料因素"
    CONSTRUCTION = "施工因素"
    MEASUREMENT = "测量因素"
    ENVIRONMENT = "环境因素"
    DESIGN = "设计因素"
    UNKNOWN = "待归因"


class RiskLevel(str, Enum):
    """风险等级。"""
    LOW = "低风险"
    MEDIUM = "中风险"
    HIGH = "高风险"
    EXTREME = "极端风险"


@dataclass
class DeflectionRecord:
    """单条挠度记录。"""
    record_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    source_file: str = ""
    source_line: int = 0

    beam_id: str = ""
    measure_point: str = ""
    measure_time: str = ""

    design_value: Optional[float] = None
    measured_value: Optional[float] = None
    deflection_value: Optional[float] = None
    deflection_ratio: Optional[float] = None

    material_name: str = ""
    material_batch: str = ""
    construction_team: str = ""

    is_sampling_gap: bool = False
    gap_reason: str = ""

    is_extreme: bool = False
    extreme_reason: str = ""

    attribution: AttributionCategory = AttributionCategory.UNKNOWN
    attribution_detail: str = ""
    risk_level: RiskLevel = RiskLevel.LOW

    status: ProcessStatus = ProcessStatus.PENDING
    status_note: str = ""

    raw_data: Dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.datetime.now().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["status"] = self.status.value
        d["attribution"] = self.attribution.value
        d["risk_level"] = self.risk_level.value
        return d

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "DeflectionRecord":
        record = cls()
        for key, value in d.items():
            if hasattr(record, key):
                if key == "status":
                    record.status = ProcessStatus(value)
                elif key == "attribution":
                    record.attribution = AttributionCategory(value)
                elif key == "risk_level":
                    record.risk_level = RiskLevel(value)
                else:
                    setattr(record, key, value)
        return record


@dataclass
class AttributionSummary:
    """归因汇总。"""
    total_records: int = 0
    processed_count: int = 0
    pending_count: int = 0
    need_evidence_count: int = 0
    error_count: int = 0

    extreme_count: int = 0
    sampling_gap_count: int = 0

    by_category: Dict[str, int] = field(default_factory=dict)
    by_risk: Dict[str, int] = field(default_factory=dict)

    avg_deflection_ratio: Optional[float] = None
    max_deflection_ratio: Optional[float] = None

    evidence_todo: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
