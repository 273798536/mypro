import enum
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, Enum, Float, Boolean, JSON
from sqlalchemy.orm import relationship

from .database import Base


class BatchStatus(str, enum.Enum):
    CREATED = "created"
    ATTACHMENTS_UPLOADED = "attachments_uploaded"
    UNDER_REVIEW = "under_review"
    REVIEW_COMPLETED = "review_completed"
    SETTLEMENT_FROZEN = "settlement_frozen"
    ARCHIVED = "archived"
    CANCELLED = "cancelled"


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    WAITING_RETRY = "waiting_retry"
    WAITING_MANUAL = "waiting_manual"
    PERMANENT_FAILED = "permanent_failed"
    COMPLETED = "completed"


class IdempotencyMode(str, enum.Enum):
    IGNORE = "ignore"
    OVERWRITE = "overwrite"
    APPEND = "append"


class DataSource(str, enum.Enum):
    DECLARATION_FORM = "declaration_form"
    TRACKING_NODE = "tracking_node"
    TAX_NOTICE = "tax_notice"
    TEMP_RECORD = "temp_record"


class Batch(Base):
    __tablename__ = "batches"

    id = Column(String, primary_key=True, index=True)
    batch_no = Column(String, unique=True, index=True, nullable=False)
    status = Column(Enum(BatchStatus), default=BatchStatus.CREATED, nullable=False)

    source_type = Column(String)
    customs_code = Column(String)
    total_packages = Column(Integer, default=0)
    total_tax_amount = Column(Float, default=0.0)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_by = Column(String, nullable=False)

    frozen_at = Column(DateTime)
    frozen_by = Column(String)
    frozen_reason = Column(Text)

    status_before_frozen = Column(String)
    manual_remark = Column(Text)

    packages = relationship("Package", back_populates="batch", cascade="all, delete-orphan")
    tracking_nodes = relationship("TrackingNode", back_populates="batch", cascade="all, delete-orphan")
    tax_notices = relationship("TaxNotice", back_populates="batch", cascade="all, delete-orphan")
    temp_records = relationship("TempRecord", back_populates="batch", cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="batch", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="batch", cascade="all, delete-orphan")
    tasks = relationship("AsyncTask", back_populates="batch", cascade="all, delete-orphan")


class Package(Base):
    __tablename__ = "packages"

    id = Column(String, primary_key=True)
    batch_id = Column(String, ForeignKey("batches.id"), nullable=False)
    package_no = Column(String, index=True, nullable=False)
    waybill_no = Column(String, index=True)

    declared_value = Column(Float)
    tax_amount = Column(Float)
    is_abnormal = Column(Boolean, default=False)
    abnormal_reason = Column(String)

    source = Column(Enum(DataSource))
    raw_data = Column(JSON)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    batch = relationship("Batch", back_populates="packages")


class TrackingNode(Base):
    __tablename__ = "tracking_nodes"

    id = Column(String, primary_key=True)
    batch_id = Column(String, ForeignKey("batches.id"), nullable=False)
    package_no = Column(String, index=True)
    node_type = Column(String)
    node_time = Column(DateTime)
    location = Column(String)
    status = Column(String)
    remark = Column(String)
    raw_data = Column(JSON)

    created_at = Column(DateTime, default=datetime.utcnow)

    batch = relationship("Batch", back_populates="tracking_nodes")


class TaxNotice(Base):
    __tablename__ = "tax_notices"

    id = Column(String, primary_key=True)
    batch_id = Column(String, ForeignKey("batches.id"), nullable=False)
    notice_no = Column(String, index=True)
    package_no = Column(String, index=True)
    tax_amount = Column(Float)
    tax_type = Column(String)
    issue_date = Column(DateTime)
    due_date = Column(DateTime)
    is_paid = Column(Boolean, default=False)
    paid_at = Column(DateTime)
    raw_data = Column(JSON)

    created_at = Column(DateTime, default=datetime.utcnow)

    batch = relationship("Batch", back_populates="tax_notices")


class TempRecord(Base):
    __tablename__ = "temp_records"

    id = Column(String, primary_key=True)
    batch_id = Column(String, ForeignKey("batches.id"), nullable=False)
    record_type = Column(String)
    package_no = Column(String, index=True)
    content = Column(Text)
    recorded_by = Column(String)
    recorded_at = Column(DateTime, default=datetime.utcnow)
    raw_data = Column(JSON)

    batch = relationship("Batch", back_populates="temp_records")


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(String, primary_key=True)
    batch_id = Column(String, ForeignKey("batches.id"), nullable=False)
    file_name = Column(String)
    file_type = Column(String)
    file_size = Column(Integer)
    file_path = Column(String)
    uploaded_by = Column(String)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    description = Column(String)

    batch = relationship("Batch", back_populates="attachments")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True)
    batch_id = Column(String, ForeignKey("batches.id"), nullable=False)
    action = Column(String, nullable=False)
    old_status = Column(String)
    new_status = Column(String)
    changed_by = Column(String, nullable=False)
    changed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    reason = Column(Text)
    changes = Column(JSON)
    ip_address = Column(String)
    user_agent = Column(String)

    batch = relationship("Batch", back_populates="audit_logs")


class AsyncTask(Base):
    __tablename__ = "async_tasks"

    id = Column(String, primary_key=True)
    batch_id = Column(String, ForeignKey("batches.id"), nullable=False)
    task_type = Column(String, nullable=False)
    status = Column(Enum(TaskStatus), default=TaskStatus.PENDING, nullable=False)

    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    last_error = Column(Text)
    error_traceback = Column(Text)

    queued_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    next_retry_at = Column(DateTime)

    payload = Column(JSON)
    result = Column(JSON)

    created_by = Column(String)

    batch = relationship("Batch", back_populates="tasks")
