from datetime import datetime
from typing import Optional, Any, Dict, List
from pydantic import BaseModel, Field


class PaginationParams(BaseModel):
    page: int = Field(1, ge=1, description="页码")
    page_size: int = Field(20, ge=1, le=100, description="每页数量")


class StatusHistoryResponse(BaseModel):
    id: int
    batch_id: int
    record_id: Optional[int] = None
    action_type: str
    from_status: Optional[str] = None
    to_status: str
    operator: str
    reason: Optional[str] = None
    change_details: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class FailedRecordResponse(BaseModel):
    id: int
    batch_id: int
    record_key: str
    source_type: str
    raw_data: Optional[Dict[str, Any]] = None
    error_message: str
    error_type: str
    created_at: datetime

    class Config:
        from_attributes = True


class OperationLogResponse(BaseModel):
    id: int
    batch_id: Optional[int] = None
    record_id: Optional[int] = None
    operator: str
    action: str
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AttachmentCreate(BaseModel):
    file_name: str
    file_path: str
    file_type: str
    file_size: int
    uploaded_by: str
    description: Optional[str] = None


class AttachmentResponse(BaseModel):
    id: int
    batch_id: int
    file_name: str
    file_path: str
    file_type: str
    file_size: int
    uploaded_by: str
    uploaded_at: datetime
    description: Optional[str] = None

    class Config:
        from_attributes = True


class AttachmentListResponse(BaseModel):
    total: int
    items: List[AttachmentResponse]
