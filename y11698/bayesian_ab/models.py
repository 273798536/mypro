from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator


class VariantData(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    exposures: int = Field(..., ge=0, description="样本量 / 曝光数")
    conversions: int = Field(..., ge=0, description="转化数")
    prior_alpha: float = Field(1.0, gt=0, description="先验 Beta 分布 alpha 参数")
    prior_beta: float = Field(1.0, gt=0, description="先验 Beta 分布 beta 参数")

    @field_validator("conversions")
    @classmethod
    def _conv_le_exp(cls, v: int, info) -> int:
        if v > info.data["exposures"]:
            raise ValueError("conversions 不能大于 exposures")
        return v


class ExperimentSource(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    description: Optional[str] = None
    created_by: Optional[str] = None


class ExperimentCreate(BaseModel):
    source: ExperimentSource
    variants: List[VariantData] = Field(..., min_length=2, max_length=10)
    stop_date: Optional[datetime] = Field(None, description="实验停止日期")
    planned_stop_date: Optional[datetime] = Field(None, description="原定停止日期")
    notes: Optional[str] = None

    @field_validator("variants")
    @classmethod
    def _unique_names(cls, v: List[VariantData]) -> List[VariantData]:
        names = [x.name for x in v]
        if len(names) != len(set(names)):
            raise ValueError("variant 名称必须唯一")
        return v


class AnomalyLevel(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class AnomalyRecord(BaseModel):
    id: str = Field(default_factory=lambda: uuid4().hex[:12])
    code: str = Field(..., description="异常代码")
    level: AnomalyLevel
    message: str = Field(..., description="异常说明")
    detail: dict = Field(default_factory=dict, description="支撑数据")


class PosteriorStats(BaseModel):
    variant: str
    posterior_mean: float
    posterior_median: float
    ci_lower: float = Field(..., description="95% 可信区间下限")
    ci_upper: float = Field(..., description="95% 可信区间上限")
    probability_better_than_baseline: float = Field(..., description="相对于对照的胜率 P(variant > baseline)")
    expected_lift: float = Field(..., description="期望提升率 (variant - baseline) / baseline")
    risk: float = Field(..., description="选错的期望损失")
    sample_size: int
    conversions: int
    observed_rate: float
    prior_alpha: float
    prior_beta: float


class ExperimentResult(BaseModel):
    experiment_id: str
    version: int
    computed_at: datetime
    posterior_stats: List[PosteriorStats]
    win_probability_matrix: dict = Field(default_factory=dict, description="两两胜率矩阵 P(i > j)")
    anomalies: List[AnomalyRecord] = Field(default_factory=list)
    recommended_variant: Optional[str] = None
    recommendation_confidence: Optional[str] = None


class RevisionRecord(BaseModel):
    version: int
    modified_at: datetime
    modified_by: Optional[str]
    change_summary: str
    data_snapshot: dict


class Experiment(BaseModel):
    id: str = Field(default_factory=lambda: uuid4().hex[:12])
    source: ExperimentSource
    variants: List[VariantData]
    stop_date: Optional[datetime] = None
    planned_stop_date: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    current_version: int = Field(1)
    revisions: List[RevisionRecord] = Field(default_factory=list)
    last_result: Optional[ExperimentResult] = None


class ExperimentListResponse(BaseModel):
    id: str
    source_name: str
    variant_count: int
    total_exposures: int
    created_at: datetime
    updated_at: datetime
    current_version: int


class ExperimentUpdate(BaseModel):
    variants: Optional[List[VariantData]] = Field(None, min_length=2)
    stop_date: Optional[datetime] = None
    planned_stop_date: Optional[datetime] = None
    notes: Optional[str] = None
    source: Optional[ExperimentSource] = None
    modified_by: Optional[str] = None
    change_summary: str = Field(..., min_length=1)