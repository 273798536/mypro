from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any

from pydantic import BaseModel, Field, field_validator


class ConclusionStatus(str, Enum):
    """结论状态：可直接使用 / 需要药化研究员复核."""
    DIRECT_USE = "direct_use"
    NEEDS_REVIEW = "needs_review"


class ConsistencyStatus(str, Enum):
    """批次报告与结论的一致性状态."""
    CONSISTENT = "consistent"
    INCONSISTENT = "inconsistent"
    UNKNOWN = "unknown"


class RetestReason(str, Enum):
    """建议复测的原因."""
    TEMP_OUT_OF_RANGE = "temperature_out_of_range"
    CONCENTRATION_ANOMALY = "concentration_anomaly"
    MISSING_WEIGHING_RECORD = "missing_weighing_record"
    CONDITION_CONCLUSION_MISMATCH = "condition_conclusion_mismatch"
    SOURCE_MATERIAL_CHANGED = "source_material_changed"


class Material(BaseModel):
    """原料/来源材料."""
    material_id: str = Field(..., description="材料编号，如 RM-2024-001")
    name: str = Field(..., description="材料名称")
    lot_no: str = Field(..., description="批号")
    supplier: Optional[str] = Field(None, description="供应商")
    received_date: Optional[datetime] = Field(None, description="入库日期")


class WeighingRecord(BaseModel):
    """称量单记录."""
    record_id: str = Field(..., description="称量单编号，如 W-20240115-003")
    material_id: str = Field(..., description="对应材料编号")
    weighed_mass_g: float = Field(..., description="称样量 (g)", gt=0)
    operator: Optional[str] = Field(None, description="称量人")
    timestamp: Optional[datetime] = Field(None, description="称量时间")


class TempPoint(BaseModel):
    """温控采样点."""
    elapsed_min: float = Field(..., description="反应进行时间 (分钟)", ge=0)
    temperature_c: float = Field(..., description="温度 (°C)")


class TempProfile(BaseModel):
    """温控曲线."""
    target_temp_c: float = Field(..., description="目标反应温度 (°C)")
    tolerance_plus_c: float = Field(2.0, description="允许正偏差 (°C)")
    tolerance_minus_c: float = Field(2.0, description="允许负偏差 (°C)")
    points: List[TempPoint] = Field(default_factory=list)

    def all_within_range(self) -> bool:
        """检查所有采样点是否在允许范围内."""
        if not self.points:
            return False
        hi = self.target_temp_c + self.tolerance_plus_c
        lo = self.target_temp_c - self.tolerance_minus_c
        return all(lo <= p.temperature_c <= hi for p in self.points)

    def out_of_range_points(self) -> List[TempPoint]:
        """返回所有超温采样点."""
        if not self.points:
            return []
        hi = self.target_temp_c + self.tolerance_plus_c
        lo = self.target_temp_c - self.tolerance_minus_c
        return [p for p in self.points if not (lo <= p.temperature_c <= hi)]


class ConcentrationData(BaseModel):
    """浓度检测数据，支持多种单位自动换算."""
    value: float = Field(..., description="浓度数值")
    unit: str = Field(..., description="单位: mg/mL, g/L, mol/L, w/w%, w/v%")
    molecular_weight_g_mol: Optional[float] = Field(None, description="分子量，mol/L 换算时需要")
    density_g_mL: Optional[float] = Field(None, description="溶液密度，w/w% 与 w/v% 换算时需要")

    @field_validator("unit")
    @classmethod
    def _validate_unit(cls, v: str) -> str:
        allowed = {"mg/mL", "g/L", "mol/L", "w/w%", "w/v%"}
        if v not in allowed:
            raise ValueError(f"不支持的浓度单位: {v}. 支持: {sorted(allowed)}")
        return v

    def to(self, target_unit: str) -> "ConcentrationData":
        """换算到目标单位，返回新的 ConcentrationData."""
        if target_unit == self.unit:
            return self
        base_mg_per_ml = self._to_mg_per_ml()
        return self._from_mg_per_ml(base_mg_per_ml, target_unit)

    def _to_mg_per_ml(self) -> float:
        v = self.value
        if self.unit == "mg/mL":
            return v
        if self.unit == "g/L":
            return v  # 1 g/L = 1 mg/mL
        if self.unit == "mol/L":
            if not self.molecular_weight_g_mol:
                raise ValueError("mol/L 换算需要提供 molecular_weight_g_mol (分子量)")
            return v * self.molecular_weight_g_mol
        if self.unit == "w/v%":
            return v * 10  # 1% w/v = 10 mg/mL
        if self.unit == "w/w%":
            if not self.density_g_mL:
                raise ValueError("w/w% 换算需要提供 density_g_mL (溶液密度 g/mL)")
            return v * 10 * self.density_g_mL
        raise ValueError(f"未知单位: {self.unit}")

    def _from_mg_per_ml(self, mg_per_ml: float, target_unit: str) -> "ConcentrationData":
        if target_unit == "mg/mL":
            val = mg_per_ml
        elif target_unit == "g/L":
            val = mg_per_ml
        elif target_unit == "mol/L":
            if not self.molecular_weight_g_mol:
                raise ValueError("mol/L 换算需要提供 molecular_weight_g_mol")
            val = mg_per_ml / self.molecular_weight_g_mol
        elif target_unit == "w/v%":
            val = mg_per_ml / 10
        elif target_unit == "w/w%":
            if not self.density_g_mL:
                raise ValueError("w/w% 换算需要提供 density_g_mL")
            val = mg_per_ml / 10 / self.density_g_mL
        else:
            raise ValueError(f"不支持的目标单位: {target_unit}")
        return ConcentrationData(
            value=round(val, 6),
            unit=target_unit,
            molecular_weight_g_mol=self.molecular_weight_g_mol,
            density_g_mL=self.density_g_mL,
        )


