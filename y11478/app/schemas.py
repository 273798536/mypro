from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any


class BookingBase(BaseModel):
    source_id: str
    room_name: str
    booker: Optional[str] = None
    department: Optional[str] = None
    meeting_topic: Optional[str] = None
    start_time: datetime
    end_time: datetime
    attendee_count: Optional[int] = None
    has_tea_break: bool = False
    has_equipment: bool = False
    status: str = "scheduled"
    raw_data: Optional[Dict[str, Any]] = None


class BookingCreate(BookingBase):
    pass


class Booking(BookingBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AccessBase(BaseModel):
    source_id: str
    room_name: str
    card_number: Optional[str] = None
    person_name: Optional[str] = None
    access_time: datetime
    access_type: str = "entry"
    raw_data: Optional[Dict[str, Any]] = None


class AccessCreate(AccessBase):
    pass


class Access(AccessBase):
    id: int
    booking_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CancelMessageBase(BaseModel):
    source_id: str
    room_name: str
    cancel_time: datetime
    canceler: Optional[str] = None
    cancel_reason: Optional[str] = None
    meeting_start_time: Optional[datetime] = None
    raw_data: Optional[Dict[str, Any]] = None


class CancelMessageCreate(CancelMessageBase):
    pass


class CancelMessage(CancelMessageBase):
    id: int
    booking_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SupplierBillBase(BaseModel):
    source_id: str
    room_name: str
    supplier_name: str
    service_type: str
    quantity: float
    unit_price: float
    total_amount: float
    bill_date: datetime
    meeting_date: Optional[datetime] = None
    raw_data: Optional[Dict[str, Any]] = None


class SupplierBillCreate(SupplierBillBase):
    pass


class SupplierBill(SupplierBillBase):
    id: int
    booking_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ProcessRecordBase(BaseModel):
    batch_id: str
    booking_id: int
    process_type: str
    status: str
    error_type: Optional[str] = None
    error_message: Optional[str] = None
    original_value: Optional[Dict[str, Any]] = None
    corrected_value: Optional[Dict[str, Any]] = None
    handling_suggestion: Optional[str] = None
    is_dirty: bool = False
    is_resolved: bool = False
    processed_by: str = "system"


class ProcessRecordCreate(ProcessRecordBase):
    pass


class ProcessRecord(ProcessRecordBase):
    id: int
    processed_at: datetime

    class Config:
        from_attributes = True


class ImportRequest(BaseModel):
    bookings: Optional[List[BookingCreate]] = None
    access_records: Optional[List[AccessCreate]] = None
    cancel_messages: Optional[List[CancelMessageCreate]] = None
    supplier_bills: Optional[List[SupplierBillCreate]] = None
    duplicate_handling: str = Field(default="skip", description="skip|overwrite")
    batch_id: Optional[str] = None


class ImportResponse(BaseModel):
    batch_id: str
    total_records: int
    success_count: int
    duplicate_count: int
    error_count: int
    duplicate_handling: str
    details: Dict[str, Any]


class AuditRecordDetail(BaseModel):
    booking: Booking
    access_records: List[Access]
    cancel_messages: List[CancelMessage]
    supplier_bills: List[SupplierBill]
    process_records: List[ProcessRecord]


class ReconciliationResult(BaseModel):
    booking_id: int
    room_name: str
    meeting_topic: Optional[str]
    start_time: datetime
    booking_status: str
    has_access_record: bool
    has_cancel_message: bool
    has_supplier_bill: bool
    tea_break_cost: float
    equipment_cost: float
    total_cost: float
    is_exception: bool
    exception_type: Optional[str]
    exception_description: Optional[str]


class ExportQuery(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    room_name: Optional[str] = None
    include_dirty: bool = True
    include_exceptions: bool = True
