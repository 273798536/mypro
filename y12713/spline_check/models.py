from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

from pydantic import BaseModel, Field

try:
    from pydantic import model_validator  # type: ignore
    _HAS_V2 = True
except ImportError:
    from pydantic import root_validator  # type: ignore
    _HAS_V2 = False


class CheckStatus(str, Enum):
    """检查结果分类：可用 / 暂缓 / 重采"""

    USABLE = "usable"
    PENDING = "pending"
    RECOLLECT = "recollect"


class CorrectionAction(str, Enum):
    """修正操作类型"""

    CONFIRM_PASS = "confirm_pass"
    MARK_RECOLLECT = "mark_recollect"
    ADD_NOTE = "add_note"
    UPDATE_PARAMS = "update_params"


class SampleSource(str, Enum):
    """样本来源"""

    BATCH_IMPORT = "batch_import"
    MANUAL_ENTRY = "manual_entry"
    SUPPLEMENT = "supplement"


class SampleRecord(BaseModel):
    """原始样本记录，含去重指纹"""

    sample_id: str
    x_values: List[float]
    y_values: List[float]
    source: SampleSource = SampleSource.BATCH_IMPORT
    source_file: Optional[str] = None
    source_batch: Optional[str] = None
    imported_at: datetime = Field(default_factory=datetime.now)
    operator: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @property
    def fingerprint(self) -> str:
        """基于 x+y 序列化计算去重指纹，防止同一样本重复导入"""
        import hashlib
        import json

        payload = json.dumps(
            {"x": [round(v, 10) for v in self.x_values], "y": [round(v, 10) for v in self.y_values]},
            sort_keys=True,
        )
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]

    if _HAS_V2:
        @model_validator(mode="after")  # type: ignore
        def _check_length_match(self):
            if len(self.y_values) != len(self.x_values):
                raise ValueError("x_values 与 y_values 长度必须一致")
            if len(self.y_values) < 3:
                raise ValueError("至少需要 3 个点才能做样条插值")
            return self
    else:
        @root_validator  # type: ignore
        def _check_length_match(cls, values):  # noqa: N805
            if values.get("x_values") and values.get("y_values"):
                if len(values["y_values"]) != len(values["x_values"]):
                    raise ValueError("x_values 与 y_values 长度必须一致")
            if values.get("y_values") and len(values["y_values"]) < 3:
                raise ValueError("至少需要 3 个点才能做样条插值")
            return values


class CheckResult(BaseModel):
    """单次过冲检查结果"""

    sample_id: str
    fingerprint: str
    status: CheckStatus
    has_overshoot: bool
    max_overshoot: Optional[float] = None
    overshoot_points: List[Tuple[int, float, float]] = Field(
        default_factory=list,
        description="(point_index, interpolated_value, expected_bound)",
    )
    smoothing: float = 0.0
    knots: int = 0
    checked_at: datetime = Field(default_factory=datetime.now)
    checker_version: str = "0.1.0"
    note: Optional[str] = None

    @property
    def is_boundary_case(self) -> bool:
        """是否属于边界样例（接近阈值或存在争议）"""
        if self.max_overshoot is None:
            return False
        return 0.5 <= self.max_overshoot <= 2.0


class CorrectionRecord(BaseModel):
    """人工修正留痕记录"""

    sample_id: str
    fingerprint: str
    action: CorrectionAction
    operator: str
    before_status: Optional[CheckStatus] = None
    after_status: Optional[CheckStatus] = None
    before_note: Optional[str] = None
    after_note: Optional[str] = None
    reason: str
    corrected_at: datetime = Field(default_factory=datetime.now)

    def describe_diff(self) -> str:
        parts = []
        if self.before_status != self.after_status:
            parts.append(f"状态: {self.before_status} → {self.after_status}")
        if self.before_note != self.after_note:
            parts.append("备注: 已更新")
        return " | ".join(parts) if parts else "无变化"


class TraceLink(BaseModel):
    """追溯链中的一环：结果 → 处理 → 来源"""

    level: str
    description: str
    detail: Dict[str, Any] = Field(default_factory=dict)


class CheckReport(BaseModel):
    """完整检查报告，含分类统计与追溯"""

    generated_at: datetime = Field(default_factory=datetime.now)
    total: int = 0
    usable_count: int = 0
    pending_count: int = 0
    recollect_count: int = 0
    boundary_count: int = 0
    results: List[CheckResult] = Field(default_factory=list)
    corrections: List[CorrectionRecord] = Field(default_factory=list)
    duplicates_detected: List[str] = Field(default_factory=list)

    def summary(self) -> str:
        return (
            f"共 {self.total} 条 | 可用 {self.usable_count} | "
            f"暂缓 {self.pending_count} | 重采 {self.recollect_count} | "
            f"边界 {self.boundary_count} | 重复 {len(self.duplicates_detected)}"
        )
