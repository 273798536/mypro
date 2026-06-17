"""评测历史与决策变化模型。"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class DecisionChange(BaseModel):
    """单个样本的决策变化记录。"""

    sample_id: str = Field(..., description="样本ID")
    before_decision: Optional[str] = Field(None, description="变化前决策")
    before_score: Optional[float] = Field(None, description="变化前评分")
    after_decision: str = Field(..., description="变化后决策")
    after_score: Optional[float] = Field(None, description="变化后评分")
    change_type: str = Field(
        ...,
        description="变化来源：sample=样本变化, threshold=阈值变化, manual=人工改判",
    )
    reason: str = Field(default="", description="变化原因说明")


class EvaluationRecord(BaseModel):
    """单次评测记录。"""

    record_id: str = Field(..., description="评测记录ID")
    sample_set_id: str = Field(..., description="样本集ID")
    model_version_id: str = Field(..., description="模型版本ID")
    threshold_version_id: str = Field(..., description="阈值版本ID")
    metrics: Dict[str, Any] = Field(default_factory=dict, description="评测指标")
    decision_changes: List[DecisionChange] = Field(default_factory=list, description="决策变化列表")
    operator: str = Field(..., description="操作人")
    memo: str = Field(default="", description="备注")
    created_at: datetime = Field(default_factory=datetime.now, description="评测时间")


class EvaluationHistory(BaseModel):
    """评测历史集合。"""

    records: List[EvaluationRecord] = Field(default_factory=list, description="评测记录列表")

    def add(self, record: EvaluationRecord) -> None:
        self.records.append(record)

    def find_by_sample_set(self, sample_set_id: str) -> List[EvaluationRecord]:
        return [r for r in self.records if r.sample_set_id == sample_set_id]

    def changes_for_sample(self, sample_id: str) -> List[DecisionChange]:
        changes: List[DecisionChange] = []
        for record in self.records:
            for c in record.decision_changes:
                if c.sample_id == sample_id:
                    changes.append(c)
        return changes
