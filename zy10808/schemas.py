from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


class MoldBase(BaseModel):
    mold_no: str
    mold_name: Optional[str] = None
    spec: Optional[str] = None


class MoldCreate(MoldBase):
    pass


class Mold(MoldBase):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class BorrowRecordBase(BaseModel):
    mold_no: str
    workshop: str
    borrower: Optional[str] = None
    expected_return_date: Optional[datetime] = None


class BorrowRecordCreate(BorrowRecordBase):
    pass


class BorrowRecord(BorrowRecordBase):
    id: int
    mold_id: Optional[int] = None
    borrow_date: datetime
    actual_return_date: Optional[datetime] = None
    status: str
    is_overdue: int
    maintenance_done: int
    created_at: datetime

    class Config:
        from_attributes = True


class BorrowRecordDetail(BorrowRecord):
    maintenance_records: List["MaintenanceRecord"] = []
    return_records: List["ReturnRecord"] = []
    missing_parts: List["MissingPart"] = []
    compensation_records: List["CompensationRecord"] = []


class MaintenanceRecordBase(BaseModel):
    borrow_record_id: int
    mold_no: str
    maintenance_content: str
    maintenance_person: Optional[str] = None
    maintenance_status: Optional[str] = "done"


class MaintenanceRecordCreate(MaintenanceRecordBase):
    pass


class MaintenanceRecord(MaintenanceRecordBase):
    id: int
    maintenance_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class ReturnRecordBase(BaseModel):
    borrow_record_id: int
    mold_no: str
    photo_url: Optional[str] = None
    photo_description: Optional[str] = None
    wear_level: Optional[str] = None
    checker: Optional[str] = None
    check_result: Optional[str] = None


class ReturnRecordCreate(ReturnRecordBase):
    pass


class ReturnRecord(ReturnRecordBase):
    id: int
    return_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class MissingPartBase(BaseModel):
    borrow_record_id: int
    mold_no: str
    part_name: str
    part_quantity: Optional[int] = 1
    part_value: Optional[float] = None
    reporter: Optional[str] = None


class MissingPartCreate(MissingPartBase):
    pass


class MissingPart(MissingPartBase):
    id: int
    found_date: datetime
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class CompensationRecordBase(BaseModel):
    borrow_record_id: int
    mold_no: str
    compensation_reason: str
    compensation_amount: float
    compensation_party: Optional[str] = None


class CompensationRecordCreate(CompensationRecordBase):
    pass


class CompensationRecord(CompensationRecordBase):
    id: int
    compensation_status: str
    created_at: datetime

    class Config:
        from_attributes = True


class ErrorResponse(BaseModel):
    detail: str


BorrowRecordDetail.model_rebuild()
