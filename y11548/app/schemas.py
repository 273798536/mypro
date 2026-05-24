from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Any
from .models import UserRole, BatchStatus, RecordStatus, ImportStatus


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[UserRole] = None


class UserBase(BaseModel):
    username: str
    full_name: str
    role: UserRole


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ExhibitionBatchBase(BaseModel):
    batch_no: str
    exhibition_name: str
    location: Optional[str] = None
    start_date: datetime
    end_date: datetime
    description: Optional[str] = None


class ExhibitionBatchCreate(ExhibitionBatchBase):
    pass


class ExhibitionBatchUpdate(BaseModel):
    exhibition_name: Optional[str] = None
    location: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    description: Optional[str] = None
    status: Optional[BatchStatus] = None


class ExhibitionBatchResponse(ExhibitionBatchBase):
    id: int
    status: BatchStatus
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    frozen_at: Optional[datetime] = None
    frozen_by: Optional[int] = None

    class Config:
        from_attributes = True


class MaterialBase(BaseModel):
    batch_id: int
    material_code: str
    material_name: str
    category: Optional[str] = None
    specification: Optional[str] = None
    quantity: int
    unit: str = "件"
    warehouse_location: Optional[str] = None
    remark: Optional[str] = None


class MaterialCreate(MaterialBase):
    pass


class MaterialUpdate(BaseModel):
    material_name: Optional[str] = None
    category: Optional[str] = None
    specification: Optional[str] = None
    quantity: Optional[int] = None
    unit: Optional[str] = None
    warehouse_location: Optional[str] = None
    remark: Optional[str] = None
    status: Optional[RecordStatus] = None


class MaterialResponse(MaterialBase):
    id: int
    status: RecordStatus
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LogisticsReceiptBase(BaseModel):
    batch_id: int
    waybill_no: Optional[str] = None
    logistics_company: Optional[str] = None
    sender: Optional[str] = None
    receiver: Optional[str] = None
    receive_date: datetime
    material_code: Optional[str] = None
    material_name: Optional[str] = None
    quantity: int
    package_condition: Optional[str] = None
    is_damaged: bool = False
    damage_description: Optional[str] = None
    remark: Optional[str] = None


class LogisticsReceiptCreate(LogisticsReceiptBase):
    pass


class LogisticsReceiptUpdate(BaseModel):
    waybill_no: Optional[str] = None
    logistics_company: Optional[str] = None
    sender: Optional[str] = None
    receiver: Optional[str] = None
    receive_date: Optional[datetime] = None
    material_code: Optional[str] = None
    material_name: Optional[str] = None
    quantity: Optional[int] = None
    package_condition: Optional[str] = None
    is_damaged: Optional[bool] = None
    damage_description: Optional[str] = None
    remark: Optional[str] = None
    status: Optional[RecordStatus] = None


class LogisticsReceiptResponse(LogisticsReceiptBase):
    id: int
    status: RecordStatus
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BorrowRecordBase(BaseModel):
    batch_id: int
    borrow_no: str
    borrower_name: str
    borrower_phone: Optional[str] = None
    borrower_department: Optional[str] = None
    material_code: str
    material_name: str
    quantity: int
    borrow_date: datetime
    expected_return_date: Optional[datetime] = None
    actual_return_date: Optional[datetime] = None
    return_quantity: int = 0
    is_returned: bool = False
    remark: Optional[str] = None


class BorrowRecordCreate(BorrowRecordBase):
    pass


class BorrowRecordUpdate(BaseModel):
    borrower_name: Optional[str] = None
    borrower_phone: Optional[str] = None
    borrower_department: Optional[str] = None
    material_code: Optional[str] = None
    material_name: Optional[str] = None
    quantity: Optional[int] = None
    borrow_date: Optional[datetime] = None
    expected_return_date: Optional[datetime] = None
    actual_return_date: Optional[datetime] = None
    return_quantity: Optional[int] = None
    is_returned: Optional[bool] = None
    remark: Optional[str] = None
    status: Optional[RecordStatus] = None


class BorrowRecordResponse(BorrowRecordBase):
    id: int
    status: RecordStatus
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ScanRecordBase(BaseModel):
    batch_id: int
    scan_no: Optional[str] = None
    material_code: str
    material_name: Optional[str] = None
    scan_type: str
    scan_time: datetime
    scanner: Optional[str] = None
    location: Optional[str] = None
    quantity: int = 1
    remark: Optional[str] = None


class ScanRecordCreate(ScanRecordBase):
    pass


class ScanRecordUpdate(BaseModel):
    material_code: Optional[str] = None
    material_name: Optional[str] = None
    scan_type: Optional[str] = None
    scan_time: Optional[datetime] = None
    scanner: Optional[str] = None
    location: Optional[str] = None
    quantity: Optional[int] = None
    remark: Optional[str] = None
    status: Optional[RecordStatus] = None


class ScanRecordResponse(ScanRecordBase):
    id: int
    status: RecordStatus
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ImportTaskResponse(BaseModel):
    id: int
    task_no: str
    batch_id: Optional[int] = None
    import_type: str
    file_name: Optional[str] = None
    status: ImportStatus
    total_count: int
    success_count: int
    failed_count: int
    created_by: Optional[int] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ImportFailureResponse(BaseModel):
    id: int
    task_id: int
    row_number: Optional[int] = None
    raw_data: Optional[Any] = None
    error_message: str
    created_at: datetime

    class Config:
        from_attributes = True


class OperationLogResponse(BaseModel):
    id: int
    operation_type: str
    table_name: Optional[str] = None
    record_id: Optional[int] = None
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None
    created_by: Optional[int] = None
    created_at: datetime
    ip_address: Optional[str] = None

    class Config:
        from_attributes = True


class ReconciliationResultResponse(BaseModel):
    id: int
    batch_id: int
    reconciliation_type: str
    material_code: Optional[str] = None
    material_name: Optional[str] = None
    expected_quantity: Optional[int] = None
    actual_quantity: Optional[int] = None
    difference: Optional[int] = None
    is_anomaly: bool
    anomaly_description: Optional[str] = None
    created_by: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class BatchStatusTransition(BaseModel):
    target_status: BatchStatus
    remark: Optional[str] = None


class RecordStatusTransition(BaseModel):
    target_status: RecordStatus
    remark: Optional[str] = None


class PaginatedResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[Any]


class ExportRequest(BaseModel):
    batch_id: int
    export_type: str
    include_anomalies: bool = True
