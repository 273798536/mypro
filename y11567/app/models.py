import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, DateTime, Text, Boolean,
    Float, JSON, ForeignKey, Enum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .database import Base


class SourceType(str, enum.Enum):
    INSPECTION = "inspection"
    HOTLINE = "hotline"
    SPARE_PART = "spare_part"
    EXCEPTION_PHOTO = "exception_photo"
    SMS = "sms"


class WorkOrderStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    RETRYING = "retrying"
    MANUAL = "manual"
    COMPENSATED = "compensated"
    CLOSED = "closed"
    DEAD_LETTER = "dead_letter"


class DirtyType(str, enum.Enum):
    MISSING_FIELD = "missing_field"
    CROSS_DAY = "cross_day"
    NAME_CHANGED = "name_changed"
    AMOUNT_CONFLICT = "amount_conflict"
    QUANTITY_CONFLICT = "quantity_conflict"


class RetryCategory(str, enum.Enum):
    NETWORK_ERROR = "network_error"
    SYSTEM_ERROR = "system_error"
    DATA_INCOMPLETE = "data_incomplete"
    VERIFICATION_FAILED = "verification_failed"
    DEPENDENCY_MISSING = "dependency_missing"


class WorkOrder(Base):
    __tablename__ = "work_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_no = Column(String, unique=True, index=True, nullable=False)
    location = Column(String, index=True, nullable=False)
    location_normalized = Column(String, index=True, nullable=False)
    status = Column(Enum(WorkOrderStatus), default=WorkOrderStatus.PENDING, index=True)
    description = Column(Text)
    lamp_count = Column(Integer)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    last_retry_at = Column(DateTime)
    next_retry_at = Column(DateTime, index=True)
    manual_handler = Column(String)
    compensated_amount = Column(Float, default=0)
    closed_at = Column(DateTime)
    created_at = Column(DateTime, default=func.now(), index=True)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    clues = relationship("Clue", back_populates="work_order", cascade="all, delete-orphan")
    retry_records = relationship("RetryRecord", back_populates="work_order", cascade="all, delete-orphan")
    compensations = relationship("CompensationRecord", back_populates="work_order", cascade="all, delete-orphan")
    operation_logs = relationship("OperationLog", back_populates="work_order", cascade="all, delete-orphan")


class Clue(Base):
    __tablename__ = "clues"

    id = Column(Integer, primary_key=True, index=True)
    work_order_id = Column(Integer, ForeignKey("work_orders.id"), index=True)
    source_type = Column(Enum(SourceType), index=True, nullable=False)
    source_id = Column(String, index=True)
    location = Column(String)
    location_normalized = Column(String, index=True)
    occurred_at = Column(DateTime, index=True)
    content = Column(JSON, nullable=False)
    photo_url = Column(String)
    hotline_number = Column(String)
    spare_part_batch = Column(String)
    sms_content = Column(String)
    is_dirty = Column(Boolean, default=False, index=True)
    dirty_type = Column(Enum(DirtyType))
    dirty_reason = Column(String)
    original_content = Column(JSON)
    correction_notes = Column(Text)
    is_validated = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now(), index=True)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    work_order = relationship("WorkOrder", back_populates="clues")


class RetryRecord(Base):
    __tablename__ = "retry_records"

    id = Column(Integer, primary_key=True, index=True)
    work_order_id = Column(Integer, ForeignKey("work_orders.id"), index=True)
    retry_no = Column(Integer, nullable=False)
    category = Column(Enum(RetryCategory), index=True)
    error_message = Column(Text)
    retry_succeeded = Column(Boolean, default=False)
    executed_at = Column(DateTime, default=func.now())
    executed_by = Column(String)

    work_order = relationship("WorkOrder", back_populates="retry_records")


class DeadLetter(Base):
    __tablename__ = "dead_letters"

    id = Column(Integer, primary_key=True, index=True)
    work_order_id = Column(Integer, unique=True, index=True)
    order_no = Column(String, index=True)
    location = Column(String)
    last_error = Column(Text)
    category = Column(Enum(RetryCategory), index=True)
    retry_count = Column(Integer)
    arrived_at = Column(DateTime, default=func.now(), index=True)
    resolved = Column(Boolean, default=False, index=True)
    resolved_at = Column(DateTime)
    resolved_by = Column(String)
    resolution_notes = Column(Text)


class CompensationRecord(Base):
    __tablename__ = "compensation_records"

    id = Column(Integer, primary_key=True, index=True)
    work_order_id = Column(Integer, ForeignKey("work_orders.id"), index=True)
    amount = Column(Float, nullable=False)
    reason = Column(String)
    executed_by = Column(String)
    accounted_at = Column(DateTime, default=func.now())
    voucher_no = Column(String)

    work_order = relationship("WorkOrder", back_populates="compensations")


class OperationLog(Base):
    __tablename__ = "operation_logs"

    id = Column(Integer, primary_key=True, index=True)
    work_order_id = Column(Integer, ForeignKey("work_orders.id"), index=True)
    operation = Column(String, index=True)
    old_value = Column(JSON)
    new_value = Column(JSON)
    operator = Column(String)
    operated_at = Column(DateTime, default=func.now(), index=True)
    remarks = Column(Text)

    work_order = relationship("WorkOrder", back_populates="operation_logs")


class ChangeEvent(Base):
    __tablename__ = "change_events"

    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String, index=True)
    entity_id = Column(Integer, index=True)
    field_name = Column(String, index=True)
    old_value = Column(JSON)
    new_value = Column(JSON)
    changed_by = Column(String)
    changed_at = Column(DateTime, default=func.now(), index=True)
    change_source = Column(String)
