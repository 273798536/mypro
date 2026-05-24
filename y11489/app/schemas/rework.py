from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

from app.models.states import RecordStatus


class ReworkOrderBase(BaseModel):
    rework_no: str = Field(..., max_length=100)
    batch_no: Optional[str] = Field(None, max_length=100)
    product_code: Optional[str] = Field(None, max_length=50)
    product_name: Optional[str] = Field(None, max_length=200)
    original_inspection_id: Optional[int] = None
    rework_reason: Optional[str] = None
    defect_type: Optional[str] = Field(None, max_length=100)
    rework_count: int = 0
    rework_pass_count: int = 0
    rework_fail_count: int = 0
    responsible_shift_id: Optional[int] = None
    responsible_person: Optional[int] = None
    handler: Optional[int] = None
    rework_times: int = 1
    final_yield_rate: Optional[str] = Field(None, max_length=50)


class ReworkOrderCreate(ReworkOrderBase):
    pass


class ReworkOrderUpdate(BaseModel):
    product_code: Optional[str] = None
    product_name: Optional[str] = None
    rework_reason: Optional[str] = None
    defect_type: Optional[str] = None
    rework_count: Optional[int] = None
    rework_pass_count: Optional[int] = None
    rework_fail_count: Optional[int] = None
    responsible_shift_id: Optional[int] = None
    responsible_person: Optional[int] = None
    handler: Optional[int] = None
    rework_times: Optional[int] = None
    final_yield_rate: Optional[str] = None
    is_manual_adjustment: int = 0
    adjustment_reason: Optional[str] = None


class ReworkOrderInDB(ReworkOrderBase):
    id: int
    status: RecordStatus
    version: int
    is_manual_adjustment: int
    import_source_id: Optional[int] = None
    original_row_number: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[int] = None
    updated_by: Optional[int] = None

    class Config:
        from_attributes = True


class ReworkOrderResponse(ReworkOrderInDB):
    responsible_person_name: Optional[str] = None
    handler_name: Optional[str] = None
    shift_info: Optional[dict] = None
    import_source_name: Optional[str] = None
    inspection_info: Optional[dict] = None
    change_history: List[dict] = []
