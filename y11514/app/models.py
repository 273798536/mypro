from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class UserRole(str, enum.Enum):
    DATA_ENTRY = "data_entry"
    REVIEWER = "reviewer"
    SUPERVISOR = "supervisor"
    READ_ONLY = "read_only"


class WorkflowStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    REJECTED = "rejected"
    SECOND_CONFIRM = "second_confirm"
    FINALIZED = "finalized"


class RecordStatus(str, enum.Enum):
    NORMAL = "normal"
    DIRTY_MISSING_FIELD = "dirty_missing_field"
    DIRTY_CROSS_DAY = "dirty_cross_day"
    DIRTY_NAME_CHANGE = "dirty_name_change"
    DIRTY_AMOUNT_CONFLICT = "dirty_amount_conflict"
    DIRTY_QUANTITY_CONFLICT = "dirty_quantity_conflict"
    CORRECTED = "corrected"
    NEEDS_MANUAL_CONFIRM = "needs_manual_confirm"


class DamageType(str, enum.Enum):
    OVERDUE = "overdue"
    SOILED = "soiled"
    LOST = "lost"
    DAMAGED = "damaged"
    OTHER = "other"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(Enum(UserRole), default=UserRole.READ_ONLY)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), onupdate=func.now())


class BorrowApplication(Base):
    __tablename__ = "borrow_applications"

    id = Column(Integer, primary_key=True, index=True)
    application_no = Column(String, unique=True, index=True)
    reader_name = Column(String, index=True)
    reader_id = Column(String, index=True)
    reader_department = Column(String)
    book_title = Column(String)
    book_isbn = Column(String)
    book_author = Column(String)
    lending_library = Column(String)
    borrowing_library = Column(String)
    apply_date = Column(DateTime(timezone=True))
    expected_return_date = Column(DateTime(timezone=True))
    actual_return_date = Column(DateTime(timezone=True))
    renew_count = Column(Integer, default=0)
    latest_renew_date = Column(DateTime(timezone=True))
    status = Column(Enum(WorkflowStatus), default=WorkflowStatus.DRAFT)
    record_status = Column(Enum(RecordStatus), default=RecordStatus.NORMAL)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_by = Column(Integer, ForeignKey("users.id"))
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    raw_original_data = Column(Text)
    processing_notes = Column(Text)
    rejection_reason = Column(Text)

    express_orders = relationship("ExpressOrder", back_populates="borrow_application")
    compensation_records = relationship("CompensationRecord", back_populates="borrow_application")
    refund_records = relationship("RefundRecord", back_populates="borrow_application")


class ExpressOrder(Base):
    __tablename__ = "express_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_no = Column(String, unique=True, index=True)
    borrow_application_id = Column(Integer, ForeignKey("borrow_applications.id"))
    sender_name = Column(String)
    sender_phone = Column(String)
    receiver_name = Column(String)
    receiver_phone = Column(String)
    send_address = Column(String)
    receive_address = Column(String)
    send_date = Column(DateTime(timezone=True))
    receive_date = Column(DateTime(timezone=True))
    express_company = Column(String)
    shipping_cost = Column(Float)
    cost_borne_by = Column(String)
    status = Column(Enum(WorkflowStatus), default=WorkflowStatus.DRAFT)
    record_status = Column(Enum(RecordStatus), default=RecordStatus.NORMAL)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_by = Column(Integer, ForeignKey("users.id"))
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    raw_original_data = Column(Text)
    processing_notes = Column(Text)
    rejection_reason = Column(Text)

    borrow_application = relationship("BorrowApplication", back_populates="express_orders")


class CompensationRecord(Base):
    __tablename__ = "compensation_records"

    id = Column(Integer, primary_key=True, index=True)
    record_no = Column(String, unique=True, index=True)
    borrow_application_id = Column(Integer, ForeignKey("borrow_applications.id"))
    reader_name = Column(String)
    reader_id = Column(String)
    damage_type = Column(Enum(DamageType))
    damage_description = Column(Text)
    compensation_amount = Column(Float)
    overdue_days = Column(Integer)
    daily_overdue_fee = Column(Float)
    soiling_fee = Column(Float)
    other_fees = Column(Float)
    total_amount = Column(Float)
    paid_amount = Column(Float, default=0)
    payment_date = Column(DateTime(timezone=True))
    payment_method = Column(String)
    status = Column(Enum(WorkflowStatus), default=WorkflowStatus.DRAFT)
    record_status = Column(Enum(RecordStatus), default=RecordStatus.NORMAL)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_by = Column(Integer, ForeignKey("users.id"))
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    raw_original_data = Column(Text)
    processing_notes = Column(Text)
    rejection_reason = Column(Text)

    borrow_application = relationship("BorrowApplication", back_populates="compensation_records")
    refund_records = relationship("RefundRecord", back_populates="compensation_record")


class RefundRecord(Base):
    __tablename__ = "refund_records"

    id = Column(Integer, primary_key=True, index=True)
    refund_no = Column(String, unique=True, index=True)
    compensation_record_id = Column(Integer, ForeignKey("compensation_records.id"))
    borrow_application_id = Column(Integer, ForeignKey("borrow_applications.id"))
    reader_name = Column(String)
    reader_id = Column(String)
    refund_amount = Column(Float)
    refund_reason = Column(Text)
    refund_date = Column(DateTime(timezone=True))
    refund_method = Column(String)
    related_flow_no = Column(String)
    status = Column(Enum(WorkflowStatus), default=WorkflowStatus.DRAFT)
    record_status = Column(Enum(RecordStatus), default=RecordStatus.NORMAL)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_by = Column(Integer, ForeignKey("users.id"))
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    raw_original_data = Column(Text)
    processing_notes = Column(Text)
    rejection_reason = Column(Text)

    compensation_record = relationship("CompensationRecord", back_populates="refund_records")
    borrow_application = relationship("BorrowApplication", back_populates="refund_records")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    user_name = Column(String)
    user_role = Column(String)
    action = Column(String)
    table_name = Column(String)
    record_id = Column(Integer)
    field_name = Column(String)
    old_value = Column(Text)
    new_value = Column(Text)
    change_reason = Column(Text)
    ip_address = Column(String)
    user_agent = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ImportRecord(Base):
    __tablename__ = "import_records"

    id = Column(Integer, primary_key=True, index=True)
    import_batch_no = Column(String, index=True)
    file_name = Column(String)
    record_type = Column(String)
    total_count = Column(Integer)
    success_count = Column(Integer)
    error_count = Column(Integer)
    duplicate_count = Column(Integer)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    error_details = Column(Text)


class InventoryDifference(Base):
    __tablename__ = "inventory_differences"

    id = Column(Integer, primary_key=True, index=True)
    difference_no = Column(String, unique=True, index=True)
    inventory_date = Column(DateTime(timezone=True))
    book_title = Column(String)
    book_isbn = Column(String)
    expected_quantity = Column(Integer)
    actual_quantity = Column(Integer)
    difference_quantity = Column(Integer)
    difference_type = Column(String)
    related_application_no = Column(String)
    handling_suggestion = Column(Text)
    status = Column(Enum(WorkflowStatus), default=WorkflowStatus.DRAFT)
    record_status = Column(Enum(RecordStatus), default=RecordStatus.NORMAL)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_by = Column(Integer, ForeignKey("users.id"))
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    raw_original_data = Column(Text)
    processing_notes = Column(Text)
