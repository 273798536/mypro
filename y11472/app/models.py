from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean, JSON, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from app.enums import (
    ReturnApplicationStatus,
    CompensationStatus,
    ReceiptSource,
    DisputeCategory,
    UserRole,
    OperationType,
)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100))
    email = Column(String(100))
    role = Column(SAEnum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ReturnApplication(Base):
    __tablename__ = "return_applications"

    id = Column(Integer, primary_key=True, index=True)
    application_no = Column(String(50), unique=True, index=True, nullable=False)
    supplier_id = Column(String(50), index=True, nullable=False)
    supplier_name = Column(String(100))
    warehouse_id = Column(String(50), index=True)
    total_items = Column(Integer, default=0)
    total_amount = Column(Float, default=0.0)
    status = Column(SAEnum(ReturnApplicationStatus), default=ReturnApplicationStatus.DRAFT)
    description = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    updated_by = Column(Integer, ForeignKey("users.id"))

    items = relationship("ReturnItem", back_populates="application", cascade="all, delete-orphan")
    quality_records = relationship("QualityRecord", back_populates="application", cascade="all, delete-orphan")
    logistics_records = relationship("LogisticsRecord", back_populates="application", cascade="all, delete-orphan")
    external_receipts = relationship("ExternalReceipt", back_populates="application", cascade="all, delete-orphan")
    compensation_queues = relationship("CompensationQueue", back_populates="application", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="application", cascade="all, delete-orphan")


class ReturnItem(Base):
    __tablename__ = "return_items"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("return_applications.id"), nullable=False)
    sku_code = Column(String(50), index=True, nullable=False)
    sku_name = Column(String(100))
    batch_no = Column(String(50), index=True)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, default=0.0)
    amount = Column(Float, default=0.0)
    supplier_accepted_qty = Column(Integer, default=0)
    supplier_rejected_qty = Column(Integer, default=0)
    disputed_qty = Column(Integer, default=0)
    dispute_category = Column(SAEnum(DisputeCategory))
    dispute_reason = Column(Text)
    compensation_amount = Column(Float, default=0.0)
    compensation_status = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    application = relationship("ReturnApplication", back_populates="items")


class QualityRecord(Base):
    __tablename__ = "quality_records"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("return_applications.id"), nullable=False)
    record_no = Column(String(50), unique=True, index=True, nullable=False)
    item_id = Column(Integer, ForeignKey("return_items.id"))
    inspector_id = Column(Integer, ForeignKey("users.id"))
    inspection_result = Column(String(50))
    defect_description = Column(Text)
    photo_urls = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    application = relationship("ReturnApplication", back_populates="quality_records")


class LogisticsRecord(Base):
    __tablename__ = "logistics_records"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("return_applications.id"), nullable=False)
    tracking_no = Column(String(50), unique=True, index=True, nullable=False)
    carrier = Column(String(50))
    shipment_date = Column(DateTime(timezone=True))
    delivery_date = Column(DateTime(timezone=True))
    weight = Column(Float)
    package_count = Column(Integer, default=1)
    signed_by = Column(String(100))
    receipt_photo_url = Column(String(500))
    status = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    application = relationship("ReturnApplication", back_populates="logistics_records")


class ExternalReceipt(Base):
    __tablename__ = "external_receipts"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("return_applications.id"), nullable=False)
    receipt_no = Column(String(50), unique=True, index=True, nullable=False)
    source = Column(SAEnum(ReceiptSource), default=ReceiptSource.EXTERNAL_RECEIPT)
    supplier_id = Column(String(50))
    confirmed_items = Column(JSON)
    disputed_items = Column(JSON)
    total_confirmed_qty = Column(Integer, default=0)
    total_disputed_qty = Column(Integer, default=0)
    confirmation_date = Column(DateTime(timezone=True))
    received_by = Column(String(100))
    notes = Column(Text)
    raw_data = Column(JSON)
    import_batch_no = Column(String(50), index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))

    application = relationship("ReturnApplication", back_populates="external_receipts")


class CompensationQueue(Base):
    __tablename__ = "compensation_queues"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("return_applications.id"), nullable=False)
    queue_no = Column(String(50), unique=True, index=True, nullable=False)
    status = Column(SAEnum(CompensationStatus), default=CompensationStatus.PENDING)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    next_retry_at = Column(DateTime(timezone=True))
    last_error = Column(Text)
    error_stack = Column(Text)
    source_receipt_id = Column(Integer, ForeignKey("external_receipts.id"))
    disputed_items_summary = Column(JSON)
    total_compensation_amount = Column(Float, default=0.0)
    processed_items = Column(JSON)
    failed_items = Column(JSON)
    assigned_to = Column(Integer, ForeignKey("users.id"))
    frozen_until = Column(DateTime(timezone=True))
    is_frozen = Column(Boolean, default=False)
    freeze_reason = Column(Text)
    frozen_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True))

    application = relationship("ReturnApplication", back_populates="compensation_queues")
    retry_history = relationship("RetryHistory", back_populates="queue_item", cascade="all, delete-orphan")


class RetryHistory(Base):
    __tablename__ = "retry_history"

    id = Column(Integer, primary_key=True, index=True)
    queue_id = Column(Integer, ForeignKey("compensation_queues.id"), nullable=False)
    attempt_no = Column(Integer, nullable=False)
    status = Column(String(50))
    error_message = Column(Text)
    processed_items = Column(JSON)
    failed_items = Column(JSON)
    started_at = Column(DateTime(timezone=True))
    finished_at = Column(DateTime(timezone=True))

    queue_item = relationship("CompensationQueue", back_populates="retry_history")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("return_applications.id"))
    queue_id = Column(Integer, ForeignKey("compensation_queues.id"))
    operation_type = Column(SAEnum(OperationType), nullable=False)
    operator_id = Column(Integer, ForeignKey("users.id"))
    operator_name = Column(String(100))
    old_status = Column(String(50))
    new_status = Column(String(50))
    change_reason = Column(Text)
    field_changes = Column(JSON)
    ip_address = Column(String(50))
    user_agent = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    application = relationship("ReturnApplication", back_populates="audit_logs")


class SystemCheck(Base):
    __tablename__ = "system_checks"

    id = Column(Integer, primary_key=True, index=True)
    check_name = Column(String(100), nullable=False)
    check_type = Column(String(50))
    status = Column(String(20))
    message = Column(Text)
    details = Column(JSON)
    checked_at = Column(DateTime(timezone=True), server_default=func.now())
    checked_by = Column(Integer, ForeignKey("users.id"))
