"""数据模型层 - 债券、收益率曲线、组合、来源追踪"""
from __future__ import annotations

import uuid
from datetime import date, datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, validator


class CouponType(str, Enum):
    FIXED = "fixed"
    FLOATING = "floating"
    ZERO = "zero"


class EmbeddedOptionType(str, Enum):
    NONE = "none"
    CALLABLE = "callable"
    PUTTABLE = "puttable"
    CONVERTIBLE = "convertible"


class Rating(str, Enum):
    AAA = "AAA"
    AA_PLUS = "AA+"
    AA = "AA"
    AA_MINUS = "AA-"
    A_PLUS = "A+"
    A = "A"
    A_MINUS = "A-"
    BBB_PLUS = "BBB+"
    BBB = "BBB"
    BBB_MINUS = "BBB-"
    BB_PLUS = "BB+"
    BB = "BB"
    BB_MINUS = "BB-"
    B_PLUS = "B+"
    B = "B"
    B_MINUS = "B-"
    CCC = "CCC"
    CC = "CC"
    C = "C"
    D = "D"


RATING_SCORE = {
    Rating.AAA: 21, Rating.AA_PLUS: 20, Rating.AA: 19, Rating.AA_MINUS: 18,
    Rating.A_PLUS: 17, Rating.A: 16, Rating.A_MINUS: 15,
    Rating.BBB_PLUS: 14, Rating.BBB: 13, Rating.BBB_MINUS: 12,
    Rating.BB_PLUS: 11, Rating.BB: 10, Rating.BB_MINUS: 9,
    Rating.B_PLUS: 8, Rating.B: 7, Rating.B_MINUS: 6,
    Rating.CCC: 5, Rating.CC: 4, Rating.C: 3, Rating.D: 0,
}


class Bond(BaseModel):
    """单只债券数据"""
    bond_id: str = Field(..., description="债券代码")
    name: str = Field(..., description="债券名称")
    issuer: str = Field(default="", description="发行人")
    face_value: float = Field(100.0, gt=0, description="面值")
    coupon_rate: float = Field(..., ge=0, description="票息率(年化,小数)")
    coupon_type: CouponType = Field(CouponType.FIXED, description="票息类型")
    coupon_frequency: int = Field(1, ge=1, le=12, description="每年付息次数")
    issue_date: date = Field(..., description="发行日期")
    maturity_date: date = Field(..., description="到期日期")
    embedded_option: EmbeddedOptionType = Field(EmbeddedOptionType.NONE, description="嵌入期权类型")
    call_date: Optional[date] = Field(None, description="可赎回日期(如有)")
    put_date: Optional[date] = Field(None, description="可回售日期(如有)")
    rating: Rating = Field(Rating.AAA, description="评级")
    position: float = Field(..., description="持仓面值(元)")
    market_price: Optional[float] = Field(None, gt=0, description="市场净价(元/百元面值)")

    @validator("maturity_date")
    @classmethod
    def maturity_after_issue(cls, v: date, values) -> date:
        if "issue_date" in values and v <= values["issue_date"]:
            raise ValueError("到期日必须晚于发行日")
        return v

    class Config:
        frozen = False


class YieldCurvePoint(BaseModel):
    """收益率曲线上的单点"""
    tenor: str = Field(..., description="期限标识,如'3M','1Y','5Y'")
    days: int = Field(..., gt=0, description="期限天数")
    yield_rate: float = Field(..., description="收益率(小数)")

    class Config:
        frozen = True


class YieldCurve(BaseModel):
    """收益率曲线"""
    curve_id: str = Field(default_factory=lambda: f"YC-{uuid.uuid4().hex[:8]}")
    name: str = Field(..., description="曲线名称")
    currency: str = Field("CNY", description="货币")
    as_of_date: date = Field(..., description="曲线日期")
    points: list[YieldCurvePoint] = Field(..., min_length=2, description="曲线点")

    @validator("points")
    @classmethod
    def points_sorted(cls, v: list[YieldCurvePoint]) -> list[YieldCurvePoint]:
        return sorted(v, key=lambda p: p.days)

    class Config:
        frozen = True


class CashFlow(BaseModel):
    """现金流记录"""
    bond_id: str
    pay_date: date
    amount: float
    cf_type: str = Field("coupon", description="coupon/principal/redemption")


class SourceInfo(BaseModel):
    """数据来源信息"""
    source_id: str = Field(default_factory=lambda: f"SRC-{uuid.uuid4().hex[:8]}")
    source_name: str = Field(..., description="来源名称")
    source_type: str = Field(..., description="文件/系统/手动")
    imported_at: datetime = Field(default_factory=datetime.now)
    description: str = Field("", description="备注")
    version: int = Field(1, ge=1, description="版本号")

    class Config:
        frozen = True


class CorrectionRecord(BaseModel):
    """修正记录 - 保留每次修正的痕迹"""
    correction_id: str = Field(default_factory=lambda: f"COR-{uuid.uuid4().hex[:8]}")
    target: str = Field(..., description="修正对象(债券ID/曲线ID等)")
    field: str = Field(..., description="修正字段")
    old_value: str = Field(..., description="原值")
    new_value: str = Field(..., description="新值")
    reason: str = Field(..., description="修正原因")
    corrected_by: str = Field("analyst", description="修正人")
    corrected_at: datetime = Field(default_factory=datetime.now)

    class Config:
        frozen = True


class BondMetrics(BaseModel):
    """单只债券的计算结果"""
    bond_id: str
    ytm: Optional[float] = None
    modified_duration: Optional[float] = None
    macaulay_duration: Optional[float] = None
    convexity: Optional[float] = None
    dv01: Optional[float] = None
    present_value: Optional[float] = None
    accrued_interest: Optional[float] = None
    dirty_price: Optional[float] = None
    effective_duration: Optional[float] = None
    key_rate_durations: dict[str, float] = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)


class PortfolioSummary(BaseModel):
    """组合汇总"""
    total_pv: float = 0.0
    total_dv01: float = 0.0
    weighted_duration: float = 0.0
    weighted_convexity: float = 0.0
    contribution_by_bond: dict[str, float] = Field(default_factory=dict)
    worst_contributors: list[dict] = Field(default_factory=list)


class AnalysisResult(BaseModel):
    """完整分析结果"""
    result_id: str = Field(default_factory=lambda: f"RES-{uuid.uuid4().hex[:8]}")
    created_at: datetime = Field(default_factory=datetime.now)
    curve_id: str = ""
    scenario_name: str = "base"
    bond_metrics: dict[str, BondMetrics] = Field(default_factory=dict)
    portfolio: PortfolioSummary = Field(default_factory=PortfolioSummary)
    anomalies: list[dict] = Field(default_factory=list)
    corrections_applied: list[str] = Field(default_factory=list)


class ScenarioConfig(BaseModel):
    """情景配置"""
    name: str = Field(..., description="情景名称")
    shift_bp: float = Field(0.0, description="平行移动(bp)")
    twist_short_bp: float = Field(0.0, description="短端变动(bp)")
    twist_long_bp: float = Field(0.0, description="长端变动(bp)")
    pivot_tenor: str = Field("5Y", description="扭曲枢轴期限")
