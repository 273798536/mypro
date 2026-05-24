from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class UserRole(str, enum.Enum):
    DATA_ENTRY = "data_entry"
    REVIEWER = "reviewer"
    SUPERVISOR = "supervisor"
    VIEWER = "viewer"


class ReceiptStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    REVIEWING = "reviewing"
    APPROVED = "approved"
    REJECTED = "rejected"
    FROZEN = "frozen"
    SETTLED = "settled"
    ARCHIVED = "archived"


class DirtyRecordType(str, enum.Enum):
    MISSING_FIELD = "missing_field"
    CROSS_DAY = "cross_day"
    NAME_CHANGED = "name_changed"
    AMOUNT_CONFLICT = "amount_conflict"
    QUANTITY_CONFLICT = "quantity_conflict"


class AuditAction(str, enum.Enum):
    CREATE = "create"
    UPDATE = "update"
    SUBMIT = "submit"
    REVIEW = "review"
    APPROVE = "approve"
    REJECT = "reject"
    FREEZE = "freeze"
    UNFREEZE = "unfreeze"
    SETTLE = "settle"
    ARCHIVE = "archive"
    UPLOAD_ATTACHMENT = "upload_attachment"
    FIX_DIRTY = "fix_dirty"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100))
    role = Column(Enum(UserRole), nullable=False, default=UserRole.VIEWER)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    created_receipts = relationship("Receipt", back_populates="creator", foreign_keys="Receipt.created_by")
    operated_logs = relationship("AuditLog", back_populates="operator")


class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    total_count = Column(Integer, default=0)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    receipts = relationship("Receipt", back_populates="batch")


class Receipt(Base):
    __tablename__ = "receipts"

    id = Column(Integer, primary_key=True, index=True)
    receipt_no = Column(String(50), unique=True, index=True, nullable=False)
    batch_id = Column(Integer, ForeignKey("batches.id"))
    
    material_id = Column(String(100), index=True, nullable=False)
    material_name = Column(String(200))
    original_material_name = Column(String(200))
    
    platform = Column(String(50), index=True)
    review_result = Column(String(50))
    review_comment = Column(Text)
    
    daily_cost = Column(Float)
    daily_impressions = Column(Integer)
    daily_clicks = Column(Integer)
    
    secondary_confirmation = Column(String(200))
    confirmation_date = Column(DateTime(timezone=True))
    
    report_date = Column(DateTime(timezone=True), index=True)
    cost_amount = Column(Float)
    
    status = Column(Enum(ReceiptStatus), default=ReceiptStatus.DRAFT, index=True)
    prev_status = Column(Enum(ReceiptStatus))
    
    freeze_reason = Column(Text)
    review_remark = Column(Text)
    
    has_dirty = Column(Boolean, default=False)
    dirty_types = Column(JSON)
    
    raw_data = Column(JSON)
    process_opinion = Column(Text)
    
    created_by = Column(Integer, ForeignKey("users.id"))
    reviewed_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    batch = relationship("Batch", back_populates="receipts")
    creator = relationship("User", back_populates="created_receipts", foreign_keys=[created_by])
    status_histories = relationship("StatusHistory", back_populates="receipt")
    attachments = relationship("Attachment", back_populates="receipt")
    dirty_records = relationship("DirtyRecord", back_populates="receipt")
    audit_logs = relationship("AuditLog", back_populates="receipt")


class StatusHistory(Base):
    __tablename__ = "status_histories"

    id = Column(Integer, primary_key=True, index=True)
    receipt_id = Column(Integer, ForeignKey("receipts.id"))
    from_status = Column(Enum(ReceiptStatus))
    to_status = Column(Enum(ReceiptStatus))
    reason = Column(Text)
    operator_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    receipt = relationship("Receipt", back_populates="status_histories")


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True, index=True)
    receipt_id = Column(Integer, ForeignKey("receipts.id"))
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer)
    file_type = Column(String(50))
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    receipt = relationship("Receipt", back_populates="attachments")


class DirtyRecord(Base):
    __tablename__ = "dirty_records"

    id = Column(Integer, primary_key=True, index=True)
    receipt_id = Column(Integer, ForeignKey("receipts.id"))
    dirty_type = Column(Enum(DirtyRecordType), nullable=False)
    field_name = Column(String(100))
    original_value = Column(Text)
    expected_value = Column(Text)
    description = Column(Text)
    is_fixed = Column(Boolean, default=False)
    fixed_by = Column(Integer, ForeignKey("users.id"))
    fixed_at = Column(DateTime(timezone=True))
    fix_note = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    receipt = relationship("Receipt", back_populates="dirty_records")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    receipt_id = Column(Integer, ForeignKey("receipts.id"))
    action = Column(Enum(AuditAction), nullable=False)
    operator_id = Column(Integer, ForeignKey("users.id"))
    details = Column(JSON)
    ip_address = Column(String(50))
    user_agent = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    receipt = relationship("Receipt", back_populates="audit_logs")
    operator = relationship("User", back_populates="operated_logs")
