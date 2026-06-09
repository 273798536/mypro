from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime


class ResultStatus(str, Enum):
    USABLE = "可用"
    PENDING = "暂缓"
    NEED_RECOLLECT = "需重采集"
    NEED_REVIEW = "待工程师复核"


class BoundaryFlag(str, Enum):
    NORMAL = "正常区间"
    LOWER_BOUNDARY = "下边界附近"
    UPPER_BOUNDARY = "上边界附近"
    ACROSS_BOUNDARY = "跨阶梯临界点"
    OUT_OF_RANGE = "超出阶梯范围"


class ReviewAction(str, Enum):
    CONFIRM_PASS = "确认通过"
    MARK_PENDING = "标记暂缓"
    REQUEST_RECOLLECT = "要求重采集"
    ESCALATE = "升级复核"


@dataclass
class SourceRef:
    original_line_no: Optional[int] = None
    image_name: Optional[str] = None
    source_note: Optional[str] = None
    sheet_name: Optional[str] = None

    def summary(self) -> str:
        parts = []
        if self.original_line_no is not None:
            parts.append(f"原始行号:{self.original_line_no}")
        if self.image_name:
            parts.append(f"图片:{self.image_name}")
        if self.sheet_name:
            parts.append(f"工作表:{self.sheet_name}")
        if self.source_note:
            parts.append(f"备注:{self.source_note}")
        return " | ".join(parts) if parts else "无来源信息"


@dataclass
class TaxRecord:
    record_id: str
    income_amount: float
    claimed_tax: float
    taxpayer_name: str = ""
    tax_year: int = 0
    source_ref: SourceRef = field(default_factory=SourceRef)
    raw_data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class LadderStep:
    lower_bound: float
    upper_bound: float
    tax_rate: float
    quick_deduction: float = 0.0

    def contains(self, amount: float) -> bool:
        return self.lower_bound <= amount < self.upper_bound

    def distance_to_lower(self, amount: float) -> float:
        return amount - self.lower_bound

    def distance_to_upper(self, amount: float) -> float:
        return self.upper_bound - amount


@dataclass
class LadderConfig:
    name: str = "个税综合所得税率表"
    steps: List[LadderStep] = field(default_factory=list)
    boundary_tolerance_pct: float = 2.0

    @classmethod
    def default_china_pit(cls) -> "LadderConfig":
        return cls(
            name="2024版个税综合所得税率表(年)",
            steps=[
                LadderStep(0.0, 36000.0, 0.03, 0.0),
                LadderStep(36000.0, 144000.0, 0.10, 2520.0),
                LadderStep(144000.0, 300000.0, 0.20, 16920.0),
                LadderStep(300000.0, 420000.0, 0.25, 31920.0),
                LadderStep(420000.0, 660000.0, 0.30, 52920.0),
                LadderStep(660000.0, 960000.0, 0.35, 85920.0),
                LadderStep(960000.0, float("inf"), 0.45, 181920.0),
            ],
            boundary_tolerance_pct=2.0,
        )


@dataclass
class VerificationResult:
    record: TaxRecord
    status: ResultStatus
    boundary_flag: BoundaryFlag
    expected_tax: float
    claimed_tax: float
    tax_diff: float
    matched_step: Optional[LadderStep]
    constraint_violations: List[str] = field(default_factory=list)
    explanation: str = ""
    is_duplicate: bool = False
    duplicate_of: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None

    @property
    def is_accurate(self) -> bool:
        return abs(self.tax_diff) < 0.01

    @property
    def needs_human_review(self) -> bool:
        return self.status in (ResultStatus.PENDING, ResultStatus.NEED_REVIEW)


@dataclass
class AuditEntry:
    result_id: str
    record_id: str
    action: ReviewAction
    previous_status: ResultStatus
    new_status: ResultStatus
    operator: str
    comment: str = ""
    timestamp: datetime = field(default_factory=datetime.now)
    changed_fields: Dict[str, Dict[str, Any]] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["timestamp"] = self.timestamp.isoformat()
        d["action"] = self.action.value
        d["previous_status"] = self.previous_status.value
        d["new_status"] = self.new_status.value
        return d


@dataclass
class BatchReport:
    total_records: int = 0
    usable_count: int = 0
    pending_count: int = 0
    need_recollect_count: int = 0
    need_review_count: int = 0
    duplicate_count: int = 0
    boundary_count: int = 0
    accuracy_rate: float = 0.0
    results: List[VerificationResult] = field(default_factory=list)
    audit_entries: List[AuditEntry] = field(default_factory=list)
    generated_at: datetime = field(default_factory=datetime.now)
