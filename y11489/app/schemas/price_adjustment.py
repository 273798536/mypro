from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

from app.models.states import RecordStatus


class PriceAdjustmentBase(BaseModel):
    adjustment_no: str = Field(..., max_length=100)
    batch_no: Optional[str] = Field(None, max_length=100)
    product_code: Optional[str] = Field(None, max_length=50)
    product_name: Optional[str] = Field(None, max_length=200)
    original_price: Optional[float] = None
    adjusted_price: Optional[float] = None
    price_difference: Optional[float] = None
    rework_order_id: Optional[int] = None
    inspection_id: Optional[int] = None
    adjustment_reason: Optional[str] = None
    adjustment_type: Optional[str] = Field(None, max_length=50)
    handler: Optional[int] = None
    approver: Optional[int] = None


class PriceAdjustmentCreate(PriceAdjustmentBase):
    pass


class PriceAdjustmentUpdate(BaseModel):
    product_code: Optional[str] = None
    product_name: Optional[str] = None
    original_price: Optional[float] = None
    adjusted_price: Optional[float] = None
    price_difference: Optional[float] = None
    adjustment_reason: Optional[str] = None
    adjustment_type: Optional[str] = None
    handler: Optional[int] = None
    approver: Optional[int] = None


class PriceAdjustmentInDB(PriceAdjustmentBase):
    id: int
    status: RecordStatus
    version: int
    sensitive_fields_masked: int = 0
    import_source_id: Optional[int] = None
    original_row_number: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[int] = None
    updated_by: Optional[int] = None

    class Config:
        from_attributes = True


class PriceAdjustmentResponse(PriceAdjustmentInDB):
    handler_name: Optional[str] = None
    approver_name: Optional[str] = None
    import_source_name: Optional[str] = None
    rework_order_no: Optional[str] = None
    change_history: List[dict] = []
