from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime


class MaterialStatus(Enum):
    PENDING = "待补材料"
    COMPLETE = "已收齐"
    REVISED = "口径已改"
    WITHDRAWN = "已撤回"
    VERBAL = "口头说明"


class DecisionStatus(Enum):
    PROCESSED = "已处理"
    NEEDS_MATERIAL = "待补材料"
    MANUAL_CHANGED = "人工改判"
    GRAY = "灰度中"


class ScoreVerdict(Enum):
    PASS = "通过"
    REJECT = "拒绝"
    GRAY = "灰度"


class Confidence(Enum):
    HIGH = "高"
    MEDIUM = "中"
    LOW = "低"
    UNCERTAIN = "不确定"


@dataclass
class MaterialVersion:
    version_id: str
    content: str
    source: str
    timestamp: datetime
    note: str = ""


@dataclass
class CaseMaterial:
    material_id: str
    case_id: str
    material_type: str
    status: MaterialStatus
    versions: List[MaterialVersion] = field(default_factory=list)
    references: List[str] = field(default_factory=list)
    is_revised: bool = False
    revised_from: Optional[str] = None

    def get_latest(self) -> Optional[MaterialVersion]:
        if not self.versions:
            return None
        return sorted(self.versions, key=lambda v: v.timestamp)[-1]

    def get_earliest(self) -> Optional[MaterialVersion]:
        if not self.versions:
            return None
        return sorted(self.versions, key=lambda v: v.timestamp)[0]

    def has_reference_gaps(self) -> bool:
        return len(self.references) == 0


@dataclass
class ManualCorrection:
    correction_id: str
    case_id: str
    operator: str
    timestamp: datetime
    original_verdict: ScoreVerdict
    corrected_verdict: ScoreVerdict
    reason: str
    related_material_ids: List[str] = field(default_factory=list)


@dataclass
class WithdrawRecord:
    withdraw_id: str
    case_id: str
    operator: str
    timestamp: datetime
    withdrawn_material_id: str
    reason: str


@dataclass
class VerbalNote:
    note_id: str
    case_id: str
    operator: str
    timestamp: datetime
    content: str
    related_material_ids: List[str] = field(default_factory=list)


@dataclass
class ScoreThreshold:
    threshold_id: str
    threshold_name: str
    pass_line: float
    reject_line: float
    effective_from: datetime
    effective_to: Optional[datetime] = None
    description: str = ""

    def is_active(self, at: Optional[datetime] = None) -> bool:
        at = at or datetime.now()
        if at < self.effective_from:
            return False
        if self.effective_to and at > self.effective_to:
            return False
        return True


@dataclass
class ScoreSnapshot:
    case_id: str
    score: float
    threshold_id: str
    verdict: ScoreVerdict
    timestamp: datetime
    confidence: Confidence = Confidence.HIGH
    missing_materials: List[str] = field(default_factory=list)
    model_version: str = "v1"


@dataclass
class TimelineEvent:
    event_id: str
    case_id: str
    timestamp: datetime
    event_type: str
    description: str
    status: DecisionStatus
    operator: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class GrayBreakdown:
    case_id: str
    sample_change_delta: Optional[float] = None
    threshold_change_delta: Optional[float] = None
    manual_override_delta: Optional[float] = None
    final_verdict: Optional[ScoreVerdict] = None
    sample_change_note: str = ""
    threshold_change_note: str = ""
    manual_override_note: str = ""


@dataclass
class ReplayConfig:
    run_id: str
    threshold_drift: Optional[float] = None
    inject_missing_materials: bool = False
    inject_conflicting_materials: bool = False
    baseline_threshold_id: Optional[str] = None
    comparison_threshold_id: Optional[str] = None


@dataclass
class ReplayResult:
    run_id: str
    case_id: str
    events: List[TimelineEvent] = field(default_factory=list)
    material_chain: List[CaseMaterial] = field(default_factory=list)
    corrections: List[ManualCorrection] = field(default_factory=list)
    withdrawals: List[WithdrawRecord] = field(default_factory=list)
    verbal_notes: List[VerbalNote] = field(default_factory=list)
    score_snapshots: List[ScoreSnapshot] = field(default_factory=list)
    gray_breakdown: Optional[GrayBreakdown] = None
    final_verdict: Optional[ScoreVerdict] = None
    final_status: DecisionStatus = DecisionStatus.PROCESSED
    missing_references: List[str] = field(default_factory=list)
    revised_materials: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)


ERROR_MESSAGES = {
    "INVALID_CASE_ID": "[ERR_CASE_001] 案件编号无效，无法关联任何材料",
    "NO_BASELINE_THRESHOLD": "[ERR_THRESH_001] 未指定基线阈值，无法进行对比回放",
    "MATERIAL_CONFLICT": "[ERR_MAT_002] 同一材料存在多份冲突版本，需人工确认口径",
    "SCORE_CALC_FAILED": "[ERR_SCORE_001] 评分计算失败，缺少必填字段",
    "TIMELINE_GAP": "[ERR_TL_001] 时间线存在断点，部分事件缺失",
    "CONFIG_MISSING": "[ERR_CFG_001] 回放配置缺失必填参数",
}

STABLE_PARAMS = {
    "PARAM_RUN_ID": "--replay-run-id",
    "PARAM_CASE_ID": "--replay-case-id",
    "PARAM_THRESHOLD_ID": "--threshold-baseline-id",
    "PARAM_THRESHOLD_COMPARE": "--threshold-compare-id",
    "PARAM_DRIFT": "--threshold-drift-value",
    "PARAM_INJECT_MISSING": "--inject-missing-materials",
    "PARAM_INJECT_CONFLICT": "--inject-conflicting-materials",
    "PARAM_OUTPUT_FORMAT": "--report-format",
    "PARAM_AUDIENCE": "--report-audience",
}
