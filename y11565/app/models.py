from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Float, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from app.enums import BatchStatus, WorkOrderStatus, TaskStatus, TaskType, AttachmentType, ChangeType


class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default=BatchStatus.DRAFT.value)
    road_section = Column(String, index=True)
    shift = Column(String)
    operator = Column(String)
    spare_part_batch = Column(String)
    total_work_orders = Column(Integer, default=0)
    abnormal_count = Column(Integer, default=0)
    frozen_at = Column(DateTime)
    frozen_by = Column(String)
    freeze_reason = Column(Text)
    status_before_freeze = Column(String)
    settled_at = Column(DateTime)
    settled_by = Column(String)
    archived_at = Column(DateTime)
    archived_by = Column(String)
    cancelled_at = Column(DateTime)
    cancelled_by = Column(String)
    cancel_reason = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    created_by = Column(String)
    updated_by = Column(String)

    work_orders = relationship("WorkOrder", back_populates="batch", cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="batch", cascade="all, delete-orphan")
    change_logs = relationship("ChangeLog", back_populates="batch", cascade="all, delete-orphan")
    tasks = relationship("AsyncTask", back_populates="batch")


class WorkOrder(Base):
    __tablename__ = "work_orders"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False, index=True)
    order_no = Column(String, index=True, nullable=False)
    external_order_no = Column(String, index=True)
    road_section = Column(String, index=True)
    pole_number = Column(String)
    fault_description = Column(Text)
    status = Column(String, default=WorkOrderStatus.NEW.value)
    is_abnormal = Column(Boolean, default=False)
    abnormal_reason = Column(Text)
    repair_result = Column(Text)
    review_result = Column(String)
    review_comment = Column(Text)
    reviewed_by = Column(String)
    reviewed_at = Column(DateTime)
    original_price = Column(Float)
    adjusted_price = Column(Float)
    price_adjust_reason = Column(Text)
    report_time = Column(DateTime)
    repair_time = Column(DateTime)
    complete_time = Column(DateTime)
    shift = Column(String)
    operator = Column(String)
    spare_part_used = Column(String)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    batch = relationship("Batch", back_populates="work_orders")
    attachments = relationship("Attachment", back_populates="work_order")
    change_logs = relationship("ChangeLog", back_populates="work_order")


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"))
    work_order_id = Column(Integer, ForeignKey("work_orders.id"))
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer)
    file_type = Column(String, default=AttachmentType.OTHER.value)
    description = Column(Text)
    uploaded_by = Column(String)
    created_at = Column(DateTime, server_default=func.now())

    batch = relationship("Batch", back_populates="attachments")
    work_order = relationship("WorkOrder", back_populates="attachments")


class ChangeLog(Base):
    __tablename__ = "change_logs"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"))
    work_order_id = Column(Integer, ForeignKey("work_orders.id"))
    change_type = Column(String, nullable=False)
    field_name = Column(String)
    old_value = Column(Text)
    new_value = Column(Text)
    change_reason = Column(Text)
    changed_by = Column(String)
    created_at = Column(DateTime, server_default=func.now())

    batch = relationship("Batch", back_populates="change_logs")
    work_order = relationship("WorkOrder", back_populates="change_logs")


class AsyncTask(Base):
    __tablename__ = "async_tasks"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String, unique=True, index=True, nullable=False)
    task_type = Column(String, nullable=False)
    batch_id = Column(Integer, ForeignKey("batches.id"))
    status = Column(String, default=TaskStatus.PENDING.value)
    progress = Column(Integer, default=0)
    message = Column(Text)
    result_data = Column(Text)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    next_retry_at = Column(DateTime)
    failed_at = Column(DateTime)
    error_message = Column(Text)
    error_traceback = Column(Text)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    created_by = Column(String)
    created_at = Column(DateTime, server_default=func.now())

    batch = relationship("Batch", back_populates="tasks")
