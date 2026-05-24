from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Text,
    Boolean,
    ForeignKey,
    Enum,
    Float,
)
from sqlalchemy.orm import relationship

from .database import Base


class RecordType(PyEnum):
    QUALIFICATION = "qualification"
    PRICE_VERSION = "price_version"
    SEALED_SCAN = "sealed_scan"
    ANOMALY_PHOTO = "anomaly_photo"


class RecordStatus(PyEnum):
    VALID = "valid"
    INVALID = "invalid"
    FIXED = "fixed"
    PENDING = "pending"


class OperationType(PyEnum):
    IMPORT = "import"
    UPDATE = "update"
    FIX = "fix"
    DELETE = "delete"
    CHECK = "check"


class UserRole(PyEnum):
    ADMIN = "admin"
    OPERATOR = "operator"
    VIEWER = "viewer"


class BidRecord(Base):
    __tablename__ = "bid_records"

    id = Column(Integer, primary_key=True, index=True)
    record_key = Column(String, unique=True, index=True, nullable=False)
    record_type = Column(Enum(RecordType), nullable=False)
    source_file = Column(String, nullable=False)
    source_row = Column(Integer, nullable=True)
    version = Column(Integer, default=1)
    status = Column(Enum(RecordStatus), default=RecordStatus.PENDING)

    supplier_name = Column(String, nullable=True)
    qualification_type = Column(String, nullable=True)
    qualification_level = Column(String, nullable=True)
    valid_until = Column(DateTime, nullable=True)

    price_version = Column(String, nullable=True)
    total_amount = Column(Float, nullable=True)
    currency = Column(String, default="CNY")

    scan_page = Column(Integer, nullable=True)
    scan_hash = Column(String, nullable=True)

    photo_path = Column(String, nullable=True)
    anomaly_type = Column(String, nullable=True)

    remark = Column(Text, nullable=True)
    customer_remark = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(String, nullable=True)

    failures = relationship("ImportFailure", back_populates="record", cascade="all, delete-orphan")
    history = relationship("RecordHistory", back_populates="record", cascade="all, delete-orphan")


class ImportFailure(Base):
    __tablename__ = "import_failures"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("bid_records.id"), nullable=True)
    source_file = Column(String, nullable=False)
    source_row = Column(Integer, nullable=False)
    error_code = Column(String, nullable=False)
    error_message = Column(Text, nullable=False)
    field_name = Column(String, nullable=True)
    raw_value = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)

    record = relationship("BidRecord", back_populates="failures")


class RecordHistory(Base):
    __tablename__ = "record_history"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("bid_records.id"), nullable=False)
    operation = Column(Enum(OperationType), nullable=False)
    old_values = Column(Text, nullable=True)
    new_values = Column(Text, nullable=True)
    operated_by = Column(String, nullable=False)
    operated_at = Column(DateTime, default=datetime.utcnow)
    remark = Column(Text, nullable=True)

    record = relationship("BidRecord", back_populates="history")


class ImportSession(Base):
    __tablename__ = "import_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True, nullable=False)
    import_type = Column(Enum(RecordType), nullable=False)
    source_file = Column(String, nullable=False)
    file_hash = Column(String, nullable=False)
    total_rows = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    failure_count = Column(Integer, default=0)
    imported_by = Column(String, nullable=False)
    imported_at = Column(DateTime, default=datetime.utcnow)
    is_duplicate = Column(Boolean, default=False)


class CheckRule(Base):
    __tablename__ = "check_rules"

    id = Column(Integer, primary_key=True, index=True)
    rule_code = Column(String, unique=True, index=True, nullable=False)
    rule_name = Column(String, nullable=False)
    rule_type = Column(String, nullable=False)
    is_enabled = Column(Boolean, default=True)
    description = Column(Text, nullable=True)


class CheckResult(Base):
    __tablename__ = "check_results"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, nullable=False)
    rule_code = Column(String, nullable=False)
    is_passed = Column(Boolean, default=False)
    detail = Column(Text, nullable=True)
    checked_at = Column(DateTime, default=datetime.utcnow)
