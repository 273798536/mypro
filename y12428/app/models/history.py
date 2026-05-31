from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class HistoryEntry(BaseModel):
    id: str = Field(description="历史条目ID")
    entity_type: str = Field(description="enrollment | agreement | split | dropout")
    entity_id: str = Field(description="关联实体ID")
    action: str = Field(description="create | update | status_change | split_trigger | dropout_audit")
    before: Optional[dict] = Field(default=None, description="变更前快照")
    after: Optional[dict] = Field(default=None, description="变更后快照")
    operator: str = Field(default="system", description="操作人")
    timestamp: datetime = Field(default_factory=datetime.now)
    remark: Optional[str] = Field(default=None, description="备注")
