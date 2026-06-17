"""模型版本与阈值版本模型。"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ModelVersion(BaseModel):
    """评分模型版本。"""

    version_id: str = Field(..., description="模型版本ID")
    name: str = Field(..., description="模型名称")
    algorithm: str = Field(default="unknown", description="算法类型")
    features: List[str] = Field(default_factory=list, description="使用的特征列表")
    train_date: Optional[datetime] = Field(None, description="训练时间")
    meta: Dict[str, Any] = Field(default_factory=dict, description="其他元信息")
    created_at: datetime = Field(default_factory=datetime.now, description="版本创建时间")


class ThresholdVersion(BaseModel):
    """评分阈值版本。"""

    version_id: str = Field(..., description="阈值版本ID")
    model_version_id: str = Field(..., description="关联的模型版本ID")
    thresholds: Dict[str, float] = Field(
        default_factory=dict,
        description="各决策档位的阈值，例如 {'pass': 0.8, 'reject': 0.3}",
    )
    description: str = Field(default="", description="阈值调整说明")
    effective_at: datetime = Field(default_factory=datetime.now, description="生效时间")
    created_at: datetime = Field(default_factory=datetime.now, description="版本创建时间")

    def decision(self, score: float) -> str:
        """根据分数返回决策档位。"""
        pass_score = self.thresholds.get("pass", 0.8)
        reject_score = self.thresholds.get("reject", 0.3)
        if score >= pass_score:
            return "pass"
        if score <= reject_score:
            return "reject"
        return "review"
