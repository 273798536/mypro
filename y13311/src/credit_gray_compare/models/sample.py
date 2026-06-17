"""样本与样本集模型。"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


class Sample(BaseModel):
    """单个评分样本。"""

    sample_id: str = Field(..., description="样本唯一ID")
    user_id: str = Field(..., description="用户ID")
    features: Dict[str, Any] = Field(default_factory=dict, description="样本特征")
    label: Optional[int] = Field(None, description="真实标签（0=好，1=坏）")
    created_at: datetime = Field(default_factory=datetime.now, description="样本创建时间")
    source: str = Field(default="unknown", description="样本来源渠道")
    tags: List[str] = Field(default_factory=list, description="样本标签")

    @field_validator("label")
    @classmethod
    def _validate_label(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v not in (0, 1):
            raise ValueError("label 必须为 0（好）或 1（坏）")
        return v


class SampleSet(BaseModel):
    """样本集：一次评测使用的样本集合。"""

    set_id: str = Field(..., description="样本集唯一ID")
    name: str = Field(..., description="样本集名称")
    samples: List[Sample] = Field(default_factory=list, description="样本列表")
    description: str = Field(default="", description="样本集描述")
    created_at: datetime = Field(default_factory=datetime.now, description="创建时间")

    @property
    def size(self) -> int:
        return len(self.samples)

    @property
    def labeled_count(self) -> int:
        return sum(1 for s in self.samples if s.label is not None)

    @property
    def bad_rate(self) -> Optional[float]:
        labeled = [s for s in self.samples if s.label is not None]
        if not labeled:
            return None
        return sum(s.label for s in labeled) / len(labeled)

    def sample_ids(self) -> set[str]:
        return {s.sample_id for s in self.samples}
