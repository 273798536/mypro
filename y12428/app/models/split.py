from __future__ import annotations
from enum import Enum
from datetime import datetime
from typing import List
from pydantic import BaseModel, Field


class SplitStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    DISPUTED = "disputed"
    SETTLED = "settled"


class SplitItem(BaseModel):
    school_id: str = Field(description="学校ID")
    role: str = Field(description="home_school | host_school | third_party")
    fee_type: str = Field(description="credit_fee | resource_fee | dropout_fee")
    amount: float = Field(description="金额")
    direction: str = Field(description="pay | receive")
    rule_source: str = Field(description="依据的协议ID:版本")


class SplitDetail(BaseModel):
    id: str = Field(description="分账明细唯一ID")
    enrollment_id: str = Field(description="关联选课记录ID")
    agreement_id: str = Field(description="关联协议ID")
    agreement_version: int = Field(description="关联协议版本号")
    items: List[SplitItem] = Field(description="各校分摊明细")
    total_amount: float = Field(description="总金额")
    status: SplitStatus = Field(default=SplitStatus.PENDING)
    evidence_gaps: List[str] = Field(default_factory=list, description="证据缺口列表")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
