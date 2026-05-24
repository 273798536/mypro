from enum import Enum as PyEnum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey, JSON, Enum, Boolean, Float
)
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()


class BatchStatus(PyEnum):
    DRAFT = "draft"
    IMPORTING = "importing"
    IMPORTED = "imported"
    REVIEWING = "reviewing"
    APPROVED = "approved"
    REJECTED = "rejected"
    FROZEN = "frozen"
    SETTLED = "settled"
    ARCHIVED = "archived"
    WITHDRAWN = "withdrawn"


class RecordStatus(PyEnum):
    PENDING = "pending"
    VERIFIED = "verified"
    CORRECTED = "corrected"
    WAIVED = "waived"
    INVALID = "invalid"
    DUPLICATE = "duplicate"


class RecordType(PyEnum):
    CHANGE_ORDER = "change_order"
    AUDIT_OPINION = "audit_opinion"
    CS_REFERENCE = "cs_reference"
    HANDOVER_PAPER = "handover_paper"


class UserRole(PyEnum):
    OPERATOR = "operator"
    REVIEWER = "reviewer"
    ADMIN = "admin"
    SETTLEMENT = "settlement"


class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String(50), unique=True, index=True, nullable=False)
    status = Column(Enum(BatchStatus), default=BatchStatus.DRAFT, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    created_by = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    imported_at = Column(DateTime)
    frozen_at = Column(DateTime)
    frozen_by = Column(String(50))
    frozen_reason = Column(Text)
    settled_at = Column(DateTime)
    settled_by = Column(String(50))
    archived_at = Column(DateTime)
    archived_by = Column(String(50))
    withdrawn_at = Column(DateTime)
    withdrawn_by = Column(String(50))
    withdrawn_reason = Column(Text)
    review_opinion = Column(Text)
    reviewed_by = Column(String(50))
    reviewed_at = Column(DateTime)
    status_before_frozen = Column(Enum(BatchStatus))
    extra_metadata = Column(JSON, default=dict)
    stats = Column(JSON, default=dict)

    records = relationship("Record", back_populates="batch", cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="batch", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="batch", cascade="all, delete-orphan")
    import_sources = relationship("ImportSource", back_populates="batch", cascade="all, delete-orphan")


class Record(Base):
    __tablename__ = "records"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False, index=True)
    record_type = Column(Enum(RecordType), nullable=False, index=True)
    status = Column(Enum(RecordStatus), default=RecordStatus.PENDING, index=True)
    unique_key = Column(String(200), index=True)
    
    original_data = Column(JSON, nullable=False)
    parsed_data = Column(JSON, nullable=False)
    
    source_file = Column(String(500))
    source_row = Column(Integer)
    source_sheet = Column(String(100))
    
    change_order_no = Column(String(100), index=True)
    audit_opinion_no = Column(String(100), index=True)
    cs_reference_no = Column(String(100), index=True)
    
    cs_agent_id = Column(String(50), index=True)
    cs_agent_name = Column(String(100))
    store_id = Column(String(50), index=True)
    store_name = Column(String(200))
    
    compensation_amount = Column(Float, default=0)
    is_correct = Column(Boolean)
    review_result = Column(String(50))
    review_reason = Column(Text)
    reviewer = Column(String(50))
    reviewed_at = Column(DateTime)
    
    correction_note = Column(Text)
    corrected_by = Column(String(50))
    corrected_at = Column(DateTime)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    error_message = Column(Text)
    warning_message = Column(Text)
    is_duplicate = Column(Boolean, default=False)
    duplicate_of_id = Column(Integer, ForeignKey("records.id"))
    
    extra_metadata = Column(JSON, default=dict)

    batch = relationship("Batch", back_populates="records")
    attachments = relationship("Attachment", back_populates="record")
    audit_logs = relationship("AuditLog", back_populates="record")


class ImportSource(Base):
    __tablename__ = "import_sources"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False, index=True)
    file_name = Column(String(500), nullable=False)
    file_path = Column(String(1000))
    file_hash = Column(String(64), index=True)
    file_size = Column(Integer)
    record_type = Column(Enum(RecordType), nullable=False)
    total_rows = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    imported_by = Column(String(50))
    imported_at = Column(DateTime, default=datetime.utcnow)
    sheet_name = Column(String(100))
    header_row = Column(Integer, default=1)
    parse_errors = Column(JSON, default=list)
    
    batch = relationship("Batch", back_populates="import_sources")


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), index=True)
    record_id = Column(Integer, ForeignKey("records.id"), index=True)
    file_name = Column(String(500), nullable=False)
    file_path = Column(String(1000))
    file_hash = Column(String(64), index=True)
    file_size = Column(Integer)
    mime_type = Column(String(100))
    attachment_type = Column(String(50))
    description = Column(Text)
    uploaded_by = Column(String(50))
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    extra_metadata = Column(JSON, default=dict)

    batch = relationship("Batch", back_populates="attachments")
    record = relationship("Record", back_populates="attachments")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), index=True)
    record_id = Column(Integer, ForeignKey("records.id"), index=True)
    action = Column(String(50), nullable=False, index=True)
    old_status = Column(String(50))
    new_status = Column(String(50))
    reason = Column(Text)
    operator = Column(String(50), nullable=False)
    operator_role = Column(String(50))
    operated_at = Column(DateTime, default=datetime.utcnow, index=True)
    ip_address = Column(String(50))
    user_agent = Column(String(500))
    changes = Column(JSON, default=dict)
    extra_metadata = Column(JSON, default=dict)

    batch = relationship("Batch", back_populates="audit_logs")
    record = relationship("Record", back_populates="audit_logs")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(200), nullable=False)
    full_name = Column(String(100))
    role = Column(Enum(UserRole), default=UserRole.OPERATOR)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime)
