from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class DeliveryOrderCreate(BaseModel):
    order_no: Optional[str] = None
    batch_no: Optional[str] = None
    product_name: Optional[str] = None
    product_code: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    delivery_date: Optional[str] = None
    supplier: Optional[str] = None
    workshop: Optional[str] = None
    receiver: Optional[str] = None
    remark: Optional[str] = None

class RepairRecordCreate(BaseModel):
    repair_no: Optional[str] = None
    batch_no: Optional[str] = None
    product_name: Optional[str] = None
    product_code: Optional[str] = None
    repair_type: Optional[str] = None
    repair_quantity: Optional[float] = None
    return_quantity: Optional[float] = None
    unit: Optional[str] = None
    repair_date: Optional[str] = None
    return_date: Optional[str] = None
    supplier: Optional[str] = None
    defect_reason: Optional[str] = None
    responsible_party: Optional[str] = None

class DeductionDetailCreate(BaseModel):
    deduction_no: Optional[str] = None
    batch_no: Optional[str] = None
    product_name: Optional[str] = None
    product_code: Optional[str] = None
    deduction_type: Optional[str] = None
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    amount: Optional[float] = None
    deduction_date: Optional[str] = None
    supplier: Optional[str] = None
    reason: Optional[str] = None
    related_order: Optional[str] = None

class RefundFlowCreate(BaseModel):
    refund_no: Optional[str] = None
    batch_no: Optional[str] = None
    related_deduction: Optional[str] = None
    amount: Optional[float] = None
    refund_date: Optional[str] = None
    supplier: Optional[str] = None
    reason: Optional[str] = None
    payment_method: Optional[str] = None

class RecordFix(BaseModel):
    id: int
    table_name: str
    updates: dict
    operator: str = "system"

class ReconciliationRequest(BaseModel):
    batch_nos: Optional[List[str]] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    supplier: Optional[str] = None

class ExportRequest(BaseModel):
    recon_no: str
    format: str = "csv"

class BatchFreezeRequest(BaseModel):
    batch_no: str
    freeze_reason: str
    operator: str = "system"

class RecordWithdrawRequest(BaseModel):
    id: int
    table_name: str
    withdraw_reason: str
    operator: str = "system"

class CompensationRequest(BaseModel):
    batch_no: str
    amount: float
    reason: str
    operator: str = "system"
