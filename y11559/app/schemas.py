from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Any
from .models import WorkflowStatus, DuplicateStrategy, TaskStatus, UserRole


class UserBase(BaseModel):
    username: str
    real_name: str
    role: UserRole
    phone: Optional[str] = None
    area: Optional[str] = None


class UserCreate(UserBase):
    pass


class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class StoreOrderBase(BaseModel):
    batch_no: str
    order_no: str
    store_name: str
    store_address: Optional[str] = None
    store_manager: Optional[str] = None
    store_phone: Optional[str] = None
    product_name: str
    quantity: float
    unit: str
    unit_price: Optional[float] = None
    total_amount: Optional[float] = None
    is_credit: bool = False
    credit_amount: float = 0
    is_out_of_stock: bool = False
    substitute_product: Optional[str] = None
    payment_status: str = "unpaid"
    remark: Optional[str] = None
    duplicate_strategy: Optional[DuplicateStrategy] = DuplicateStrategy.IGNORE


class StoreOrderCreate(StoreOrderBase):
    created_by: int
    change_reason: Optional[str] = None


class StoreOrderUpdate(BaseModel):
    store_name: Optional[str] = None
    store_address: Optional[str] = None
    store_manager: Optional[str] = None
    store_phone: Optional[str] = None
    product_name: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    unit_price: Optional[float] = None
    total_amount: Optional[float] = None
    is_credit: Optional[bool] = None
    credit_amount: Optional[float] = None
    is_out_of_stock: Optional[bool] = None
    substitute_product: Optional[str] = None
    payment_status: Optional[str] = None
    remark: Optional[str] = None
    change_reason: str


class StoreOrder(StoreOrderBase):
    id: int
    status: WorkflowStatus
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class StoreOrderDetail(StoreOrder):
    trajectories: List["DriverTrajectory"] = []
    receipts: List["ReceiptIOU"] = []
    handovers: List["StoreHandover"] = []
    remarks: List["ServiceRemark"] = []
    change_histories: List["ChangeHistory"] = []


class DriverTrajectoryBase(BaseModel):
    batch_no: str
    trajectory_no: str
    order_id: Optional[int] = None
    driver_name: str
    driver_phone: Optional[str] = None
    vehicle_no: Optional[str] = None
    start_point: Optional[str] = None
    end_point: Optional[str] = None
    current_location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: str = "in_transit"
    remark: Optional[str] = None
    record_time: Optional[datetime] = None


class DriverTrajectoryCreate(DriverTrajectoryBase):
    created_by: int


class DriverTrajectory(DriverTrajectoryBase):
    id: int
    workflow_status: WorkflowStatus
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ReceiptIOUBase(BaseModel):
    batch_no: str
    receipt_no: str
    order_id: Optional[int] = None
    store_name: Optional[str] = None
    receiver_name: str
    receiver_phone: Optional[str] = None
    receiver_id_card: Optional[str] = None
    product_name: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    is_iou: bool = False
    iou_amount: float = 0
    iou_due_date: Optional[datetime] = None
    signature_image_url: Optional[str] = None
    remark: Optional[str] = None


class ReceiptIOUCreate(ReceiptIOUBase):
    created_by: int


class ReceiptIOU(ReceiptIOUBase):
    id: int
    workflow_status: WorkflowStatus
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class StoreHandoverBase(BaseModel):
    batch_no: str
    handover_no: str
    order_id: Optional[int] = None
    store_name: Optional[str] = None
    handover_from: Optional[str] = None
    handover_to: Optional[str] = None
    handover_time: Optional[datetime] = None
    product_list: Optional[Any] = None
    total_quantity: Optional[float] = None
    total_amount: Optional[float] = None
    is_credit_handover: bool = False
    credit_amount: float = 0
    handover_remark: Optional[str] = None
    both_signature_url: Optional[str] = None


class StoreHandoverCreate(StoreHandoverBase):
    created_by: int


class StoreHandover(StoreHandoverBase):
    id: int
    workflow_status: WorkflowStatus
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ServiceRemarkBase(BaseModel):
    batch_no: str
    remark_no: str
    order_id: Optional[int] = None
    cs_staff_name: str
    remark_type: Optional[str] = None
    content: str
    is_sensitive: bool = False


class ServiceRemarkCreate(ServiceRemarkBase):
    created_by: int


class ServiceRemark(ServiceRemarkBase):
    id: int
    workflow_status: WorkflowStatus
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AuditLogBase(BaseModel):
    operator_id: int
    operation_type: str
    target_type: str
    target_id: int
    batch_no: Optional[str] = None
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None
    change_reason: Optional[str] = None
    ip_address: Optional[str] = None


class AuditLogCreate(AuditLogBase):
    pass


class AuditLog(AuditLogBase):
    id: int
    created_at: datetime
    operator: Optional[User] = None

    class Config:
        from_attributes = True


class ChangeHistoryBase(BaseModel):
    order_id: int
    batch_no: Optional[str] = None
    field_name: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    changed_by: int
    change_reason: Optional[str] = None
    is_sensitive_field: bool = False


class ChangeHistoryCreate(ChangeHistoryBase):
    pass


class ChangeHistory(ChangeHistoryBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class AsyncTaskBase(BaseModel):
    task_id: str
    task_type: str
    batch_no: Optional[str] = None
    payload: Optional[Any] = None
    max_retries: int = 3


class AsyncTaskCreate(AsyncTaskBase):
    created_by: int


class AsyncTask(AsyncTaskBase):
    id: int
    status: TaskStatus
    result: Optional[Any] = None
    error_message: Optional[str] = None
    retry_count: int
    next_retry_time: Optional[datetime] = None
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WorkflowAction(BaseModel):
    action: str
    operator_id: int
    change_reason: Optional[str] = None
    ip_address: Optional[str] = None


class BatchProcessRequest(BaseModel):
    batch_no: str
    duplicate_strategy: DuplicateStrategy
    operator_id: int
    change_reason: Optional[str] = None


class ExportRequest(BaseModel):
    batch_no: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    export_format: str = "json"
    desensitize: bool = True
    role: UserRole


StoreOrderDetail.model_rebuild()
