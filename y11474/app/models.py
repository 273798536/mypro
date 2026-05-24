import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.sqlite import JSON

from app.database import Base


class UserRole(str, enum.Enum):
    DATA_ENTRY = "data_entry"
    REVIEWER = "reviewer"
    SUPERVISOR = "supervisor"
    READ_ONLY = "read_only"


class RecordStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    REJECTED = "rejected"
    SECOND_CONFIRM = "second_confirm"
    AUDIT_ONLY = "audit_only"


class DirtyType(str, enum.Enum):
    MISSING_FIELD = "missing_field"
    CROSS_DATE = "cross_date"
    NAME_CHANGED = "name_changed"
    AMOUNT_CONFLICT = "amount_conflict"
    QUANTITY_CONFLICT = "quantity_conflict"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(Enum(UserRole), default=UserRole.DATA_ENTRY)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)


class ReturnApplication(Base):
    __tablename__ = "return_applications"

    id = Column(Integer, primary_key=True, index=True)
    application_no = Column(String, unique=True, index=True)
    batch_no = Column(String, index=True)
    sku_code = Column(String, index=True)
    sku_name = Column(String)
    supplier_id = Column(String, index=True)
    supplier_name = Column(String)
    supplier_contact = Column(String)
    supplier_phone = Column(String)
    return_quantity = Column(Integer)
    return_reason = Column(Text)
    application_date = Column(DateTime)
    applicant = Column(String)
    warehouse_id = Column(String)
    warehouse_name = Column(String)
    
    idempotency_key = Column(String, unique=True, index=True)
    status = Column(Enum(RecordStatus), default=RecordStatus.DRAFT)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    raw_data = Column(JSON)
    
    inspection_photos = relationship("InspectionPhoto", back_populates="application")
    logistics_receipts = relationship("LogisticsReceipt", back_populates="application")
    refund_records = relationship("RefundRecord", back_populates="application")
    ledger = relationship("LedgerRecord", back_populates="application", uselist=False)
    audit_logs = relationship("AuditLog", back_populates="application")
    dirty_records = relationship("DirtyRecord", back_populates="application")


class InspectionPhoto(Base):
    __tablename__ = "inspection_photos"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("return_applications.id"))
    photo_url = Column(String)
    photo_type = Column(String)
    upload_time = Column(DateTime)
    uploader = Column(String)
    description = Column(Text)
    is_defective = Column(Boolean, default=False)
    defect_detail = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    application = relationship("ReturnApplication", back_populates="inspection_photos")


class LogisticsReceipt(Base):
    __tablename__ = "logistics_receipts"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("return_applications.id"))
    tracking_no = Column(String, index=True)
    courier_company = Column(String)
    ship_date = Column(DateTime)
    receive_date = Column(DateTime, nullable=True)
    signatory = Column(String)
    receipt_url = Column(String)
    actual_quantity = Column(Integer)
    damaged_quantity = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    application = relationship("ReturnApplication", back_populates="logistics_receipts")


class RefundRecord(Base):
    __tablename__ = "refund_records"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("return_applications.id"))
    refund_no = Column(String, unique=True, index=True)
    refund_date = Column(DateTime)
    actual_amount = Column(Float)
    settlement_amount = Column(Float)
    difference_amount = Column(Float)
    difference_reason = Column(Text)
    confirmed_by = Column(String)
    confirmed_at = Column(DateTime, nullable=True)
    supplier_approved_batches = Column(JSON)
    disputed_batches = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    application = relationship("ReturnApplication", back_populates="refund_records")


class LedgerRecord(Base):
    __tablename__ = "ledger_records"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("return_applications.id"), unique=True)
    inventory_diff_quantity = Column(Integer, default=0)
    inventory_diff_reason = Column(Text)
    remaining_goods_status = Column(String)
    remaining_goods_quantity = Column(Integer, default=0)
    remaining_handler = Column(String, nullable=True)
    is_closed = Column(Boolean, default=False)
    closed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    closed_at = Column(DateTime, nullable=True)
    summary = Column(JSON)
    last_synced_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    
    application = relationship("ReturnApplication", back_populates="ledger")


class DirtyRecord(Base):
    __tablename__ = "dirty_records"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("return_applications.id"))
    dirty_type = Column(Enum(DirtyType))
    field_name = Column(String)
    original_value = Column(Text)
    current_value = Column(Text)
    handling_opinion = Column(Text)
    handled_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    handled_at = Column(DateTime, nullable=True)
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    raw_source = Column(JSON)
    
    application = relationship("ReturnApplication", back_populates="dirty_records")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("return_applications.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String)
    old_status = Column(Enum(RecordStatus), nullable=True)
    new_status = Column(Enum(RecordStatus), nullable=True)
    change_reason = Column(Text)
    changed_fields = Column(JSON)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    application = relationship("ReturnApplication", back_populates="audit_logs")
    user = relationship("User")


class SystemCheckLog(Base):
    __tablename__ = "system_check_logs"

    id = Column(Integer, primary_key=True, index=True)
    check_type = Column(String)
    check_result = Column(String)
    details = Column(JSON)
    passed = Column(Boolean)
    executed_at = Column(DateTime, default=datetime.utcnow)
    execution_time_ms = Column(Integer)
