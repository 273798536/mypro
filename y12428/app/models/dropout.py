from __future__ import annotations
from enum import Enum
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class DropoutAuditResult(str, Enum):
    APPROVED = "approved"
    REJECTED_LATE = "rejected_late"
    REJECTED_NO_AGREEMENT = "rejected_no_agreement"
    REJECTED_EVIDENCE_GAP = "rejected_evidence_gap"


class DropoutRecord(BaseModel):
    id: str = Field(description="退课记录唯一ID")
    enrollment_id: str = Field(description="关联选课记录ID")
    student_id: str = Field(description="学生学号")
    requested_at: datetime = Field(description="退课申请时间")
    deadline: Optional[datetime] = Field(default=None, description="退课截止时间")
    audit_result: Optional[DropoutAuditResult] = Field(default=None, description="审核结果")
    audit_reason_human: Optional[str] = Field(default=None, description="人话审核原因")
    split_id: Optional[str] = Field(default=None, description="关联分账ID(退课费)")
    created_at: datetime = Field(default_factory=datetime.now)


class DropoutCreate(BaseModel):
    enrollment_id: str
    requested_at: datetime