class ReactionCondition(BaseModel):
    """反应条件."""
    target_temp_c: float = Field(..., description="目标温度 (°C)")
    reaction_time_min: float = Field(..., description="反应时长 (分钟)")
    initiator_type: Optional[str] = Field(None, description="引发剂类型")
    solvent: Optional[str] = Field(None, description="溶剂")
    remarks: Optional[str] = Field(None, description="备注")


class BatchConclusion(BaseModel):
    """批次结论（报告上的结论）."""
    passed: bool = Field(..., description="是否通过")
    summary: str = Field(..., description="结论摘要，如 '反应温度正常，浓度合格'")
    reviewer: Optional[str] = Field(None, description="复核人")
    reviewed_at: Optional[datetime] = Field(None, description="复核时间")
    needs_retest: bool = Field(False, description="是否建议复测")


class RetestSuggestion(BaseModel):
    """复测建议."""
    need_retest: bool = Field(..., description="是否建议复测")
    reasons: List[RetestReason] = Field(default_factory=list)
    description: str = Field("", description="详细说明")
    priority: str = Field("normal", description="优先级: low/normal/high")


class MaterialTrace(BaseModel):
    """批次溯源：结论关联到来源材料."""
    batch_id: str
    source_materials: List[Material] = Field(default_factory=list)
    weighing_records: List[WeighingRecord] = Field(default_factory=list)
    missing_weighing_record_ids: List[str] = Field(default_factory=list)


class BatchReport(BaseModel):
    """批次报告 - 核心数据模型."""
    batch_id: str = Field(..., description="批次编号，如 B-20240610-01")
    product_name: str = Field(..., description="产品名称")
    report_version: int = Field(1, description="报告版本号，用于检测报告变更")
    reaction_condition: ReactionCondition
    temperature_profile: Optional[TempProfile] = Field(None)
    concentration: Optional[ConcentrationData] = Field(None)
    conclusion: BatchConclusion
    source_material_ids: List[str] = Field(default_factory=list, description="来源材料编号列表")
    weighing_record_ids: List[str] = Field(default_factory=list, description="称量单编号列表")
    generated_at: Optional[datetime] = Field(None)
    updated_at: Optional[datetime] = Field(None)


class BatchReviewResult(BaseModel):
    """单个批次的复盘结果."""
    batch_id: str
    conclusion_status: ConclusionStatus
    consistency_status: ConsistencyStatus
    retest: RetestSuggestion
    trace: MaterialTrace
    concentration_normalized: Optional[ConcentrationData] = Field(None)
    condition_changed: bool = Field(False, description="反应条件相对上一版是否变更")
    conclusion_needs_update: bool = Field(False, description="结论是否需要同步更新")
    issues: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    review_time: datetime = Field(default_factory=datetime.now)


class ReviewSummary(BaseModel):
    """整批评复的总览摘要 - 保证与导出文件一致."""
    total_batches: int = 0
    direct_use_count: int = 0
    needs_review_count: int = 0
    consistent_count: int = 0
    inconsistent_count: int = 0
    retest_count: int = 0
    missing_inputs: List[str] = Field(default_factory=list)
    generated_at: datetime = Field(default_factory=datetime.now)
