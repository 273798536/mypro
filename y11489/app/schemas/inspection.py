from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

from app.schemas.common import BaseResponse
from app.models.states import RecordStatus


class InspectionRecordBase(BaseModel):
    batch_no: str = Field(..., max_length=100)
    product_code: Optional[str] = Field(None, max_length=50)
    product_name: Optional[str] = Field(None, max_length=200)
    machine_id: Optional[str] = Field(None, max_length=50)
    shift_id: Optional[int] = None
    inspector: Optional[int] = None
    sample_size: Optional[int] = None
    defect_count: int = 0
    pass_count: int = 0
    yield_rate: Optional[float] = None
    defect_type: Optional[str] = Field(None, max_length=100)
    defect_description: Optional[str] = None
    judge_result: Optional[str] = Field(None, max_length=50)
    final_judge: Optional[str] = Field(None, max_length=50)


class InspectionRecordCreate(InspectionRecordBase):
    pass


class InspectionRecordUpdate(BaseModel):
    product_code: Optional[str] = None
    product_name: Optional[str] = None
    machine_id: Optional[str] = None
    shift_id: Optional[int] = None
    inspector: Optional[int] = None
    sample_size: Optional[int] = None
    defect_count: Optional[int] = None
    pass_count: Optional[int] = None
    yield_rate: Optional[float] = None
    defect_type: Optional[str] = None
    defect_description: Optional[str] = None
    judge_result: Optional[str] = None
    final_judge: Optional[str] = None
    is_manual_adjustment: bool = False
    adjustment_reason: Optional[str] = None


class InspectionRecordInDB(InspectionRecordBase):
    id: int
    status: RecordStatus
    version: int
    is_manual_adjustment: bool
    original_yield_rate: Optional[float] = None
    original_defect_count: Optional[int] = None
    rework_count: int = 0
    rework_order_id: Optional[int] = None
    import_source_id: Optional[int] = None
    original_row_number: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[int] = None
    updated_by: Optional[int] = None

    class Config:
        from_attributes = True


class InspectionRecordResponse(InspectionRecordInDB):
    inspector_name: Optional[str] = None
    shift_info: Optional[dict] = None
    import_source_name: Optional[str] = None
    change_history: List[dict] = []


class StatusUpdate(BaseModel):
    new_status: str
    reason: Optional[str] = None
