from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class CheckinBase(BaseModel):
    checkin_no: str = Field(..., description="入住单号，幂等键")
    order_no: Optional[str] = None
    guest_name: Optional[str] = None
    guest_phone: Optional[str] = None
    id_card: Optional[str] = None
    room_no: Optional[str] = None
    room_type: Optional[str] = None
    checkin_date: Optional[datetime] = None
    checkout_date: Optional[datetime] = None
    actual_checkout: Optional[datetime] = None
    room_rate: float = 0
    total_amount: float = 0
    paid_amount: float = 0
    status: str = "checked_in"
    source: Optional[str] = None
    is_extended: bool = False
    extended_days: int = 0
    remarks: Optional[str] = None
    batch_no: Optional[str] = None


class CheckinCreate(CheckinBase):
    idempotency_key: Optional[str] = None
    operator: str = "system"
    duplicate_strategy: str = Field(
        default="update",
        description="ignore|update|append - 重复数据处理策略"
    )


class CheckinUpdate(BaseModel):
    guest_name: Optional[str] = None
    room_no: Optional[str] = None
    checkout_date: Optional[datetime] = None
    actual_checkout: Optional[datetime] = None
    room_rate: Optional[float] = None
    total_amount: Optional[float] = None
    paid_amount: Optional[float] = None
    status: Optional[str] = None
    is_extended: Optional[bool] = None
    extended_days: Optional[int] = None
    remarks: Optional[str] = None
    updated_by: str = "system"
    change_reason: Optional[str] = None


class CheckinResponse(CheckinBase):
    id: int
    created_at: datetime
    updated_at: datetime
    created_by: str
    updated_by: str
    is_duplicate: bool = False
    duplicate_action: Optional[str] = None

    class Config:
        from_attributes = True
