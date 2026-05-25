from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class SmsBase(BaseModel):
    sms_no: str = Field(..., description="短信记录号")
    checkin_no: Optional[str] = None
    order_no: Optional[str] = None
    guest_name: Optional[str] = None
    guest_phone: Optional[str] = None
    sms_type: Optional[str] = None
    sms_content: Optional[str] = None
    image_path: Optional[str] = None
    sent_time: Optional[datetime] = None
    sender: Optional[str] = None
    status: str = "sent"
    operator: Optional[str] = None
    remarks: Optional[str] = None
    batch_no: Optional[str] = None


class SmsCreate(SmsBase):
    pass


class SmsUpdate(BaseModel):
    status: Optional[str] = None
    remarks: Optional[str] = None
    updated_by: str = "system"


class SmsResponse(SmsBase):
    id: int
    created_at: datetime
    updated_at: datetime
    created_by: str
    updated_by: str

    class Config:
        from_attributes = True
