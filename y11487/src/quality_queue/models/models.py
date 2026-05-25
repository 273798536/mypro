from datetime import datetime, date
from enum import Enum as PyEnum
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Date, Boolean,
    Text, ForeignKey, Enum, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .database import Base


class RecordSource(PyEnum):
    INSPECTION = "inspection"
    REWORK = "rework"
    SHIFT = "shift"
    SMS = "sms"


class QueueStatus(PyEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    RETRYING = "retrying"
    MANUAL = "manual"
    COMPENSATED = "compensated"
    CLOSED = "closed"
    DEAD_LETTER = "dead_letter"


class DirtyType(PyEnum):
    MISSING_FIELD = "missing_field"
    CROSS_DAY = "cross_day"
    NAME_CHANGED = "name_changed"
    AMOUNT_CONFLICT = "amount_conflict"
    QUANTITY_CONFLICT = "quantity_conflict"


class RetryCategory(PyEnum):
    AUTO_RETRYABLE = "auto_retryable"
    MANUAL_REQUIRED = "manual_required"
    NOT_RETRYABLE = "not_retryable"


class ReceiptStatus(PyEnum):
    RECEIVED = "received"
    VALIDATING = "validating"
    QUEUED = "queued"
    PROCESSING = "processing"
    SUCCESS = "success"
    FAILED = "failed"


class WorkerStatus(PyEnum):
    IDLE = "idle"
    RUNNING = "running"
    PAUSED = "paused"
    STOPPED = "stopped"


class MachineShift(Base):
    __tablename__ = "machine_shifts"

    id = Column(Integer, primary_key=True, index=True)
    shift_code = Column(String, unique=True, index=True)
    machine_no = Column(String, index=True)
    shift_date = Column(Date, index=True)
    shift_type = Column(String)
    operator = Column(String)
    team_leader = Column(String)
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    target_quantity = Column(Integer, default=0)
    actual_quantity = Column(Integer, default=0)
    defect_quantity = Column(Integer, default=0)
    base_yield_rate = Column(Float, default=0.0)
    raw_data = Column(JSON)
    is_draft = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    is_active = Column(Boolean, default=True)

    inspections = relationship("Inspection", back_populates="shift")
    rework_orders = relationship("ReworkOrder", back_populates="shift")
    exception_records = relationship("ExceptionRecord", back_populates="shift")


class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(Integer, primary_key=True, index=True)
    inspection_no = Column(String, unique=True, index=True)
    shift_id = Column(Integer, ForeignKey("machine_shifts.id"), nullable=True)
    machine_no = Column(String, index=True)
    inspection_date = Column(Date, index=True, nullable=True)
    inspector = Column(String)
    batch_no = Column(String, index=True)
    style_no = Column(String)
    fabric_type = Column(String)
    sample_size = Column(Integer, default=0)
    defect_count = Column(Integer, default=0)
    defect_rate = Column(Float, default=0.0)
    is_qualified = Column(Boolean, default=True)
    raw_data = Column(JSON)
    is_draft = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    shift = relationship("MachineShift", back_populates="inspections")
    rework_orders = relationship("ReworkOrder", back_populates="inspection")
    exception_records = relationship("ExceptionRecord", back_populates="inspection")
    queue_items = relationship("CompensationQueue", back_populates="inspection")


class ReworkOrder(Base):
    __tablename__ = "rework_orders"

    id = Column(Integer, primary_key=True, index=True)
    rework_no = Column(String, unique=True, index=True)
    inspection_id = Column(Integer, ForeignKey("inspections.id"), nullable=True)
    shift_id = Column(Integer, ForeignKey("machine_shifts.id"), nullable=True)
    parent_rework_id = Column(Integer, ForeignKey("rework_orders.id"), nullable=True)
    rework_date = Column(Date, index=True, nullable=True)
    machine_no = Column(String, index=True)
    defect_type = Column(String, index=True)
    defect_description = Column(Text)
    rework_quantity = Column(Integer, default=0)
    rework_operator = Column(String)
    rework_team = Column(String)
    compensation_amount = Column(Float, default=0.0)
    is_reworked = Column(Boolean, default=False)
    rework_pass_count = Column(Integer, default=0)
    rework_fail_count = Column(Integer, default=0)
    rework_count = Column(Integer, default=0)
    final_yield_rate = Column(Float, default=0.0)
    responsible_shift_code = Column(String, index=True)
    raw_data = Column(JSON)
    is_draft = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    inspection = relationship("Inspection", back_populates="rework_orders")
    shift = relationship("MachineShift", back_populates="rework_orders")
    parent_rework = relationship("ReworkOrder", remote_side=[id])
    exception_records = relationship("ExceptionRecord", back_populates="rework_order")
    queue_items = relationship("CompensationQueue", back_populates="rework_order")


class ExceptionRecord(Base):
    __tablename__ = "exception_records"

    id = Column(Integer, primary_key=True, index=True)
    record_no = Column(String, unique=True, index=True)
    source = Column(Enum(RecordSource), index=True)
    inspection_id = Column(Integer, ForeignKey("inspections.id"), nullable=True)
    rework_order_id = Column(Integer, ForeignKey("rework_orders.id"), nullable=True)
    shift_id = Column(Integer, ForeignKey("machine_shifts.id"), nullable=True)
    record_date = Column(Date, index=True, nullable=True)
    machine_no = Column(String, index=True)
    defect_type = Column(String, index=True)
    description = Column(Text)
    photo_path = Column(String)
    sms_content = Column(Text)
    sender = Column(String)
    sent_at = Column(DateTime)
    is_verified = Column(Boolean, default=False)
    verified_by = Column(String)
    verified_at = Column(DateTime)
    raw_data = Column(JSON)
    is_draft = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    inspection = relationship("Inspection", back_populates="exception_records")
    rework_order = relationship("ReworkOrder", back_populates="exception_records")
    shift = relationship("MachineShift", back_populates="exception_records")
    queue_items = relationship("CompensationQueue", back_populates="exception_record")


class CompensationQueue(Base):
    __tablename__ = "compensation_queue"

    id = Column(Integer, primary_key=True, index=True)
    queue_no = Column(String, unique=True, index=True)
    status = Column(Enum(QueueStatus), default=QueueStatus.PENDING, index=True)
    retry_category = Column(Enum(RetryCategory), index=True)
    inspection_id = Column(Integer, ForeignKey("inspections.id"), nullable=True)
    rework_order_id = Column(Integer, ForeignKey("rework_orders.id"), nullable=True)
    exception_id = Column(Integer, ForeignKey("exception_records.id"), nullable=True)
    defect_type = Column(String, index=True)
    machine_no = Column(String, index=True)
    responsible_shift_code = Column(String, index=True)
    original_shift_code = Column(String)
    compensation_amount = Column(Float, default=0.0)
    compensation_quantity = Column(Integer, default=0)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    next_retry_at = Column(DateTime)
    last_retry_at = Column(DateTime)
    last_error = Column(Text)
    manual_handler = Column(String)
    manual_note = Column(Text)
    compensated_at = Column(DateTime)
    compensated_by = Column(String)
    closed_at = Column(DateTime)
    closed_by = Column(String)
    close_reason = Column(String)
    raw_context = Column(JSON)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    inspection = relationship("Inspection", back_populates="queue_items")
    rework_order = relationship("ReworkOrder", back_populates="queue_items")
    exception_record = relationship("ExceptionRecord", back_populates="queue_items")
    audit_logs = relationship("AuditLog", back_populates="queue_item")


class DirtyRecord(Base):
    __tablename__ = "dirty_records"

    id = Column(Integer, primary_key=True, index=True)
    source_type = Column(Enum(RecordSource), index=True)
    dirty_type = Column(Enum(DirtyType), index=True)
    source_id = Column(String, index=True)
    draft_record_id = Column(Integer, index=True)
    field_name = Column(String)
    original_value = Column(Text)
    corrected_value = Column(Text)
    conflict_info = Column(JSON)
    processing_opinion = Column(Text)
    is_corrected = Column(Boolean, default=False)
    corrected_by = Column(String)
    corrected_at = Column(DateTime)
    raw_content = Column(JSON)
    created_at = Column(DateTime, default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String, index=True)
    operator = Column(String, index=True)
    operator_role = Column(String)
    queue_item_id = Column(Integer, ForeignKey("compensation_queue.id"), nullable=True)
    resource_type = Column(String)
    resource_id = Column(String)
    is_allowed = Column(Boolean, default=True)
    deny_reason = Column(String)
    ip_address = Column(String)
    user_agent = Column(String)
    old_value = Column(JSON)
    new_value = Column(JSON)
    created_at = Column(DateTime, default=func.now())

    queue_item = relationship("CompensationQueue", back_populates="audit_logs")


class ExternalReceipt(Base):
    __tablename__ = "external_receipts"

    id = Column(Integer, primary_key=True, index=True)
    receipt_no = Column(String, unique=True, index=True)
    source_system = Column(String, index=True)
    source_type = Column(Enum(RecordSource), index=True)
    status = Column(Enum(ReceiptStatus), default=ReceiptStatus.RECEIVED, index=True)
    queue_item_id = Column(Integer, ForeignKey("compensation_queue.id"), nullable=True)
    inspection_id = Column(Integer, ForeignKey("inspections.id"), nullable=True)
    rework_order_id = Column(Integer, ForeignKey("rework_orders.id"), nullable=True)
    shift_id = Column(Integer, ForeignKey("machine_shifts.id"), nullable=True)
    exception_id = Column(Integer, ForeignKey("exception_records.id"), nullable=True)
    payload = Column(JSON)
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=5)
    next_retry_at = Column(DateTime)
    processed_at = Column(DateTime)
    callback_url = Column(String)
    callback_status = Column(String)
    callback_response = Column(JSON)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    queue_item = relationship("CompensationQueue")
    inspection = relationship("Inspection")
    rework_order = relationship("ReworkOrder")
    shift = relationship("MachineShift")
    exception = relationship("ExceptionRecord")


