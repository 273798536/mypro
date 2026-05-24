from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class DepositBase(BaseModel):
    deposit_no: str = Field(..., description="押金流水号，幂等键")
    checkin_no: Optional[str] = None
    order_no: Optional[str] = None
    guest_name: Optional[str] = None
    amount: float = 0
    payment_method: Optional[str] = None
    transaction_type: Optional[str] = None
    transaction_time: Optional[datetime] = None
    operator: Optional[str] = None
    status: str = "success"
    remarks: Optional[str] = None
    batch_no: Optional[str] = None


class DepositCreate(DepositBase):
    idempotency_key: Optional[str] = None
    duplicate_strategy: str = Field(
        default="update",
        description="ignore|update|append - 重复数据处理策略"
    )


class DepositUpdate(BaseModel):
    amount: Optional[float] = None
    status: Optional[str] = None
    remarks: Optional[str] = None
    updated_by: str = "system"
    change_reason: Optional[str] = None


class DepositResponse(DepositBase):
    id: int
    created_at: datetime
    updated_at: datetime
    created_by: str
    updated_by: str
    is_duplicate: bool = False
    duplicate_action: Optional[str] = None

    class Config:
        from_attributes = True
