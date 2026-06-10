"""
数据模型定义
核心原则：批次追踪与异常留痕共用同一批处理记录
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Dict, Any
from enum import Enum


class SampleStatus(str, Enum):
    NORMAL = "正常"
    ANOMALY = "异常"
    PENDING = "待复核"
    INVALID = "已作废"


class AnomalyType(str, Enum):
    MISSING_RECORD = "记录缺失"
    MISSING_BLANK_CONTROL = "空白对照缺失"
    ABNORMAL_VALUE = "数值异常"
    MISSING_UNIT = "单位漏填"
    TIME_DISCREPANCY = "时间矛盾"
    OUT_OF_SPEC = "超出标准"
    DUPLICATE_BATCH = "批次重复"
    INCOMPLETE_DATA = "数据不完整"


class StorageCondition(str, Enum):
    ROOM_TEMP = "室温"
    ACCELERATED = "加速(40°C/75%RH)"
    REFRIGERATED = "冷藏(2-8°C)"
    FREEZER = "冷冻(-18°C以下)"
    LIGHT = "光照(4500lux)"


@dataclass
class ProcessingRecord:
    """
    批处理记录 - 批次追踪和异常留痕共用此记录
    每一次数据导入、计算、修改都生成一条处理记录
    """
    record_id: str
    batch_no: str
    operator: str
    action: str
    timestamp: datetime = field(default_factory=datetime.now)
    input_files: List[str] = field(default_factory=list)
    output_files: List[str] = field(default_factory=list)
    anomaly_ids: List[str] = field(default_factory=list)
    remarks: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class BatchInfo:
    """批次信息"""
    batch_no: str
    product_name: str
    product_code: str
    specification: str
    manufacture_date: str
    expiry_date_candidate: str
    manufacturer: str
    storage_condition: StorageCondition
    inspector: str
    create_time: datetime = field(default_factory=datetime.now)
    remarks: str = ""


@dataclass
class TestPoint:
    """考察时间点"""
    batch_no: str
    time_point: str
    test_date: str
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    operator: str = ""
    record_time: Optional[datetime] = None
    is_blank_control: bool = False
    remarks: str = ""


@dataclass
class TestItem:
    """检验项目结果"""
    test_id: str
    batch_no: str
    time_point: str
    item_name: str
    item_code: str
    measured_value: Optional[float] = None
    unit: str = ""
    specification: str = ""
    is_qualified: Optional[bool] = None
    inspector: str = ""
    inspection_date: str = ""
    remarks: str = ""
    supplementary_note: str = ""


@dataclass
class StabilityResult:
    """稳定性计算结果"""
    batch_no: str
    item_name: str
    initial_value: float
    final_value: float
    degradation_rate: float
    half_life: Optional[float] = None
    expiry_estimate: Optional[str] = None
    is_conforming: bool = True
    calculation_method: str = ""
    remarks: str = ""


@dataclass
class AnomalyRecord:
    """异常记录"""
    anomaly_id: str
    batch_no: str
    anomaly_type: AnomalyType
    severity: str
    description: str
    location: str
    processing_record_id: str
    detected_time: datetime = field(default_factory=datetime.now)
    status: SampleStatus = SampleStatus.PENDING
    handling_opinion: str = ""
    handler: str = ""
    handle_time: Optional[datetime] = None
    related_data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class LedgerData:
    """台账完整数据"""
    batches: Dict[str, BatchInfo] = field(default_factory=dict)
    test_points: Dict[str, List[TestPoint]] = field(default_factory=dict)
    test_items: Dict[str, List[TestItem]] = field(default_factory=dict)
    stability_results: Dict[str, List[StabilityResult]] = field(default_factory=dict)
    anomalies: List[AnomalyRecord] = field(default_factory=list)
    processing_records: List[ProcessingRecord] = field(default_factory=list)
