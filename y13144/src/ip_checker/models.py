"""核心数据模型"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any, Union
from uuid import uuid4


class VerificationStatus(str, Enum):
    PASS = "通过"
    FAIL = "失败"
    WARNING = "警告"
    EXCEPTION = "异常"
    PENDING = "待处理"


class ProcessingStatus(str, Enum):
    RAW = "原始数据"
    MAPPED = "字段已映射"
    UNIT_CONVERTED = "单位已转换"
    CALCULATED = "公式已计算"
    VERIFIED = "已验算"
    ANOMALY_DETECTED = "已标记异常"


class DataSource(str, Enum):
    DRAFT_A = "复核人A草稿"
    DRAFT_B = "复核人B草稿"
    DRAFT_C = "建模助教手动录入"
    SYSTEM_EXPORT = "系统导出"
    HISTORY_IMPORT = "历史数据导入"


@dataclass
class Unit:
    name: str
    symbol: str
    dimension: str
    conversion_factor: float = 1.0
    base_unit: Optional[str] = None


@dataclass
class FieldMapping:
    source_field: str
    standard_field: str
    data_source: DataSource
    mapping_rule: str = "直接映射"
    confidence: float = 1.0
    notes: str = ""


@dataclass
class CalculationRule:
    formula_id: str
    formula_expression: str
    description: str
    input_fields: List[str]
    output_field: str
    target_unit: str
    created_at: datetime = field(default_factory=datetime.now)
    created_by: str = "系统默认"
    version: int = 1
    params: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CalculationContext:
    context_id: str = field(default_factory=lambda: uuid4().hex[:8])
    calculation_date: datetime = field(default_factory=datetime.now)
    reviewer: str = ""
    description: str = ""
    source_documents: List[str] = field(default_factory=list)
    assumptions: Dict[str, Any] = field(default_factory=dict)


@dataclass
class VerificationResult:
    record_id: str
    result_status: VerificationStatus
    calculated_value: Optional[float]
    expected_value: Optional[float]
    tolerance: float
    raw_inputs: Dict[str, Any]
    processing_steps: List[Dict[str, Any]]
    unit_conversions: List[Dict[str, Any]]
    error_message: Optional[str] = None
    anomaly_type: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class AuditEntry:
    entry_id: str = field(default_factory=lambda: uuid4().hex[:12])
    timestamp: datetime = field(default_factory=datetime.now)
    operator: str = "小岑"
    action: str = ""
    field_changed: str = ""
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None
    reason: str = ""
    affected_record_ids: List[str] = field(default_factory=list)
