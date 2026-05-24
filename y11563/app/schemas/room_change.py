from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class RoomChangeBase(BaseModel):
    change_no: str = Field(..., description="换房记录号，幂等键")
    checkin_no: Optional[str] = None
    order_no: Optional[str] = None
    guest_name: Optional[str] = None
    old_room_no: Optional[str] = None
    new_room_no: Optional[str] = None
    old_room_type: Optional[str] = None
    new_room_type: Optional[str] = None
    old_rate: float = 0
    new_rate: float = 0
    rate_diff: float = 0
    change_time: Optional[datetime] = None
    change_reason: Optional[str] = None
    operator: Optional[str] = None
    status: str = "completed"
    remarks: Optional[str] = None
    batch_no: Optional[str] = None


class RoomChangeCreate(RoomChangeBase):
    idempotency_key: Optional[str] = None
    duplicate_strategy: str = Field(
        default="update",
        description="ignore|update|append - 重复数据处理策略"
    )


class RoomChangeUpdate(BaseModel):
    status: Optional[str] = None
    remarks: Optional[str] = None
    updated_by: str = "system"
    change_reason: Optional[str] = None


class RoomChangeResponse(RoomChangeBase):
    id: int
    created_at: datetime
    updated_at: datetime
    created_by: str
    updated_by: str
    is_duplicate: bool = False
    duplicate_action: Optional[str] = None

    class Config:
        from_attributes = True
