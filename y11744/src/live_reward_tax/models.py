"""核心数据模型"""
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator, ConfigDict


class SourceTrace(BaseModel):
    """来源痕迹"""
    source_file: str
    line_number: Optional[int] = None
    sheet_name: Optional[str] = None
    raw_data: Dict[str, Any] = Field(default_factory=dict)
    loaded_at: datetime = Field(default_factory=datetime.now)
    modified: bool = False
    modified_by: Optional[str] = None
    modified_at: Optional[datetime] = None
    note: Optional[str] = None


class Streamer(BaseModel):
    """主播账号信息"""
    model_config = ConfigDict(arbitrary_types_allowed=True)
    
    streamer_id: str
    name: str
    id_card: Optional[str] = None
    bank_account: Optional[str] = None
    contract_start: Optional[date] = None
    contract_end: Optional[date] = None
    tax_type: str = Field(default="individual", description="纳税类型: individual(个人) / company(公司)")
    status: str = Field(default="active")
    _source: Optional[SourceTrace] = None


class RewardRecord(BaseModel):
    """打赏流水记录"""
    model_config = ConfigDict(arbitrary_types_allowed=True)
    
    reward_id: str
    streamer_id: str
    reward_time: datetime
    amount: Decimal
    gift_name: Optional[str] = None
    sender_id: Optional[str] = None
    room_id: Optional[str] = None
    settlement_period: str
    is_refunded: bool = False
    refund_id: Optional[str] = None
    _source: Optional[SourceTrace] = None

    @field_validator('amount')
    @classmethod
    def amount_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError(f"打赏金额必须为正数: {v}")
        return v


class PlatformShareVersion(BaseModel):
    """平台分成比例版本"""
    model_config = ConfigDict(arbitrary_types_allowed=True)
    
    version_id: str
    version_name: str
    effective_date: date
    expire_date: Optional[date] = None
    platform_ratio: Decimal
    streamer_ratio: Decimal
    guild_ratio: Decimal = Field(default=Decimal('0'))
    description: Optional[str] = None
    _source: Optional[SourceTrace] = None

    @field_validator('platform_ratio', 'streamer_ratio', 'guild_ratio')
    @classmethod
    def ratio_must_be_valid(cls, v):
        if v < 0 or v > 1:
            raise ValueError(f"分成比例必须在0-1之间: {v}")
        return v


class RefundRecord(BaseModel):
    """退款记录"""
    model_config = ConfigDict(arbitrary_types_allowed=True)
    
    refund_id: str
    reward_id: str
    streamer_id: str
    refund_time: datetime
    refund_amount: Decimal
    reason: Optional[str] = None
    original_settlement_period: str
    refund_processed_period: Optional[str] = None
    is_cross_period: bool = False
    _source: Optional[SourceTrace] = None

    @field_validator('refund_amount')
    @classmethod
    def refund_amount_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError(f"退款金额必须为正数: {v}")
        return v


class TaxRule(BaseModel):
    """税率规则"""
    model_config = ConfigDict(arbitrary_types_allowed=True)
    
    rule_id: str
    tax_type: str
    income_min: Decimal
    income_max: Optional[Decimal] = None
    tax_rate: Decimal
    quick_deduction: Decimal = Field(default=Decimal('0'))
    effective_date: date
    expire_date: Optional[date] = None
    description: Optional[str] = None
    _source: Optional[SourceTrace] = None

    @field_validator('tax_rate')
    @classmethod
    def tax_rate_must_be_valid(cls, v):
        if v < 0 or v > 1:
            raise ValueError(f"税率必须在0-1之间: {v}")
        return v


class SettlementDetail(BaseModel):
    """结算明细"""
    model_config = ConfigDict(arbitrary_types_allowed=True)
    
    streamer_id: str
    streamer_name: str
    settlement_period: str
    total_rewards: Decimal = Field(default=Decimal('0'))
    refund_amount: Decimal = Field(default=Decimal('0'))
    net_rewards: Decimal = Field(default=Decimal('0'))
    platform_share: Decimal = Field(default=Decimal('0'))
    guild_share: Decimal = Field(default=Decimal('0'))
    streamer_gross: Decimal = Field(default=Decimal('0'))
    tax_amount: Decimal = Field(default=Decimal('0'))
    streamer_net: Decimal = Field(default=Decimal('0'))
    share_version: Optional[str] = None
    tax_rule_used: Optional[str] = None
    warnings: List[str] = Field(default_factory=list)
    cross_period_refunds: List[str] = Field(default_factory=list)
    reward_count: int = 0
    refund_count: int = 0


class SettlementReport(BaseModel):
    """结算报告"""
    report_id: str
    generated_at: datetime
    settlement_period: str
    total_streamers: int = 0
    total_rewards: Decimal = Field(default=Decimal('0'))
    total_refunds: Decimal = Field(default=Decimal('0'))
    total_tax: Decimal = Field(default=Decimal('0'))
    total_streamer_net: Decimal = Field(default=Decimal('0'))
    details: List[SettlementDetail] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)
