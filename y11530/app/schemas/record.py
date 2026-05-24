from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class RecordResponse(BaseModel):
    id: int
    batch_id: int
    record_key: str
    branch_id: str
    exception_type: str
    status: str
    exception_date: datetime
    teller_id: Optional[str] = None
    teller_name: Optional[str] = None
    description: str
    blocking_point: Optional[str] = None
    before_status: Optional[str] = None
    after_status: Optional[str] = None
    manual_reason: Optional[str] = None
    reviewer: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    source_type: str
    source_ids: Optional[List[str]] = None
    raw_data: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RecordUpdate(BaseModel):
    new_status: str = Field(..., description="新状态")
    manual_reason: str = Field(..., description="人工处理理由")
    operator: str = Field(..., description="操作人")


class RecordListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[RecordResponse]
