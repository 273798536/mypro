from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List, Dict
from enum import Enum
from pydantic import BaseModel, Field, field_validator


class AnchorStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class TransactionType(str, Enum):
    REWARD = "reward"
    REFUND = "refund"


class Anchor(BaseModel):
    anchor_id: str = Field(..., description="主播唯一ID")
    anchor_name: str = Field(..., description="主播姓名/昵称")
    union_id: Optional[str] = Field(None, description="所属工会ID")
    id_card: str = Field(..., description="身份证号（脱敏）")
    bank_card: str = Field(..., description="银行卡号（脱敏）")
    status: AnchorStatus = Field(AnchorStatus.ACTIVE)
    sign_date: date = Field(..., description="签约日期")
    remark: Optional[str] = None

    source_file: str = Field(..., description="来源文件名")
    source_line: int = Field(..., description="来源文件行号")


class TaxRate(BaseModel):
    tax_type: str = Field(..., description="税种名称")
    tax_code: str = Field(..., description="税种编码")
    rate: Decimal = Field(..., description="税率")
    effective_start: date = Field(..., description="生效开始日期")
    effective_end: Optional[date] = Field(None, description="生效结束日期，None表示永久有效")
    taxable_item: str = Field(..., description="应税项目")
    deduction_threshold: Optional[Decimal] = Field(Decimal("0"), description="起征点")
    quick_calculation_deduction: Optional[Decimal] = Field(Decimal("0"), description="速算扣除数")

    source_file: str = Field(..., description="来源文件名")
    source_line: int = Field(..., description="来源文件行号")


class UnionAgreement(BaseModel):
    agreement_id: str = Field(..., description="协议ID")
    union_id: str = Field(..., description="工会ID")
    union_name: str = Field(..., description="工会名称")
    anchor_id: str = Field(..., description="主播ID")
    platform_share_rate: Decimal = Field(..., description="平台分成比例")
    union_share_rate: Decimal = Field(..., description="工会分成比例")
    anchor_share_rate: Decimal = Field(..., description="主播分成比例")
    effective_start: date = Field(..., description="协议生效开始日期")
    effective_end: Optional[date] = Field(None, description="协议生效结束日期")

    source_file: str = Field(..., description="来源文件名")
    source_line: int = Field(..., description="来源文件行号")


class RewardTransaction(BaseModel):
    transaction_id: str = Field(..., description="交易ID")
    anchor_id: str = Field(..., description="主播ID")
    transaction_type: TransactionType = Field(..., description="交易类型")
    amount: Decimal = Field(..., description="金额")
    transaction_date: datetime = Field(..., description="交易时间")
    settle_month: str = Field(..., description="结算月份 YYYY-MM")
    gift_name: Optional[str] = Field(None, description="礼物名称")
    viewer_id: Optional[str] = Field(None, description="观众ID")
    related_transaction_id: Optional[str] = Field(None, description="关联交易ID（退款关联原打赏")
    remark: Optional[str] = None

    source_file: str = Field(..., description="来源文件名")
    source_line: int = Field(..., description="来源文件行号")

    @field_validator("settle_month")
    @classmethod
    def validate_settle_month(cls, v: str) -> str:
        try:
            datetime.strptime(v, "%Y-%m")
            return v
        except ValueError:
            raise ValueError(f"结算月份格式错误，应为YYYY-MM格式")


class SplitResult(BaseModel):
    transaction_id: str
    anchor_id: str
    anchor_name: str
    transaction_date: datetime
    transaction_type: TransactionType
    original_amount: Decimal
    settle_month: str

    platform_amount: Decimal = Decimal("0")
    union_amount: Decimal = Decimal("0")
    anchor_gross_amount: Decimal = Decimal("0")

    tax_details: Dict[str, Decimal] = Field(default_factory=dict)
    total_tax: Decimal = Decimal("0")
    anchor_net_amount: Decimal = Decimal("0")

    is_cross_month_refund: bool = False
    tax_rate_switched: bool = False
    warnings: List[str] = Field(default_factory=list)
    agreement_snapshot_id: str

    agreement: dict = Field(default_factory=dict)


class Snapshot(BaseModel):
    snapshot_id: str
    batch_id: str
    created_at: datetime
    anchor_count: int
    transaction_count: int
    agreement_count: int
    tax_rate_count: int
    input_files_hash: str
    agreements: List[dict]
    tax_rates: List[dict]

    @field_validator("snapshot_id")
    @classmethod
    def validate_snapshot_id(cls, v: str) -> str:
        return v
