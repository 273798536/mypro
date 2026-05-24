from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date

from app.core.constants import RecordStatus


class InspectionRecordBase(BaseModel):
    record_no: str
    device_code: str
    device_name: str
    inspection_date: date
    inspector: str
    inspection_items: Optional[str] = None
    inspection_result: str
    abnormal_description: Optional[str] = None
    status: RecordStatus = RecordStatus.NORMAL


class InspectionRecordCreate(InspectionRecordBase):
    pass


class InspectionRecordUpdate(BaseModel):
    inspection_result: Optional[str] = None
    abnormal_description: Optional[str] = None
    status: Optional[RecordStatus] = None
    review_opinion: Optional[str] = None
    manual_reason: Optional[str] = None


class InspectionRecordResponse(InspectionRecordBase):
    id: str
    batch_id: str
    review_status: Optional[str] = None
    review_opinion: Optional[str] = None
    review_operator: Optional[str] = None
    review_time: Optional[datetime] = None
    manual_reason: Optional[str] = None
    manual_operator: Optional[str] = None
    manual_time: Optional[datetime] = None
    version: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
