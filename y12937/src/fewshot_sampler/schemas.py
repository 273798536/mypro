from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional


class AnomalyType(str, Enum):
    MISSING_UNIT = "missing_unit"
    SUPPLEMENT_REMARK = "supplement_remark"
    OLD_SCHEMA = "old_schema"
    VALUE_OUTLIER = "value_outlier"
    FORMAT_INCONSISTENCY = "format_inconsistency"
    DUPLICATE_RECORD = "duplicate_record"
    TEXT_TRUNCATED = "text_truncated"
    VERSION_ROLLBACK = "version_rollback"
    UNKNOWN = "unknown"

    @classmethod
    def from_string(cls, s: str) -> "AnomalyType":
        try:
            return cls(s)
        except ValueError:
            return cls.UNKNOWN

    @property
    def label(self) -> str:
        mapping = {
            AnomalyType.MISSING_UNIT: "缺少单位",
            AnomalyType.SUPPLEMENT_REMARK: "补录备注",
            AnomalyType.OLD_SCHEMA: "旧表结构",
            AnomalyType.VALUE_OUTLIER: "数值异常",
            AnomalyType.FORMAT_INCONSISTENCY: "格式不一致",
            AnomalyType.DUPLICATE_RECORD: "重复记录",
            AnomalyType.TEXT_TRUNCATED: "长文本截断",
            AnomalyType.VERSION_ROLLBACK: "版本回滚",
            AnomalyType.UNKNOWN: "待识别",
        }
        return mapping[self]


class FeedbackStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED_ANOMALY = "confirmed_anomaly"
    FALSE_POSITIVE = "false_positive"
    NEEDS_MORE_INFO = "needs_more_info"
    RESOLVED = "resolved"

    @property
    def label(self) -> str:
        mapping = {
            FeedbackStatus.PENDING: "待审核",
            FeedbackStatus.CONFIRMED_ANOMALY: "确认异常",
            FeedbackStatus.FALSE_POSITIVE: "误报",
            FeedbackStatus.NEEDS_MORE_INFO: "待补充信息",
            FeedbackStatus.RESOLVED: "已处理",
        }
        return mapping[self]


class SampleSource(str, Enum):
    RANDOM = "random"
    STRATIFIED = "stratified"
    ANOMALY_SCORE = "anomaly_score"
    RECENT = "recent"
    MANUAL = "manual"


@dataclass
class SamplingConfig:
    total_samples: int = 50
    random_ratio: float = 0.3
    anomaly_ratio: float = 0.4
    recent_ratio: float = 0.2
    manual_ratio: float = 0.1
    stratify_by: Optional[str] = None
    seed: Optional[int] = 42
    min_per_stratum: int = 2

    def validate(self) -> None:
        ratios = [
            self.random_ratio,
            self.anomaly_ratio,
            self.recent_ratio,
            self.manual_ratio,
        ]
        total = sum(ratios)
        if total > 1.01:
            raise ValueError(f"抽样比例总和 {total:.2f} 超过 1.0")


@dataclass
class AnomalyDetail:
    anomaly_type: AnomalyType
    field_name: Optional[str] = None
    description: str = ""
    severity: float = 0.0
    raw_value: Any = None
    expected_value: Any = None
    truncate_reason: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "异常类型": self.anomaly_type.label,
            "字段名": self.field_name or "-",
            "问题描述": self.description,
            "严重程度": f"{int(self.severity * 100)}%",
            "原始值": str(self.raw_value) if self.raw_value is not None else "-",
            "期望值": str(self.expected_value) if self.expected_value is not None else "-",
            "截断原因": self.truncate_reason or "-",
        }


@dataclass
class SampleRecord:
    record_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    batch_id: str = ""
    source_row_index: int = -1
    source_file: str = ""
    data: Dict[str, Any] = field(default_factory=dict)
    anomalies: List[AnomalyDetail] = field(default_factory=list)
    anomaly_score: float = 0.0
    sample_source: SampleSource = SampleSource.RANDOM
    created_at: datetime = field(default_factory=datetime.now)

    @property
    def has_anomaly(self) -> bool:
        return len(self.anomalies) > 0

    def to_flat_dict(self) -> Dict[str, Any]:
        flat = {
            "记录ID": self.record_id,
            "批次ID": self.batch_id,
            "来源文件": self.source_file,
            "原始行号": self.source_row_index + 1,
            "抽样方式": self._source_label(),
            "异常数量": len(self.anomalies),
            "异常总分": f"{int(self.anomaly_score * 100)}分",
            "抽样时间": self.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        }
        flat.update(self.data)
        return flat

    def _source_label(self) -> str:
        mapping = {
            SampleSource.RANDOM: "随机抽样",
            SampleSource.STRATIFIED: "分层抽样",
            SampleSource.ANOMALY_SCORE: "异常优先",
            SampleSource.RECENT: "最近数据",
            SampleSource.MANUAL: "人工指定",
        }
        return mapping.get(self.sample_source, str(self.sample_source))


@dataclass
class SampleBatch:
    batch_id: str = field(default_factory=lambda: "B" + uuid.uuid4().hex[:8])
    source_files: List[str] = field(default_factory=list)
    config: SamplingConfig = field(default_factory=SamplingConfig)
    records: List[SampleRecord] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    description: str = ""

    def __post_init__(self) -> None:
        for r in self.records:
            r.batch_id = self.batch_id

    @property
    def total_count(self) -> int:
        return len(self.records)

    @property
    def anomaly_count(self) -> int:
        return sum(1 for r in self.records if r.has_anomaly)

    def add_record(self, record: SampleRecord) -> None:
        record.batch_id = self.batch_id
        self.records.append(record)
