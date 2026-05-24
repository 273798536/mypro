from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

from app.models.enums import DataSourceType, ReviewType


class RawDataImportBase(BaseModel):
    source_file: str
    source_type: DataSourceType
    imported_by: Optional[str] = None


class RawDataImportCreate(RawDataImportBase):
    pass


class RawDataImportResponse(RawDataImportBase):
    id: int
    total_rows: int
    created_at: datetime

    class Config:
        from_attributes = True


class RawDataRecordBase(BaseModel):
    source_type: DataSourceType
    source_file: str
    original_row_number: int
    original_data: Dict[str, Any]
    parsed_data: Dict[str, Any]
    appointment_no: Optional[str] = None
    order_no: Optional[str] = None
    user_id: Optional[str] = None
    technician_id: Optional[str] = None
    region: Optional[str] = None
    review_type: Optional[ReviewType] = None
    review_content: Optional[str] = None
    refund_amount: Optional[int] = None
    appointment_time: Optional[datetime] = None
    is_rescheduled: int = 0
    is_second_visit: int = 0


class RawDataRecordCreate(RawDataRecordBase):
    import_id: int


class RawDataRecordResponse(RawDataRecordBase):
    id: int
    import_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ImportResult(BaseModel):
    import_id: int
    source_file: str
    source_type: DataSourceType
    total_rows: int
    success_rows: int
    failed_rows: int
    errors: List[str] = Field(default_factory=list)
