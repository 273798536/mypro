from __future__ import annotations

from enum import Enum
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class RecordStatus(str, Enum):
    CREATED = "新建"
    PENDING_CONFIRM = "待确认"
    CONFIRMED = "已确认"
    REJECTED = "退回"


class RecordSource(str, Enum):
    NORMAL = "正常导入"
    OLD_VERSION = "旧版记录"
    ON_SITE_SUPPLEMENT = "现场补充"


class ExtrapolationAlert(str, Enum):
    NONE = "无"
    SINGLE_OUT_OF_BOUND = "单条越界"
    CONSECUTIVE_OUT_OF_BOUND = "连续越界-疑似上游材料问题"


class BoundaryCondition(BaseModel):
    symbol: str = Field(description="题目中的符号，如 dy/dx, y', Dxy 等")
    equation_text: str = Field(description="原始题目文本")
    valid_range: Optional[str] = Field(default=None, description="有效范围，如 'x > 0'")
    note: str = Field(default="", description="边界条件说明，与记录共存，换人接手也能看懂")


class StatusTransitionError(Exception):
    def __init__(self, record_id: str, from_status: RecordStatus, to_status: RecordStatus, reason: str):
        self.record_id = record_id
        self.from_status = from_status
        self.to_status = to_status
        self.reason = reason
        super().__init__(
            f"记录 {record_id} 无法从 {from_status.value} 转为 {to_status.value}：{reason}"
        )


class Record(BaseModel):
    id: str
    status: RecordStatus = RecordStatus.CREATED
    source: RecordSource = RecordSource.NORMAL
    boundary_conditions: list[BoundaryCondition] = Field(default_factory=list)
    screenshot_note: str = Field(default="", description="截图说明，用于状态变化时追溯原备注")
    original_remark: str = Field(default="", description="原始备注，导入时保留，供二次执行追溯")
    extrapolation_alert: ExtrapolationAlert = ExtrapolationAlert.NONE
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    version: int = 1


class StatusChangeLog(BaseModel):
    record_id: str
    from_status: RecordStatus
    to_status: RecordStatus
    timestamp: datetime = Field(default_factory=datetime.now)
    operator: str = Field(default="system")
    remark: str = Field(default="", description="变更备注，可追溯到 original_remark")
