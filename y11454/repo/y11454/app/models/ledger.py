from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Numeric, Boolean, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class LedgerStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    REJECTED = "rejected"
    SECOND_CONFIRMED = "second_confirmed"
    AUDIT_READY = "audit_ready"


class RecordType(str, enum.Enum):
    OUTBOUND_ORDER = "outbound_order"
    RETURN_PHOTO = "return_photo"
    MAINTENANCE_ESTIMATE = "maintenance_estimate"
    SUPPLIER_STATEMENT = "supplier_statement"


class DirtyRecordType(str, enum.Enum):
    MISSING_FIELD = "missing_field"
    CROSS_DAY = "cross_day"
    NAME_CHANGED = "name_changed"
    AMOUNT_CONFLICT = "amount_conflict"
    QUANTITY_CONFLICT = "quantity_conflict"


class DuplicateHandling(str, enum.Enum):
    OVERWRITE = "overwrite"
    IGNORE = "ignore"


class EquipmentLedger(Base):
    __tablename__ = "equipment_ledger"

    id = Column(Integer, primary_key=True, index=True)
    batch_number = Column(String(50), index=True, nullable=False)
    record_type = Column(SQLEnum(RecordType), nullable=False)
    status = Column(SQLEnum(LedgerStatus), default=LedgerStatus.DRAFT)
    
    customer_name = Column(String(100))
    equipment_name = Column(String(100))
    equipment_model = Column(String(50))
    quantity = Column(Integer)
    unit_price = Column(Numeric(10, 2))
    total_amount = Column(Numeric(12, 2))
    deposit_amount = Column(Numeric(12, 2))
    deposit_deducted = Column(Numeric(12, 2), default=0)
    
    rental_start_date = Column(DateTime)
    rental_end_date = Column(DateTime)
    actual_return_date = Column(DateTime)
    
    is_dirty = Column(Boolean, default=False)
    dirty_type = Column(JSON)
    dirty_note = Column(Text)
    original_content = Column(JSON)
    correction_note = Column(Text)
    
    is_duplicate = Column(Boolean, default=False)
    duplicate_handling = Column(SQLEnum(DuplicateHandling))
    duplicate_note = Column(Text)
    original_batch_number = Column(String(50))
    
    created_by = Column(Integer, ForeignKey("users.id"))
    reviewed_by = Column(Integer, ForeignKey("users.id"))
    second_confirmed_by = Column(Integer, ForeignKey("users.id"))
    
    rejection_reason = Column(Text)
    change_reason = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    submitted_at = Column(DateTime(timezone=True))
    reviewed_at = Column(DateTime(timezone=True))
    second_confirmed_at = Column(DateTime(timezone=True))
    
    attachments = relationship("Attachment", back_populates="ledger", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="ledger", cascade="all, delete-orphan")


class OutboundOrder(Base):
    __tablename__ = "outbound_orders"

    id = Column(Integer, primary_key=True, index=True)
    ledger_id = Column(Integer, ForeignKey("equipment_ledger.id"))
    order_number = Column(String(50), unique=True, index=True)
    warehouse = Column(String(100))
    handler = Column(String(100))
    outbound_date = Column(DateTime)
    remark = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ReturnPhoto(Base):
    __tablename__ = "return_photos"

    id = Column(Integer, primary_key=True, index=True)
    ledger_id = Column(Integer, ForeignKey("equipment_ledger.id"))
    photo_url = Column(String(500))
    photo_type = Column(String(50))
    uploader = Column(String(100))
    description = Column(Text)
    taken_at = Column(DateTime)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class MaintenanceEstimate(Base):
    __tablename__ = "maintenance_estimates"

    id = Column(Integer, primary_key=True, index=True)
    ledger_id = Column(Integer, ForeignKey("equipment_ledger.id"))
    estimate_number = Column(String(50), unique=True, index=True)
    maintenance_type = Column(String(100))
    estimated_cost = Column(Numeric(12, 2))
    actual_cost = Column(Numeric(12, 2))
    estimator = Column(String(100))
    maintenance_date = Column(DateTime)
    remark = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SupplierStatement(Base):
    __tablename__ = "supplier_statements"

    id = Column(Integer, primary_key=True, index=True)
    ledger_id = Column(Integer, ForeignKey("equipment_ledger.id"))
    statement_number = Column(String(50), unique=True, index=True)
    supplier_name = Column(String(100))
    billing_cycle = Column(String(50))
    total_billed = Column(Numeric(12, 2))
    paid_amount = Column(Numeric(12, 2))
    unpaid_amount = Column(Numeric(12, 2))
    due_date = Column(DateTime)
    remark = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
