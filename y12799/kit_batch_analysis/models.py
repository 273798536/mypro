"""数据模型定义"""

from dataclasses import dataclass, field
from datetime import datetime, date
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple
import pandas as pd
from pathlib import Path


class AnomalyAction(str, Enum):
    """异常处理方向：告诉管理员下一步做什么"""
    SUPPLY_MATERIAL = "补材料"
    CORRECT_RECORD = "改口径"
    RECHECK = "建议复测"
    REVIEW_ONLY = "待审核"
    BLOCK_RELEASE = "拦截放行"


class AnomalySeverity(str, Enum):
    """异常严重程度"""
    CRITICAL = "严重"
    WARNING = "警告"
    INFO = "提示"


class RecordStatus(str, Enum):
    """单条记录的校验状态"""
    PASS = "通过"
    PENDING = "待补录"
    FAIL = "不通过"
    RECHECKED = "已复测"


@dataclass
class ManualNote:
    """人工备注 - 严格保留原话，不做规范化"""
    raw_text: str
    author: Optional[str] = None
    timestamp: Optional[datetime] = None
    source_record_id: Optional[str] = None

    def display(self) -> str:
        """原样返回备注，不做任何修改"""
        return self.raw_text

    def __str__(self) -> str:
        return self.raw_text


@dataclass
class ReagentLedgerRecord:
    """试剂台账记录"""
    record_id: str
    batch_no: str
    kit_name: str
    reagent_name: str
    receive_date: date
    expiry_date: date
    quantity: float
    unit: str
    storage_condition: str = ""
    operator: str = ""
    manual_notes: List[ManualNote] = field(default_factory=list)
    status: RecordStatus = RecordStatus.PENDING
    raw_row: Dict[str, Any] = field(default_factory=dict)

    def is_expired(self, check_date: Optional[date] = None) -> bool:
        check_date = check_date or date.today()
        return check_date > self.expiry_date


@dataclass
class ExperimentRecord:
    """实验记录"""
    record_id: str
    batch_no: str
    experiment_no: str
    experiment_date: date
    experiment_type: str
    sample_count: int
    operator: str = ""
    blank_control_count: int = 0
    manual_notes: List[ManualNote] = field(default_factory=list)
    status: RecordStatus = RecordStatus.PENDING
    raw_row: Dict[str, Any] = field(default_factory=dict)


@dataclass
class WeighingSheetRecord:
    """称量单记录"""
    record_id: str
    batch_no: str
    experiment_no: str
    reagent_name: str
    weighing_date: date
    theoretical_weight: float
    actual_weight: float
    unit: str = "mg"
    operator: str = ""
    manual_notes: List[ManualNote] = field(default_factory=list)
    status: RecordStatus = RecordStatus.PENDING
    raw_row: Dict[str, Any] = field(default_factory=dict)

    @property
    def deviation_percent(self) -> float:
        if self.theoretical_weight == 0:
            return 0.0
        return abs(self.actual_weight - self.theoretical_weight) / self.theoretical_weight * 100


@dataclass
class ReactionTimeRecord:
    """反应时间记录"""
    record_id: str
    batch_no: str
    experiment_no: str
    step_name: str
    standard_duration_min: float
    actual_duration_min: Optional[float] = None
    operator: str = ""
    manual_notes: List[ManualNote] = field(default_factory=list)
    status: RecordStatus = RecordStatus.PENDING
    raw_row: Dict[str, Any] = field(default_factory=dict)

    @property
    def is_missing(self) -> bool:
        return self.actual_duration_min is None

    @property
    def deviation_min(self) -> Optional[float]:
        if self.actual_duration_min is None:
            return None
        return abs(self.actual_duration_min - self.standard_duration_min)


@dataclass
class TemperaturePoint:
    """温度曲线单个数据点"""
    time_min: float
    temperature: float
    expected_temperature: Optional[float] = None


@dataclass
class TemperatureCurveRecord:
    """温度曲线记录"""
    record_id: str
    batch_no: str
    experiment_no: str
    curve_name: str
    points: List[TemperaturePoint] = field(default_factory=list)
    operator: str = ""
    manual_notes: List[ManualNote] = field(default_factory=list)
    status: RecordStatus = RecordStatus.PENDING
    raw_row: Dict[str, Any] = field(default_factory=dict)

    def max_deviation(self) -> Optional[float]:
        deviations = []
        for p in self.points:
            if p.expected_temperature is not None:
                deviations.append(abs(p.temperature - p.expected_temperature))
        return max(deviations) if deviations else None


