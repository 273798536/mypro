from pydantic import BaseModel, Field
from datetime import datetime, date, time
from typing import Optional


class MachineShiftBase(BaseModel):
    machine_id: str = Field(..., max_length=50)
    shift_name: str = Field(..., max_length=50)
    shift_date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    shift_leader: Optional[int] = None
    operator: Optional[int] = None
    total_output: int = 0
    defect_output: int = 0
    rework_count: int = 0


class MachineShiftCreate(MachineShiftBase):
    pass


class MachineShiftUpdate(BaseModel):
    machine_id: Optional[str] = None
    shift_name: Optional[str] = None
    shift_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    shift_leader: Optional[int] = None
    operator: Optional[int] = None
    total_output: Optional[int] = None
    defect_output: Optional[int] = None
    rework_count: Optional[int] = None


class MachineShiftInDB(MachineShiftBase):
    id: int
    import_source_id: Optional[int] = None
    original_row_number: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[int] = None
    updated_by: Optional[int] = None

    class Config:
        from_attributes = True


class MachineShiftResponse(MachineShiftInDB):
    shift_leader_name: Optional[str] = None
    operator_name: Optional[str] = None
    import_source_name: Optional[str] = None
