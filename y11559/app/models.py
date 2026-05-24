from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from .database import Base


class WorkflowStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    REJECTED = "rejected"
    SECOND_CONFIRMED = "second_confirmed"
    AUDIT_ONLY = "audit_only"


class DuplicateStrategy(str, enum.Enum):
    IGNORE = "ignore"
    OVERWRITE = "overwrite"
    APPEND = "append"


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    WAIT_RETRY = "wait_retry"
    WAIT_MANUAL = "wait_manual"
    PERMANENT_FAILED = "permanent_failed"


class UserRole(str, enum.Enum):
    STORE_CLERK = "store_clerk"
    DRIVER = "driver"
    CUSTOMER_SERVICE = "customer_service"
    AREA_MANAGER = "area_manager"
    AUDITOR = "auditor"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    real_name = Column(String(50), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    phone = Column(String(20))
    area = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    audit_logs = relationship("AuditLog", back_populates="operator")


class StoreOrder(Base):
    __tablename__ = "store_orders"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String(50), index=True, nullable=False)
    order_no = Column(String(50), unique=True, index=True, nullable=False)
    store_name = Column(String(100), nullable=False)
    store_address = Column(String(200))
    store_manager = Column(String(50))
    store_phone = Column(String(20))
    product_name = Column(String(100), nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String(20))
    unit_price = Column(Float)
    total_amount = Column(Float)
    is_credit = Column(Boolean, default=False)
    credit_amount = Column(Float, default=0)
    is_out_of_stock = Column(Boolean, default=False)
    substitute_product = Column(String(100))
    payment_status = Column(String(20), default="unpaid")
    remark = Column(Text)
    status = Column(Enum(WorkflowStatus), default=WorkflowStatus.DRAFT)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    duplicate_strategy = Column(Enum(DuplicateStrategy))

    trajectories = relationship("DriverTrajectory", back_populates="order")
    receipts = relationship("ReceiptIOU", back_populates="order")
    handovers = relationship("StoreHandover", back_populates="order")
    remarks = relationship("ServiceRemark", back_populates="order")
    change_histories = relationship("ChangeHistory", back_populates="store_order")


class DriverTrajectory(Base):
    __tablename__ = "driver_trajectories"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String(50), index=True)
    trajectory_no = Column(String(50), unique=True, index=True, nullable=False)
    order_id = Column(Integer, ForeignKey("store_orders.id"))
    driver_name = Column(String(50), nullable=False)
    driver_phone = Column(String(20))
    vehicle_no = Column(String(30))
    start_point = Column(String(200))
    end_point = Column(String(200))
    current_location = Column(String(200))
    latitude = Column(Float)
    longitude = Column(Float)
    status = Column(String(30), default="in_transit")
    remark = Column(Text)
    workflow_status = Column(Enum(WorkflowStatus), default=WorkflowStatus.DRAFT)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    record_time = Column(DateTime(timezone=True))

    order = relationship("StoreOrder", back_populates="trajectories")


class ReceiptIOU(Base):
    __tablename__ = "receipt_ious"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String(50), index=True)
    receipt_no = Column(String(50), unique=True, index=True, nullable=False)
    order_id = Column(Integer, ForeignKey("store_orders.id"))
    store_name = Column(String(100))
    receiver_name = Column(String(50), nullable=False)
    receiver_phone = Column(String(20))
    receiver_id_card = Column(String(30))
    product_name = Column(String(100))
    quantity = Column(Float)
    unit = Column(String(20))
    is_iou = Column(Boolean, default=False)
    iou_amount = Column(Float, default=0)
    iou_due_date = Column(DateTime(timezone=True))
    signature_image_url = Column(String(500))
    remark = Column(Text)
    workflow_status = Column(Enum(WorkflowStatus), default=WorkflowStatus.DRAFT)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    order = relationship("StoreOrder", back_populates="receipts")


class StoreHandover(Base):
    __tablename__ = "store_handovers"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String(50), index=True)
    handover_no = Column(String(50), unique=True, index=True, nullable=False)
    order_id = Column(Integer, ForeignKey("store_orders.id"))
    store_name = Column(String(100))
    handover_from = Column(String(50))
    handover_to = Column(String(50))
    handover_time = Column(DateTime(timezone=True))
    product_list = Column(JSON)
    total_quantity = Column(Float)
    total_amount = Column(Float)
    is_credit_handover = Column(Boolean, default=False)
    credit_amount = Column(Float, default=0)
    handover_remark = Column(Text)
    both_signature_url = Column(String(500))
    workflow_status = Column(Enum(WorkflowStatus), default=WorkflowStatus.DRAFT)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    order = relationship("StoreOrder", back_populates="handovers")


class ServiceRemark(Base):
    __tablename__ = "service_remarks"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String(50), index=True)
    remark_no = Column(String(50), unique=True, index=True, nullable=False)
    order_id = Column(Integer, ForeignKey("store_orders.id"))
    cs_staff_name = Column(String(50), nullable=False)
    remark_type = Column(String(30))
    content = Column(Text, nullable=False)
    is_sensitive = Column(Boolean, default=False)
    workflow_status = Column(Enum(WorkflowStatus), default=WorkflowStatus.DRAFT)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    order = relationship("StoreOrder", back_populates="remarks")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    operator_id = Column(Integer, ForeignKey("users.id"))
    operation_type = Column(String(50), nullable=False)
    target_type = Column(String(50), nullable=False)
    target_id = Column(Integer, nullable=False)
    batch_no = Column(String(50), index=True)
    old_value = Column(JSON)
    new_value = Column(JSON)
    change_reason = Column(Text)
    ip_address = Column(String(50))
    user_agent = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    operator = relationship("User", back_populates="audit_logs")


class ChangeHistory(Base):
    __tablename__ = "change_histories"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("store_orders.id"))
    batch_no = Column(String(50), index=True)
    field_name = Column(String(100), nullable=False)
    old_value = Column(String(1000))
    new_value = Column(String(1000))
    changed_by = Column(Integer, ForeignKey("users.id"))
    change_reason = Column(Text)
    is_sensitive_field = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    store_order = relationship("StoreOrder", back_populates="change_histories")


class AsyncTask(Base):
    __tablename__ = "async_tasks"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String(50), unique=True, index=True, nullable=False)
    task_type = Column(String(50), nullable=False)
    batch_no = Column(String(50), index=True)
    status = Column(Enum(TaskStatus), default=TaskStatus.PENDING)
    payload = Column(JSON)
    result = Column(JSON)
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    next_retry_time = Column(DateTime(timezone=True))
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True))
