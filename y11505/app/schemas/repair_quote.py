from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date


class RepairQuoteBase(BaseModel):
    quote_no: str
    device_code: str
    device_name: str
    fault_description: str
    repair_content: str
    quote_amount: float
    quote_date: date
    valid_until: date
    repair_vendor: str
    quote_status: str = "pending"


class RepairQuoteCreate(RepairQuoteBase):
    pass


class RepairQuoteUpdate(BaseModel):
    fault_description: Optional[str] = None
    repair_content: Optional[str] = None
    quote_amount: Optional[float] = None
    quote_status: Optional[str] = None
    approval_status: Optional[str] = None
    approval_opinion: Optional[str] = None


class RepairQuoteResponse(RepairQuoteBase):
    id: str
    batch_id: str
    approval_status: Optional[str] = None
    approval_opinion: Optional[str] = None
    approval_operator: Optional[str] = None
    approval_time: Optional[datetime] = None
    version: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
