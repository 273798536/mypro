from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Enum, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

Base = declarative_base()


class RoleEnum(str, enum.Enum):
    DATA_ENTRY = "data_entry"
    REVIEWER = "reviewer"
    SUPERVISOR = "supervisor"
    READ_ONLY = "read_only"


class OrderStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    REVIEWED = "reviewed"
    FROZEN = "frozen"
    REJECTED = "rejected"


class FabricAction(str, enum.Enum):
    IN = "in"
    OUT = "out"


class AuditAction(str, enum.Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    SUBMIT = "submit"
    REVIEW = "review"
    FREEZE = "freeze"
    IMPORT = "import"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class StyleOrder(Base):
    __tablename__ = "style_orders"

    id = Column(Integer, primary_key=True)
    order_no = Column(String(50), unique=True, nullable=False)
    style_code = Column(String(50), nullable=False)
    style_name = Column(String(200))
    version = Column(Integer, default=1)
    parent_id = Column(Integer, ForeignKey("style_orders.id"))
    batch_no = Column(String(50))
    status = Column(Enum(OrderStatus), default=OrderStatus.DRAFT)
    created_by = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    reviewed_by = Column(String(50))
    reviewed_at = Column(DateTime)
    frozen_by = Column(String(50))
    frozen_at = Column(DateTime)

    parent = relationship("StyleOrder", remote_side=[id], backref="children")
    size_modifications = relationship("SizeModification", back_populates="style_order")
    fabric_transactions = relationship("FabricTransaction", back_populates="style_order")
    scan_records = relationship("ScanRecord", back_populates="style_order")


class SizeModification(Base):
    __tablename__ = "size_modifications"

    id = Column(Integer, primary_key=True)
    style_order_id = Column(Integer, ForeignKey("style_orders.id"))
    size_code = Column(String(30), nullable=False)
    part_name = Column(String(100), nullable=False)
    old_value = Column(Float)
    new_value = Column(Float, nullable=False)
    modification_reason = Column(Text)
    version = Column(Integer, default=1)
    created_by = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)

    style_order = relationship("StyleOrder", back_populates="size_modifications")


class FabricTransaction(Base):
    __tablename__ = "fabric_transactions"

    id = Column(Integer, primary_key=True)
    style_order_id = Column(Integer, ForeignKey("style_orders.id"))
    fabric_code = Column(String(50), nullable=False)
    fabric_name = Column(String(200))
    action = Column(Enum(FabricAction), nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String(20), default="meter")
    batch_no = Column(String(50))
    warehouse = Column(String(100))
    operator = Column(String(50))
    transaction_time = Column(DateTime, default=datetime.utcnow)
    remark = Column(Text)
    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)

    style_order = relationship("StyleOrder", back_populates="fabric_transactions")


class ScanRecord(Base):
    __tablename__ = "scan_records"

    id = Column(Integer, primary_key=True)
    style_order_id = Column(Integer, ForeignKey("style_orders.id"))
    scan_code = Column(String(100), nullable=False)
    scan_type = Column(String(50))
    fabric_code = Column(String(50))
    quantity = Column(Float, default=1)
    scan_time = Column(DateTime, default=datetime.utcnow)
    scanner = Column(String(50))
    location = Column(String(100))
    remark = Column(Text)
    is_valid = Column(Boolean, default=True)
    validation_error = Column(Text)

    style_order = relationship("StyleOrder", back_populates="scan_records")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(Integer, nullable=False)
    action = Column(Enum(AuditAction), nullable=False)
    operator = Column(String(50))
    old_values = Column(Text)
    new_values = Column(Text)
    diff_summary = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class FailedRecord(Base):
    __tablename__ = "failed_records"

    id = Column(Integer, primary_key=True)
    record_type = Column(String(50), nullable=False)
    raw_data = Column(Text, nullable=False)
    error_message = Column(Text, nullable=False)
    source = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
