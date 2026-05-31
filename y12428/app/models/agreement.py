from __future__ import annotations
from enum import Enum
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class AgreementStatus(str, Enum):
    ACTIVE = "active"
    SUPERSEDED = "superseded"
    DRAFT = "draft"


class FeeRule(BaseModel):
    fee_type: str = Field(description="credit_fee | resource_fee | dropout_fee")
    payer_school_id: str = Field(description="付费方学校ID")
    payee_school_id: str = Field(description="收款方学校ID")
    ratio: float = Field(ge=0, le=1, description="分摊比例 0~1")
    per_unit_price: Optional[float] = Field(default=None, description="单价(学分费按学分计)")
    fixed_amount: Optional[float] = Field(default=None, description="固定金额")


class Agreement(BaseModel):
    id: str = Field(description="协议唯一ID")
    version: int = Field(description="协议版本号")
    school_ids: List[str] = Field(description="签约学校ID列表")
    status: AgreementStatus = Field(default=AgreementStatus.DRAFT)
    fee_rules: List[FeeRule] = Field(description="费用拆分规则")
    effective_from: datetime = Field(description="生效时间")
    effective_to: Optional[datetime] = Field(default=None, description="失效时间(空=长期有效)")
    dropout_deadline: Optional[datetime] = Field(default=None, description="退课截止日期(超过此日期退课不予退费)")
    created_at: datetime = Field(default_factory=datetime.now)
    superseded_by: Optional[str] = Field(default=None, description="被哪个协议版本替代")


class AgreementCreate(BaseModel):
    school_ids: List[str]
    fee_rules: List[FeeRule]
    effective_from: datetime
    effective_to: Optional[datetime] = None
    dropout_deadline: Optional[datetime] = None