@dataclass
class BatchTrackingRecord:
    """批次追踪 - 持续性追踪，不是一次性判断"""
    batch_no: str
    kit_name: str = ""
    first_analysis_date: Optional[date] = None
    last_analysis_date: Optional[date] = None
    analysis_count: int = 0
    current_status: str = "分析中"
    recheck_suggestions: List[str] = field(default_factory=list)
    history_snapshots: List[Dict[str, Any]] = field(default_factory=list)
    manual_notes: List[ManualNote] = field(default_factory=list)
    unresolved_anomaly_ids: List[str] = field(default_factory=list)

    def has_unresolved_issues(self) -> bool:
        return len(self.unresolved_anomaly_ids) > 0

    def needs_temp_curve_recheck(self) -> bool:
        return "温度曲线超差" in " ".join(self.recheck_suggestions)


@dataclass
class AnomalyRecord:
    """异常记录 - 分类输出，不只是红色数字"""
    anomaly_id: str
    batch_no: str
    source_module: str
    anomaly_type: str
    severity: AnomalySeverity
    action: AnomalyAction
    title: str
    detail_message: str
    blocking_reason: str = ""
    related_record_ids: List[str] = field(default_factory=list)
    related_batch_no: str = ""
    manual_notes: List[ManualNote] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    resolution_note: str = ""
    raw_context: Dict[str, Any] = field(default_factory=dict)

    def action_label(self) -> str:
        emoji = {
            AnomalyAction.SUPPLY_MATERIAL: "[补材料] ",
            AnomalyAction.CORRECT_RECORD: "[改口径] ",
            AnomalyAction.RECHECK: "[复测] ",
            AnomalyAction.REVIEW_ONLY: "[审核] ",
            AnomalyAction.BLOCK_RELEASE: "[拦截] ",
        }
        return emoji.get(self.action, "") + self.action.value


@dataclass
class BatchCVResult:
    """批间差计算结果"""
    batch_no: str
    indicator_name: str
    mean_value: float
    std_value: float
    cv_percent: float
    pass_threshold: float
    is_pass: bool
    sample_count: int
    data_source: str = ""


@dataclass
class AnalysisDataset:
    """整合后的分析数据集"""
    reagent_ledgers: List[ReagentLedgerRecord] = field(default_factory=list)
    experiment_records: List[ExperimentRecord] = field(default_factory=list)
    weighing_sheets: List[WeighingSheetRecord] = field(default_factory=list)
    reaction_times: List[ReactionTimeRecord] = field(default_factory=list)
    temp_curves: List[TemperatureCurveRecord] = field(default_factory=list)
    batch_tracking: Dict[str, BatchTrackingRecord] = field(default_factory=dict)
    anomalies: List[AnomalyRecord] = field(default_factory=list)
    cv_results: List[BatchCVResult] = field(default_factory=list)
    analysis_run_id: str = ""
    analysis_timestamp: datetime = field(default_factory=datetime.now)

    def get_batch_numbers(self) -> List[str]:
        batches = set()
        for r in self.reagent_ledgers:
            batches.add(r.batch_no)
        for e in self.experiment_records:
            batches.add(e.batch_no)
        for w in self.weighing_sheets:
            batches.add(w.batch_no)
        for t in self.reaction_times:
            batches.add(t.batch_no)
        for c in self.temp_curves:
            batches.add(c.batch_no)
        return sorted(batches)

    def get_records_for_batch(self, batch_no: str) -> Dict[str, List]:
        return {
            "reagent_ledgers": [r for r in self.reagent_ledgers if r.batch_no == batch_no],
            "experiment_records": [e for e in self.experiment_records if e.batch_no == batch_no],
            "weighing_sheets": [w for w in self.weighing_sheets if w.batch_no == batch_no],
            "reaction_times": [t for t in self.reaction_times if t.batch_no == batch_no],
            "temp_curves": [c for c in self.temp_curves if c.batch_no == batch_no],
        }
