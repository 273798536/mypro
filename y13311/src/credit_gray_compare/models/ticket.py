"""线上工单与工单备注模型。"""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class WorkOrderRemark(BaseModel):
    """工单备注。"""

    remark_id: str = Field(..., description="备注ID")
    author: str = Field(..., description="作者")
    content: str = Field(..., description="备注内容")
    created_at: datetime = Field(default_factory=datetime.now, description="创建时间")


class WorkOrder(BaseModel):
    """线上工单。"""

    ticket_id: str = Field(..., description="工单ID")
    title: str = Field(..., description="工单标题")
    related_sample_ids: List[str] = Field(default_factory=list, description="关联样本ID")
    related_model_version_id: Optional[str] = Field(None, description="关联模型版本")
    related_threshold_version_id: Optional[str] = Field(None, description="关联阈值版本")
    status: str = Field(default="open", description="工单状态")
    assignee: Optional[str] = Field(None, description="处理人")
    remarks: List[WorkOrderRemark] = Field(default_factory=list, description="备注列表")
    created_at: datetime = Field(default_factory=datetime.now, description="创建时间")
    updated_at: datetime = Field(default_factory=datetime.now, description="更新时间")

    def add_remark(self, author: str, content: str) -> WorkOrderRemark:
        remark = WorkOrderRemark(author=author, content=content)
        self.remarks.append(remark)
        self.updated_at = remark.created_at
        return remark
