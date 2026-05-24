from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional
from .models import BatchStatus, ReplayAction, OperationType


class ImplantBase(BaseModel):
    implant_id: str
    batch_no: str
    implant_model: str
    original_model: Optional[str] = None
    quantity: int = 1
    unit: str = "pcs"
    is_model_changed: bool = False
    model_change_reason: Optional[str] = None
    inventory_deducted: bool = False


class ImplantCreate(ImplantBase):
    pass


class ImplantUpdate(BaseModel):
    implant_model: Optional[str] = None
    quantity: Optional[int] = None
    is_model_changed: Optional[bool] = None
    model_change_reason: Optional[str] = None
    inventory_deducted: Optional[bool] = None


class Implant(ImplantBase):
    id: str
    batch_id: str
    original_model: Optional[str] = None
    inventory_deducted: bool = False
    deduction_time: Optional[datetime] = None
    deduction_operator: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AppointmentBase(BaseModel):
    appointment_no: str
    patient_name: str
    patient_id: str
    doctor_name: Optional[str] = None
    appointment_date: datetime
    surgery_type: Optional[str] = None
    implant_used: Optional[str] = None
    is_complete: bool = False
    medical_record_updated: bool = False


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentUpdate(BaseModel):
    doctor_name: Optional[str] = None
    surgery_type: Optional[str] = None
    implant_used: Optional[str] = None
    is_complete: Optional[bool] = None
    medical_record_updated: Optional[bool] = None


class Appointment(AppointmentBase):
    id: str
    batch_id: str
    is_complete: bool = False
    medical_record_updated: bool = False
    record_update_time: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InvoiceBase(BaseModel):
    invoice_no: str
    supplier_name: str
    invoice_date: datetime
    total_amount: float = 0
    currency: str = "CNY"


class InvoiceCreate(InvoiceBase):
    pass


class InvoiceUpdate(BaseModel):
    total_amount: Optional[float] = None
    is_verified: Optional[bool] = None


class Invoice(InvoiceBase):
    id: str
    batch_id: str
    is_verified: bool = False
    verified_by: Optional[str] = None
    verify_time: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class HandoverPaperBase(BaseModel):
    handover_no: str
    from_department: str
    to_department: str
    handover_date: datetime
    handover_person: Optional[str] = None
    receiver: Optional[str] = None
    item_list: Optional[str] = None


class HandoverPaperCreate(HandoverPaperBase):
    pass


class HandoverPaperUpdate(BaseModel):
    receiver: Optional[str] = None
    item_list: Optional[str] = None
    is_signed: Optional[bool] = None


class HandoverPaper(HandoverPaperBase):
    id: str
    batch_id: str
    is_signed: bool = False
    sign_time: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BatchBase(BaseModel):
    batch_no: str
    clinic_code: str
    remark: Optional[str] = None
    customer_service_note: Optional[str] = None
    replay_strategy: ReplayAction = ReplayAction.IGNORE


class BatchCreate(BatchBase):
    implants: List[ImplantCreate] = []
    appointments: List[AppointmentCreate] = []
    invoices: List[InvoiceCreate] = []
    handover_papers: List[HandoverPaperCreate] = []


class BatchUpdate(BaseModel):
    remark: Optional[str] = None
    customer_service_note: Optional[str] = None
    replay_strategy: Optional[ReplayAction] = None


class Batch(BatchBase):
    id: str
    status: BatchStatus
    submitter: Optional[str] = None
    submit_time: Optional[datetime] = None
    verifier: Optional[str] = None
    verify_time: Optional[datetime] = None
    is_frozen: bool = False
    freeze_time: Optional[datetime] = None
    frozen_by: Optional[str] = None
    export_time: Optional[datetime] = None
    exported_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BatchDetail(Batch):
    implants: List[Implant] = []
    appointments: List[Appointment] = []
    invoices: List[Invoice] = []
    handover_papers: List[HandoverPaper] = []


class OperationHistoryBase(BaseModel):
    operation_type: OperationType
    operator: str
    remark: Optional[str] = None


class OperationHistory(OperationHistoryBase):
    id: str
    batch_id: str
    operation_time: datetime
    from_status: Optional[str] = None
    to_status: Optional[str] = None
    changed_fields: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

    class Config:
        from_attributes = True


class ApiResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None
    code: int = 200


class ReconcileResult(BaseModel):
    batch_no: str
    total_implants: int
    total_appointments: int
    total_invoices: int
    matched_implants: int
    matched_appointments: int
    unmatched_items: List[dict]
    is_success: bool


class ReplayResult(BaseModel):
    batch_no: str
    action_taken: str
    previous_data: Optional[dict] = None
    new_data: Optional[dict] = None
    message: str


class ManualJudgeRequest(BaseModel):
    new_status: BatchStatus
    judge_reason: str
