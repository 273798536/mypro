from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import config

class RepairOrderBase(BaseModel):
    order_no: str = Field(..., max_length=50)
    customer_name: Optional[str] = Field(None, max_length=100)
    customer_phone: Optional[str] = Field(None, max_length=20)
    product_model: Optional[str] = Field(None, max_length=100)
    fault_description: Optional[str] = None
    engineer: Optional[str] = Field(None, max_length=50)
    is_late_submit: bool = False
    remark: Optional[str] = None

class RepairOrderCreate(RepairOrderBase):
    pass

class RepairOrder(RepairOrderBase):
    id: int
    batch_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class SparePartBase(BaseModel):
    part_code: str = Field(..., max_length=50)
    part_name: Optional[str] = Field(None, max_length=100)
    barcode: Optional[str] = Field(None, max_length=100)
    quantity: int = 1
    status: str = config.PartStatus.PENDING
    is_returned: bool = False
    is_scrapped: bool = False
    scan_time: Optional[datetime] = None
    scan_operator: Optional[str] = Field(None, max_length=50)
    remark: Optional[str] = None
    repair_order_no: Optional[str] = None

class SparePartCreate(SparePartBase):
    pass

class SparePartRevise(SparePartBase):
    id: Optional[int] = None

class SparePartUpdate(BaseModel):
    status: Optional[str] = None
    is_returned: Optional[bool] = None
    is_scrapped: Optional[bool] = None
    remark: Optional[str] = None

class SparePart(SparePartBase):
    id: int
    batch_id: int
    repair_order_id: Optional[int]
    is_mixed: bool
    validation_result: Optional[str]
    validation_message: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PhotoBase(BaseModel):
    photo_type: str = Field(..., max_length=20)
    file_name: Optional[str] = Field(None, max_length=255)
    upload_operator: Optional[str] = Field(None, max_length=50)
    remark: Optional[str] = None

class PhotoCreate(PhotoBase):
    file_path: str = Field(..., max_length=255)
    file_size: Optional[int] = None

class Photo(PhotoBase):
    id: int
    batch_id: int
    file_path: str
    file_size: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True

class OperationLogBase(BaseModel):
    operation: str = Field(..., max_length=50)
    operator: str = Field(..., max_length=50)
    old_status: Optional[str] = Field(None, max_length=20)
    new_status: Optional[str] = Field(None, max_length=20)
    changed_fields: Optional[str] = None
    remark: Optional[str] = None

class OperationLogCreate(OperationLogBase):
    batch_id: int

class OperationLog(OperationLogBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class BatchBase(BaseModel):
    batch_no: str = Field(..., max_length=50)
    operator: str = Field(..., max_length=50)
    description: Optional[str] = None
    duplicate_strategy: str = config.DuplicateStrategy.IGNORE

class BatchCreate(BatchBase):
    idempotency_key: str = Field(..., max_length=100)
    repair_orders: List[RepairOrderCreate] = Field(default_factory=list)
    parts: List[SparePartCreate] = Field(default_factory=list)

class BatchSubmit(BaseModel):
    operator: str = Field(..., max_length=50)
    remark: Optional[str] = None

class BatchWithdraw(BaseModel):
    operator: str = Field(..., max_length=50)
    reason: str

class BatchFreeze(BaseModel):
    operator: str = Field(..., max_length=50)
    reason: str

class BatchRevise(BaseModel):
    operator: str = Field(..., max_length=50)
    remark: Optional[str] = None
    parts: List[SparePartRevise] = Field(default_factory=list)
    repair_orders: List[RepairOrderCreate] = Field(default_factory=list)

class BatchJudge(BaseModel):
    operator: str = Field(..., max_length=50)
    approved: bool
    reason: str
    part_ids: Optional[List[int]] = None

class BatchUpdateParts(BaseModel):
    operator: str = Field(..., max_length=50)
    parts: List[SparePartUpdate]

class Batch(BatchBase):
    id: int
    status: str
    total_parts: int
    success_parts: int
    failed_parts: int
    idempotency_key: str
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime
    submitted_at: Optional[datetime]
    frozen_at: Optional[datetime]
    repair_orders: List[RepairOrder] = Field(default_factory=list)
    parts: List[SparePart] = Field(default_factory=list)
    photos: List[Photo] = Field(default_factory=list)
    operation_logs: List[OperationLog] = Field(default_factory=list)

    class Config:
        from_attributes = True

class BatchList(BaseModel):
    total: int
    items: List[Batch]

class IdempotencyCheckResult(BaseModel):
    is_duplicate: bool
    strategy: str
    existing_batch_no: Optional[str]
    message: str

class ValidationResult(BaseModel):
    success: bool
    message: str
    error_details: Optional[List[str]] = None
