from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, Text, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class BatchStatus(str, enum.Enum):
    CREATED = "created"
    UPLOADING = "uploading"
    UPLOADED = "uploaded"
    REVIEWING = "reviewing"
    REVIEWED = "reviewed"
    FROZEN = "frozen"
    ARCHIVED = "archived"


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    RETRY = "retry"
    MANUAL = "manual"
    FAILED = "failed"


class DuplicateStrategy(str, enum.Enum):
    IGNORE = "ignore"
    OVERWRITE = "overwrite"
    APPEND = "append"


class OperationType(str, enum.Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    FREEZE = "freeze"
    UNFREEZE = "unfreeze"
    ARCHIVE = "archive"
    UNARCHIVE = "unarchive"
    REVIEW_APPROVE = "review_approve"
    REVIEW_REJECT = "review_reject"
    SUPPLEMENT = "supplement"


class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String, unique=True, index=True)
    name = Column(String)
    description = Column(String)
    status = Column(SQLEnum(BatchStatus), default=BatchStatus.CREATED)
    created_by = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    source_type = Column(String)
    metadata_ = Column("metadata", JSON)

    contracts = relationship("Contract", back_populates="batch", cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="batch", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="batch", cascade="all, delete-orphan")
    tasks = relationship("AsyncTask", back_populates="batch", cascade="all, delete-orphan")


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"))
    contract_no = Column(String, index=True)
    contract_name = Column(String)
    party_a = Column(String)
    party_b = Column(String)
    sign_date = Column(DateTime)
    effective_date = Column(DateTime)
    expire_date = Column(DateTime)
    total_amount = Column(Float)
    version = Column(Integer, default=1)
    parent_contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=True)
    is_supplement = Column(Boolean, default=False)
    is_frozen = Column(Boolean, default=False)
    frozen_at = Column(DateTime, nullable=True)
    frozen_reason = Column(String, nullable=True)
    frozen_by = Column(String, nullable=True)
    is_archived = Column(Boolean, default=False)
    archived_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    metadata_ = Column("metadata", JSON)

    batch = relationship("Batch", back_populates="contracts")
    payment_nodes = relationship("PaymentNode", back_populates="contract", cascade="all, delete-orphan")
    acceptance_emails = relationship("AcceptanceEmail", back_populates="contract", cascade="all, delete-orphan")
    price_changes = relationship("PriceChange", back_populates="contract", cascade="all, delete-orphan")
    versions = relationship("ContractVersion", back_populates="contract", cascade="all, delete-orphan")
    parent_contract = relationship("Contract", remote_side=[id], backref="supplement_contracts")


class ContractVersion(Base):
    __tablename__ = "contract_versions"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"))
    version = Column(Integer)
    snapshot = Column(JSON)
    changed_by = Column(String)
    change_reason = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    contract = relationship("Contract", back_populates="versions")


class PaymentNode(Base):
    __tablename__ = "payment_nodes"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"))
    node_name = Column(String)
    node_type = Column(String)
    payment_ratio = Column(Float)
    payment_amount = Column(Float)
    due_date = Column(DateTime)
    actual_date = Column(DateTime, nullable=True)
    status = Column(String)
    is_modified = Column(Boolean, default=False)
    modified_from_version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    contract = relationship("Contract", back_populates="payment_nodes")


class AcceptanceEmail(Base):
    __tablename__ = "acceptance_emails"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"))
    email_subject = Column(String)
    email_from = Column(String)
    email_to = Column(String)
    email_date = Column(DateTime)
    acceptance_result = Column(String)
    acceptance_amount = Column(Float)
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    contract = relationship("Contract", back_populates="acceptance_emails")


class PriceChange(Base):
    __tablename__ = "price_changes"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"))
    original_price = Column(Float)
    new_price = Column(Float)
    change_reason = Column(String)
    approved_by = Column(String)
    approved_date = Column(DateTime)
    effective_date = Column(DateTime)
    is_manual = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    contract = relationship("Contract", back_populates="price_changes")


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"))
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=True)
    file_name = Column(String)
    file_path = Column(String)
    file_type = Column(String)
    file_size = Column(Integer)
    uploaded_by = Column(String)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    attachment_type = Column(String)
    version = Column(Integer, default=1)

    batch = relationship("Batch", back_populates="attachments")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"))
    contract_id = Column(Integer, nullable=True)
    operation_type = Column(SQLEnum(OperationType))
    operation_by = Column(String)
    operation_at = Column(DateTime, default=datetime.utcnow)
    before_state = Column(JSON)
    after_state = Column(JSON)
    change_reason = Column(String)
    comment = Column(String)

    batch = relationship("Batch", back_populates="audit_logs")


class AsyncTask(Base):
    __tablename__ = "async_tasks"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String, unique=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=True)
    task_type = Column(String)
    status = Column(SQLEnum(TaskStatus), default=TaskStatus.PENDING)
    progress = Column(Integer, default=0)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    error_message = Column(String, nullable=True)
    error_type = Column(String, nullable=True)
    result = Column(JSON, nullable=True)
    created_by = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    last_heartbeat = Column(DateTime, nullable=True)
    checkpoint = Column(JSON, nullable=True)

    batch = relationship("Batch", back_populates="tasks")
