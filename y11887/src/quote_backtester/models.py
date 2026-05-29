"""数据模型定义 - 保留所有原始名称便于后续核对"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class RoundingMode(str, Enum):
    """舍入模式枚举"""
    ROUND_HALF_UP = "四舍五入"
    ROUND_DOWN = "向下取整"
    ROUND_UP = "向上取整"
    ROUND_HALF_EVEN = "银行家舍入"
    TRUNCATE = "截断取整"


class QuoteItem(BaseModel):
    """报价单明细 - 保留原始字段名"""
    original_record: Dict[str, Any] = Field(description="原始记录完整数据，便于核对")
    item_name: str = Field(description="产品名称（原始名称）")
    item_code: str = Field(description="产品编码（原始编码）")
    list_price: float = Field(description="标准价/目录价（原始字段）")
    final_price: float = Field(description="客户给的最终报价（原始字段）")
    quantity: int = Field(description="数量", default=1)
    customer_name: str = Field(description="客户名称（原始名称）")
    customer_level_raw: str = Field(description="客户等级原始值")
    salesperson: str = Field(description="销售人员")
    approval_level_raw: Optional[str] = Field(description="审批级别原始值", default=None)
    quoted_discount: Optional[float] = Field(description="报价单上写的折扣率", default=None)
    quote_date: Optional[datetime] = Field(description="报价日期", default=None)
    notes: Optional[str] = Field(description="备注", default=None)

    @property
    def actual_discount_rate(self) -> float:
        """实际折扣率 = 1 - (最终价 / 标准价)"""
        if self.list_price == 0:
            return 0.0
        return 1 - (self.final_price / self.list_price)

    @property
    def actual_discount_pct(self) -> float:
        """实际折扣百分比（如85折返回15）"""
        return round(self.actual_discount_rate * 100, 2)


class DiscountTier(BaseModel):
    """折扣阶梯定义 - 保留原始名称"""
    original_record: Dict[str, Any] = Field(description="原始阶梯配置")
    tier_name: str = Field(description="阶梯名称（原始名称，如'黄金客户档'、'战略客户档'）")
    min_amount: float = Field(description="单笔金额下限（含）")
    max_amount: Optional[float] = Field(description="单笔金额上限（不含，None表示无限大）", default=None)
    discount_rate: float = Field(description="该阶梯折扣率（如0.15表示85折）")
    required_approval_level: str = Field(description="需要的审批级别（原始名称）")
    applicable_customer_levels: List[str] = Field(description="适用客户等级列表（原始名称）")
    is_active: bool = Field(description="是否生效", default=True)

    def matches_amount(self, amount: float) -> bool:
        """检查金额是否落在该阶梯区间"""
        if amount < self.min_amount:
            return False
        if self.max_amount is not None and amount >= self.max_amount:
            return False
        return True

    def matches_customer(self, customer_level_raw: str) -> bool:
        """检查客户等级是否适用"""
        return customer_level_raw in self.applicable_customer_levels


class CustomerLevel(BaseModel):
    """客户等级定义 - 保留原始名称"""
    original_record: Dict[str, Any] = Field(description="原始客户等级配置")
    level_name: str = Field(description="等级名称（原始名称，如'VIP客户'、'普通客户'）")
    level_code: str = Field(description="等级编码（原始编码）")
    base_discount_rate: float = Field(description="基础折扣率")
    max_allowed_discount_rate: float = Field(description="该等级最大允许折扣率")
    description: Optional[str] = Field(description="说明", default=None)


class ApprovalLevel(BaseModel):
    """审批级别定义 - 保留原始名称"""
    original_record: Dict[str, Any] = Field(description="原始审批配置")
    level_name: str = Field(description="审批级别名称（原始名称，如'销售经理'、'总监'、'总经理'）")
    level_order: int = Field(description="审批级别顺序（数字越大级别越高）")
    max_discount_allowed: float = Field(description="该级别最大可批折扣率")
    max_amount_allowed: Optional[float] = Field(description="该级别最大可批金额", default=None)
    approver_title: str = Field(description="审批人职位")

    def can_approve(self, discount_rate: float, amount: float = 0) -> bool:
        """检查该级别是否有权限审批"""
        if discount_rate > self.max_discount_allowed:
            return False
        if self.max_amount_allowed is not None and amount > self.max_amount_allowed:
            return False
        return True


class BacktraceResult(BaseModel):
    """单条记录反推结果"""
    quote_item: QuoteItem
    transaction_amount: float = Field(description="交易金额 = 最终价 * 数量")
    actual_discount_rate: float = Field(description="实际折扣率")
    
    matched_tier: Optional[DiscountTier] = Field(description="匹配到的折扣阶梯", default=None)
    tier_match_confidence: float = Field(description="阶梯匹配置信度 0-1", default=0.0)
    
    applicable_tiers: List[DiscountTier] = Field(description="金额区间内所有适用阶梯", default_factory=list)
    overlapping_tiers: List[List[DiscountTier]] = Field(description="重叠的阶梯组", default_factory=list)
    
    required_approval: Optional[ApprovalLevel] = Field(description="需要的审批级别", default=None)
    actual_approval: Optional[ApprovalLevel] = Field(description="实际使用的审批级别", default=None)
    is_approval_overridden: bool = Field(description="是否越权审批", default=False)
    
    inferred_rounding_mode: Optional[RoundingMode] = Field(description="反推出的舍入模式", default=None)
    rounding_error: float = Field(description="舍入误差金额", default=0.0)
    theoretical_prices: Dict[str, float] = Field(description="各种舍入模式下的理论价格", default_factory=dict)
    
    anomalies: List[str] = Field(description="异常项列表", default_factory=list)
    warnings: List[str] = Field(description="警告项列表", default_factory=list)
    explanations: List[str] = Field(description="解释说明列表", default_factory=list)


class BacktraceSummary(BaseModel):
    """反推汇总结果"""
    total_records: int = 0
    records_with_anomalies: int = 0
    records_with_warnings: int = 0
    records_with_overlapping_tiers: int = 0
    records_with_approval_overrides: int = 0
    records_with_rounding_issues: int = 0
    total_rounding_error_amount: float = 0.0
    overlapping_tier_groups: List[List[DiscountTier]] = Field(default_factory=list)
    run_mode: str = Field(description="运行模式：daily/review")
    run_time: datetime = Field(default_factory=datetime.now)
