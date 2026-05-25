from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

from app.core.constants import BatchStatus, DuplicateStrategy


class BatchBase(BaseModel):
    batch_no: str
    name: str
    description: Optional[str] = None
    department: str
    operator: str
    duplicate_strategy: DuplicateStrategy = DuplicateStrategy.IGNORE


class BatchCreate(BatchBase):
    pass


class BatchUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    department: Optional[str] = None
    duplicate_strategy: Optional[DuplicateStrategy] = None


class BatchResponse(BatchBase):
    id: str
    status: BatchStatus
    status_before_freeze: Optional[str] = None
    record_count: int
    abnormal_count: int
    
    review_operator: Optional[str] = None
    review_time: Optional[datetime] = None
    freeze_operator: Optional[str] = None
    freeze_time: Optional[datetime] = None
    settle_operator: Optional[str] = None
    settle_time: Optional[datetime] = None
    
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class BatchListResponse(BaseModel):
    total: int
    items: List[BatchResponse]
    page: int
    page_size: int
