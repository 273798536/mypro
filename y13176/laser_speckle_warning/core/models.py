from __future__ import annotations

import json
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator


class MaterialSource(str, Enum):
    SITE_PHOTO = "现场照片"
    DOCUMENT = "书面材料"
    VERBAL_NOTE = "口头备注"


class MaterialStatus(str, Enum):
    NORMAL = "正常"
    OLD_VERSION = "旧版材料"
    NAME_MISMATCH = "名称不一致"
    VERBAL = "口头备注待确认"


class WarningLevel(str, Enum):
    SAFE = "安全"
    CAUTION = "注意"
    WARNING = "预警"
    DANGER = "危险"


class ProcessStatus(str, Enum):
    PENDING = "待处理"
    PROCESSING = "处理中"
    COMPLETED = "已处理"
    GAP_PAUSED = "采样缺口暂停"
    NEEDS_CONFIRM = "待人工确认"


class JudgmentType(str, Enum):
    AUTO = "自动判定"
    MANUAL = "人工改判"


class Material(BaseModel):
    material_id: str
    name: str
    source: MaterialSource
    status: MaterialStatus
    version: str = "v1.0"
    captured_at: Optional[datetime] = None
    file_path: Optional[str] = None
    raw_content: dict[str, Any] = Field(default_factory=dict)
    matched_standard_name: Optional[str] = None
    issue_description: Optional[str] = None
    imported_at: datetime = Field(default_factory=datetime.now)

    def to_impact_trace(self) -> dict[str, Any]:
        return {
            "material_id": self.material_id,
            "name": self.name,
            "source": self.source.value,
            "status": self.status.value,
            "version": self.version,
            "issue": self.issue_description,
        }


class SitePhoto(BaseModel):
    photo_id: str
    file_path: str
    material_id: Optional[str] = None
    sample_index: int
    position_label: str
    speckle_intensity: float
    has_sampling_gap: bool = False
    gap_info: Optional[str] = None
    captured_at: Optional[datetime] = None


class ParamVersion(BaseModel):
    version_tag: str
    description: str
    threshold_coefficient: float
    min_sample_count: int
    max_gap_ratio: float
    intensity_unit: str = "灰度值"
    created_at: datetime = Field(default_factory=datetime.now)
    parent_version: Optional[str] = None

    def formula_text(self) -> str:
        return (
            f"预警阈值 = 平均散斑强度 × {self.threshold_coefficient} "
            f"(样本数≥{self.min_sample_count}, 缺口占比≤{self.max_gap_ratio * 100:.0f}%)"
        )

    def boundary_conditions(self) -> list[str]:
        return [
            f"最小有效样本数: {self.min_sample_count} 张",
            f"最大允许采样缺口占比: {self.max_gap_ratio * 100:.0f}%",
            f"阈值系数: {self.threshold_coefficient}",
            f"强度单位: {self.intensity_unit}",
        ]


class SamplingGap(BaseModel):
    gap_id: str
    reason: str
    affected_range: str
    missing_sample_count: int
    missing_positions: list[str]
    severity: WarningLevel
    suggested_action: str


class BoundarySample(BaseModel):
    photo_id: str
    position_label: str
    speckle_intensity: float
    distance_to_threshold: float
    is_crossing: bool
    note: str


class WarningResult(BaseModel):
    result_id: str
    param_version_tag: str
    warning_level: WarningLevel
    threshold_value: float
    average_intensity: float
    max_intensity: float
    formula_used: str
    intensity_unit: str
    boundary_samples: list[BoundarySample] = Field(default_factory=list)
    contributing_materials: list[dict[str, Any]] = Field(default_factory=list)
    computed_at: datetime = Field(default_factory=datetime.now)


class ProcessStep(str, Enum):
    MATERIAL_IMPORT = "材料导入"
    GAP_DETECTION = "采样缺口检测"
    WARNING_CALCULATION = "阈值预警计算"
    RESULT_FORMAT = "结果格式化"


class ProcessRecord(BaseModel):
    step: ProcessStep
    status: ProcessStatus
    started_at: datetime = Field(default_factory=datetime.now)
    finished_at: Optional[datetime] = None
    detail: dict[str, Any] = Field(default_factory=dict)


class ProcessedItem(BaseModel):
    kind: str
    identifier: str
    display_name: str
    status: str
    detail: dict[str, Any] = Field(default_factory=dict)


class PendingItem(BaseModel):
    kind: str
    identifier: str
    reason: str
    required_action: str
    affected_scope: str


class ManualOverride(BaseModel):
    item_ref: str
    original_level: WarningLevel
    overridden_level: WarningLevel
    operator: str
    reason: str
    timestamp: datetime = Field(default_factory=datetime.now)


class InterfaceResponse(BaseModel):
    chain_run_id: str
    overall_status: ProcessStatus
    processed: list[ProcessedItem] = Field(default_factory=list)
    pending_materials: list[PendingItem] = Field(default_factory=list)
    manual_judgments: list[ManualOverride] = Field(default_factory=list)
    warning_result: Optional[WarningResult] = None
    param_version_used: str
    param_version_history: list[str] = Field(default_factory=list)
    sampling_gaps: list[SamplingGap] = Field(default_factory=list)
    generated_at: datetime = Field(default_factory=datetime.now)

    def save_json(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        data = self.model_dump(mode="json")
        path.write_text(
            json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8"
        )

    @classmethod
    def load_json(cls, path: Path) -> "InterfaceResponse":
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        return cls(**data)


class TerminalSummary(BaseModel):
    chain_run_id: str
    step_summary: list[ProcessRecord] = Field(default_factory=list)
    warning_level: Optional[WarningLevel] = None
    material_counts: dict[str, int] = Field(default_factory=dict)
    gap_count: int = 0
    pending_count: int = 0
    processed_count: int = 0
    manual_count: int = 0
    remarks: list[str] = Field(default_factory=list)

    def render(self) -> str:
        lines: list[str] = []
        lines.append("=" * 60)
        lines.append(f"激光散斑阈值预警 处理摘要 [运行ID: {self.chain_run_id}]")
        lines.append("=" * 60)
        for rec in self.step_summary:
            mark = "✓" if rec.status == ProcessStatus.COMPLETED else (
                "⏸" if rec.status == ProcessStatus.GAP_PAUSED else (
                    "⚠" if rec.status == ProcessStatus.NEEDS_CONFIRM else "·"
                )
            )
            lines.append(f"  {mark} {rec.step.value} -> {rec.status.value}")
        lines.append("-" * 60)
        lines.append(f"  预警级别: {self.warning_level.value if self.warning_level else '(未生成)'}")
        lines.append(f"  材料统计: {dict(self.material_counts)}")
        lines.append(f"  已处理: {self.processed_count}  待补材料: {self.pending_count}  人工改判: {self.manual_count}  采样缺口: {self.gap_count}")
        if self.remarks:
            lines.append("  备注:")
            for r in self.remarks:
                lines.append(f"    - {r}")
        lines.append("=" * 60)
        return "\n".join(lines)
