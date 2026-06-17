"""人工修正模型。"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class CorrectionStatus(str, Enum):
    """人工修正状态。"""

    PENDING = "pending"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"


class ManualCorrection(BaseModel):
    """单条人工修正记录。"""

    correction_id: str = Field(..., description="修正记录唯一ID")
    sample_id: str = Field(..., description="被修正的样本ID")
    original_decision: str = Field(..., description="原始机器决策")
    original_score: Optional[float] = Field(None, description="原始机器评分")
    corrected_decision: str = Field(..., description="人工修正后决策")
    corrected_score: Optional[float] = Field(None, description="人工修正后评分")
    operator: str = Field(..., description="操作人")
    reason: str = Field(default="", description="修正原因")
    status: CorrectionStatus = Field(default=CorrectionStatus.PENDING, description="修正状态")
    created_at: datetime = Field(default_factory=datetime.now, description="创建时间")
    confirmed_at: Optional[datetime] = Field(None, description="确认时间")
    confirmed_by: Optional[str] = Field(None, description="确认人")

    @property
    def is_changed(self) -> bool:
        return self.original_decision != self.corrected_decision or (
            self.original_score is not None
            and self.corrected_score is not None
            and self.original_score != self.corrected_score
        )
