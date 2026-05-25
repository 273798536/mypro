from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class HandoverBase(BaseModel):
    handover_no: str = Field(..., description="交接记录号")
    shift_type: Optional[str] = None
    handover_date: Optional[datetime] = None
    operator_out: Optional[str] = None
    operator_in: Optional[str] = None
    room_count: int = 0
    checkin_count: int = 0
    checkout_count: int = 0
    total_cash: float = 0
    total_card: float = 0
    total_online: float = 0
    total_amount: float = 0
    issues: Optional[List[str]] = None
    remarks: Optional[str] = None
    batch_no: Optional[str] = None
    status: str = "pending"


class HandoverCreate(HandoverBase):
    pass


class HandoverUpdate(BaseModel):
    status: Optional[str] = None
    issues: Optional[List[str]] = None
    remarks: Optional[str] = None
    updated_by: str = "system"


class HandoverResponse(HandoverBase):
    id: int
    created_at: datetime
    updated_at: datetime
    created_by: str
    updated_by: str

    class Config:
        from_attributes = True
