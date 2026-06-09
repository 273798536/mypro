from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict, Any


@dataclass
class ReagentRecord:
    reagent_id: str
    name: str
    batch_no: str
    manufacturer: str
    open_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    volume_used: Optional[float] = None
    volume_unit: Optional[str] = None
    operator: Optional[str] = None
    remarks: Optional[str] = None
    raw_row: Dict[str, Any] = field(default_factory=dict)


@dataclass
class MonitorRecord:
    record_id: str
    sample_id: str
    sample_name: str
    monitor_date: Optional[datetime] = None
    blank_control_value: Optional[float] = None
    blank_control_unit: Optional[str] = None
    sample_value: Optional[float] = None
    sample_unit: Optional[str] = None
    standard_curve_id: Optional[str] = None
    operator: Optional[str] = None
    reviewer: Optional[str] = None
    remarks: Optional[str] = None
    reagent_ids: List[str] = field(default_factory=list)
    raw_row: Dict[str, Any] = field(default_factory=dict)


@dataclass
class BatchRecord:
    batch_id: str
    batch_name: str
    created_at: datetime
    input_dir: str
    output_dir: str
    status: str = "pending"
    monitor_count: int = 0
    reagent_count: int = 0
    anomaly_count: int = 0
    processed_monitor_ids: List[str] = field(default_factory=list)
    extra: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AnomalyRecord:
    anomaly_id: str
    monitor_record_id: str
    anomaly_type: str
    severity: str
    description: str
    plain_explanation: str
    reagent_evidence: List[str] = field(default_factory=list)
    related_fields: List[str] = field(default_factory=list)
    retest_suggestion: Optional[str] = None
    balance_calc: Optional[Dict[str, Any]] = None
    action_suggestion: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)


ANOMALY_TYPES = {
    "BLANK_CONTROL_MISSING": "空白对照缺失",
    "BLANK_CONTROL_ABNORMAL": "空白对照值异常",
    "SAMPLE_VALUE_OUT_OF_RANGE": "样品值超出标准范围",
    "UNIT_MISSING": "单位漏填",
    "REAGENT_EXPIRED": "试剂过期",
    "REAGENT_NOT_LOGGED": "试剂未登台账",
    "OPERATOR_MISSING": "操作人员漏填",
    "REMARK_INCOMPLETE": "补录备注不完整",
    "STANDARD_CURVE_MISSING": "标准曲线缺失",
    "REVIEWER_MISSING": "审核人员漏填",
}

SEVERITY_LEVELS = {
    "critical": "严重",
    "major": "主要",
    "minor": "次要",
    "info": "提示",
}
