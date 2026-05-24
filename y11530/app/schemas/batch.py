from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class BatchCreate(BaseModel):
    branch_id: str = Field(..., description="支行ID")
    branch_name: str = Field(..., description="支行名称")
    batch_date: datetime = Field(..., description="批次日期")
    start_date: datetime = Field(..., description="检测开始日期")
    end_date: datetime = Field(..., description="检测结束日期")
    operator: str = Field(..., description="操作人")


class BatchResponse(BaseModel):
    id: int
    batch_no: str
    branch_id: str
    branch_name: str
    batch_date: datetime
    status: str
    total_records: int
    unprocessed_records: int
    corrected_records: int
    need_manual_confirm_records: int
    failed_records: int
    created_by: str
    created_at: datetime
    updated_at: datetime
    frozen_at: Optional[datetime] = None
    frozen_by: Optional[str] = None
    frozen_reason: Optional[str] = None
    settled_at: Optional[datetime] = None
    archived_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BatchListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[BatchResponse]


class BatchStatusUpdate(BaseModel):
    operator: str = Field(..., description="操作人")
    reason: Optional[str] = Field(None, description="原因")
