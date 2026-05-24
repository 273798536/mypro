from datetime import datetime, date
from typing import Optional, Generic, TypeVar, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

T = TypeVar('T')


class ResponseBase(BaseModel):
    success: bool = True
    message: Optional[str] = None


class DataResponse(ResponseBase, Generic[T]):
    data: Optional[T] = None


class ListResponse(ResponseBase, Generic[T]):
    data: List[T] = []
    total: int = 0
    page: int = 1
    page_size: int = 20
    total_pages: int = 0


class PaginationParams(BaseModel):
    page: int = Field(1, ge=1, description="页码")
    page_size: int = Field(20, ge=1, le=100, description="每页数量")


class AuditFields(BaseModel):
    id: int
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int] = None
    updated_by: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class BusinessBase(AuditFields):
    idempotent_key: str
    status: str
    remark: Optional[str] = None
    metadata_: Optional[Dict[str, Any]] = None
