from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, List
from app.models import TaskStatus, ImportSource


class WarehouseOrderCreate(BaseModel):
    order_no: str
    customer_id: str
    customer_name: Optional[str] = None
    equipment_type: Optional[str] = None
    equipment_code: Optional[str] = None
    quantity: int = 1
    deposit_amount: float = 0.0
    daily_rental: float = 0.0
    rental_days: Optional[int] = None
    outbound_date: Optional[datetime] = None
    expected_return_date: Optional[datetime] = None
    shift_code: Optional[str] = None
    operator: Optional[str] = None
    remark: Optional[str] = None


class WarehouseOrderResponse(WarehouseOrderCreate):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ReturnRecordCreate(BaseModel):
    return_no: str
    warehouse_order_id: Optional[int] = None
    customer_id: Optional[str] = None
    return_date: Optional[datetime] = None
    return_quantity: int = 0
    returned_equipment_codes: Optional[str] = None
    condition_status: Optional[str] = None
    damage_description: Optional[str] = None
    shift_code: Optional[str] = None
    operator: Optional[str] = None
    is_partial: bool = False
    batch_number: int = 1
    remark: Optional[str] = None


class ReturnRecordResponse(ReturnRecordCreate):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ReturnPhotoCreate(BaseModel):
    photo_no: str
    return_record_id: Optional[int] = None
    file_path: str
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    photo_type: Optional[str] = None
    uploader: Optional[str] = None
    remark: Optional[str] = None


class ReturnPhotoResponse(ReturnPhotoCreate):
    id: int
    upload_time: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class RepairEstimateCreate(BaseModel):
    estimate_no: str
    warehouse_order_id: Optional[int] = None
    return_record_id: Optional[int] = None
    equipment_code: Optional[str] = None
    damage_type: Optional[str] = None
    damage_description: Optional[str] = None
    estimate_amount: float = 0.0
    parts_cost: float = 0.0
    labor_cost: float = 0.0
    is_customer_liable: bool = True
    reviewer: Optional[str] = None
    status: str = "pending"
    remark: Optional[str] = None


class RepairEstimateResponse(RepairEstimateCreate):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DepositDeductionCreate(BaseModel):
    deduction_no: str
    return_record_id: Optional[int] = None
    warehouse_order_no: Optional[str] = None
    customer_id: Optional[str] = None
    deduction_type: Optional[str] = None
    deduction_amount: float = 0.0
    deduction_reason: Optional[str] = None
    evidence_chain: Optional[str] = None
    calculation_rule: Optional[str] = None
    operator: Optional[str] = None


class DepositDeductionResponse(DepositDeductionCreate):
    id: int
    is_manual_adjusted: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ImportRecordResponse(BaseModel):
    id: int
    import_batch_no: str
    source_type: ImportSource
    source_file_name: Optional[str]
    row_number: Optional[int]
    target_table: Optional[str]
    is_success: bool
    error_message: Optional[str]
    operator: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class AsyncTaskResponse(BaseModel):
    id: int
    task_id: str
    task_type: str
    status: TaskStatus
    retry_count: int
    max_retries: int
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ReplayExceptionResponse(BaseModel):
    id: int
    exception_no: str
    exception_type: str
    exception_message: str
    is_resolved: bool
    created_at: datetime

    class Config:
        from_attributes = True


class DeductionCalculationRequest(BaseModel):
    warehouse_order_no: str
    return_record_ids: List[int]
    operator: Optional[str] = None


class DeductionResult(BaseModel):
    deduction_no: str
    total_deduction: float
    detail_items: List[dict]
    evidence_chain: str


class ImportResult(BaseModel):
    batch_no: str
    total_count: int
    success_count: int
    failed_count: int
    failed_details: List[dict]


class ExportRequest(BaseModel):
    export_type: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    customer_id: Optional[str] = None
    include_evidence: bool = True