class ResourceLock(Base):
    __tablename__ = "resource_locks"

    id = Column(Integer, primary_key=True, index=True)
    resource_type = Column(String, index=True)
    resource_id = Column(String, index=True)
    lock_holder = Column(String, index=True)
    locked_at = Column(DateTime, default=func.now())
    expires_at = Column(DateTime)
    is_active = Column(Boolean, default=True, index=True)

    __table_args__ = (
        {"sqlite_autoincrement": True},
    )


class DataHistory(Base):
    __tablename__ = "data_history"

    id = Column(Integer, primary_key=True, index=True)
    resource_type = Column(String, index=True)
    resource_id = Column(String, index=True)
    version = Column(Integer, default=1)
    data_snapshot = Column(JSON)
    change_reason = Column(String)
    changed_by = Column(String)
    created_at = Column(DateTime, default=func.now())


class WorkerState(Base):
    __tablename__ = "worker_states"

    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(String, unique=True, index=True)
    status = Column(Enum(WorkerStatus), default=WorkerStatus.IDLE, index=True)
    current_queue_id = Column(Integer, nullable=True)
    last_heartbeat = Column(DateTime, default=func.now())
    processed_count = Column(Integer, default=0)
    error_count = Column(Integer, default=0)
    config = Column(JSON)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
