from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    Text,
    Boolean,
    ForeignKey,
    Enum,
    JSON,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from .database import Base


class BatchStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    REVIEWED = "reviewed"
    FROZEN = "frozen"
    ARCHIVED = "archived"
    REJECTED = "rejected"


class DuplicateStrategy(str, enum.Enum):
    IGNORE = "ignore"
    OVERWRITE = "overwrite"
    APPEND = "append"


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    WAITING_RETRY = "waiting_retry"
    WAITING_MANUAL = "waiting_manual"
    PERMANENT_FAILED = "permanent_failed"
    COMPLETED = "completed"


class SourceType(str, enum.Enum):
    INSPECTION = "inspection"
    REWORK = "rework"
    MACHINE_SHIFT = "machine_shift"
    PRICE_ADJUSTMENT = "price_adjustment"


class InspectionSheet(Base):
    __tablename__ = "inspection_sheets"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String, index=True, nullable=False)
    product_code = Column(String, index=True)
    product_name = Column(String)
    inspection_date = Column(DateTime)
    inspector = Column(String)
    total_quantity = Column(Integer, default=0)
    defective_quantity = Column(Integer, default=0)
    pass_rate = Column(Float, default=0.0)
    defect_type = Column(String)
    defect_description = Column(Text)
    machine_id = Column(String)
    shift_id = Column(String)
    work_order = Column(String)
    remark = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String)

    reworks = relationship("ReworkOrder", back_populates="inspection")
    batch_links = relationship("BatchSource", back_populates="inspection")


class ReworkOrder(Base):
    __tablename__ = "rework_orders"

    id = Column(Integer, primary_key=True, index=True)
    rework_no = Column(String, index=True, nullable=False)
    batch_no = Column(String, index=True)
    inspection_id = Column(Integer, ForeignKey("inspection_sheets.id"))
    product_code = Column(String)
    rework_date = Column(DateTime)
    rework_type = Column(String)
    rework_reason = Column(Text)
    rework_quantity = Column(Integer, default=0)
    reworked_quantity = Column(Integer, default=0)
    passed_quantity = Column(Integer, default=0)
    rework_pass_rate = Column(Float, default=0.0)
    rework_operator = Column(String)
    machine_id = Column(String)
    shift_id = Column(String)
    is_secondary_rework = Column(Boolean, default=False)
    parent_rework_id = Column(Integer, ForeignKey("rework_orders.id"))
    remark = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String)

    inspection = relationship("InspectionSheet", back_populates="reworks")
    parent_rework = relationship("ReworkOrder", remote_side=[id])
    batch_links = relationship("BatchSource", back_populates="rework")


class MachineShift(Base):
    __tablename__ = "machine_shifts"

    id = Column(Integer, primary_key=True, index=True)
    shift_code = Column(String, index=True, nullable=False)
    machine_id = Column(String, index=True, nullable=False)
    shift_date = Column(DateTime, index=True)
    shift_type = Column(String)
    shift_leader = Column(String)
    operator = Column(String)
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    production_quantity = Column(Integer, default=0)
    defective_quantity = Column(Integer, default=0)
    shift_pass_rate = Column(Float, default=0.0)
    remark = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String)

    batch_links = relationship("BatchSource", back_populates="machine_shift")


class PriceAdjustment(Base):
    __tablename__ = "price_adjustments"

    id = Column(Integer, primary_key=True, index=True)
    adjustment_no = Column(String, index=True, nullable=False)
    batch_no = Column(String, index=True)
    product_code = Column(String)
    adjustment_date = Column(DateTime)
    original_price = Column(Float)
    adjusted_price = Column(Float)
    price_difference = Column(Float)
    adjustment_reason = Column(Text)
    approver = Column(String)
    remark = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String)

    batch_links = relationship("BatchSource", back_populates="price_adjustment")


class QualityBatch(Base):
    __tablename__ = "quality_batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(String, unique=True, index=True, nullable=False)
    batch_no = Column(String, index=True, nullable=False)
    product_code = Column(String)
    product_name = Column(String)
    status = Column(Enum(BatchStatus), default=BatchStatus.DRAFT)
    current_stage = Column(String)
    total_defect_count = Column(Integer, default=0)
    rework_count = Column(Integer, default=0)
    final_pass_rate = Column(Float, default=0.0)
    responsible_shift = Column(String)
    responsible_machine = Column(String)
    initial_pass_rate = Column(Float, default=0.0)
    best_pass_rate = Column(Float, default=0.0)
    worst_pass_rate = Column(Float, default=0.0)
    review_opinion = Column(Text)
    reviewer = Column(String)
    review_time = Column(DateTime)
    freeze_reason = Column(Text)
    frozen_by = Column(String)
    frozen_at = Column(DateTime)
    freeze_snapshot = Column(JSON)
    archive_reason = Column(Text)
    archived_by = Column(String)
    archived_at = Column(DateTime)
    remark = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String)

    sources = relationship("BatchSource", back_populates="batch")
    attachments = relationship("BatchAttachment", back_populates="batch")
    histories = relationship("BatchHistory", back_populates="batch")
    status_before_freeze = Column(String)


class BatchSource(Base):
    __tablename__ = "batch_sources"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("quality_batches.id"), nullable=False)
    source_type = Column(Enum(SourceType), nullable=False)
    inspection_id = Column(Integer, ForeignKey("inspection_sheets.id"))
    rework_id = Column(Integer, ForeignKey("rework_orders.id"))
    machine_shift_id = Column(Integer, ForeignKey("machine_shifts.id"))
    price_adjustment_id = Column(Integer, ForeignKey("price_adjustments.id"))
    source_data = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    batch = relationship("QualityBatch", back_populates="sources")
    inspection = relationship("InspectionSheet", back_populates="batch_links")
    rework = relationship("ReworkOrder", back_populates="batch_links")
    machine_shift = relationship("MachineShift", back_populates="batch_links")
    price_adjustment = relationship("PriceAdjustment", back_populates="batch_links")


class BatchAttachment(Base):
    __tablename__ = "batch_attachments"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("quality_batches.id"), nullable=False)
    file_name = Column(String, nullable=False)
    file_path = Column(String)
    file_type = Column(String)
    file_size = Column(Integer)
    description = Column(Text)
    uploaded_by = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    batch = relationship("QualityBatch", back_populates="attachments")


class BatchHistory(Base):
    __tablename__ = "batch_histories"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("quality_batches.id"), nullable=False)
    action = Column(String, nullable=False)
    previous_state = Column(JSON)
    new_state = Column(JSON)
    changes = Column(JSON)
    operator = Column(String)
    remark = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    batch = relationship("QualityBatch", back_populates="histories")


class AsyncTask(Base):
    __tablename__ = "async_tasks"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String, unique=True, index=True, nullable=False)
    task_type = Column(String, index=True)
    status = Column(Enum(TaskStatus), default=TaskStatus.PENDING)
    batch_id = Column(String, index=True)
    parameters = Column(JSON)
    result = Column(JSON)
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    next_retry_at = Column(DateTime)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String)
