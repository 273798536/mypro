from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class UserRole(str, enum.Enum):
    DATA_ENTRY = "data_entry"
    REVIEWER = "reviewer"
    SUPERVISOR = "supervisor"
    READ_ONLY = "read_only"


class CompensationStatus(str, enum.Enum):
    PENDING = "pending"
    QUEUED = "queued"
    PROCESSING = "processing"
    RETRYING = "retrying"
    MANUAL_TAKEOVER = "manual_takeover"
    COMPLETED = "completed"
    CLOSED = "closed"
    DEAD_LETTER = "dead_letter"
    FAILED = "failed"


class IssueType(str, enum.Enum):
    SHORTAGE = "shortage"
    DAMAGED = "damaged"
    WRONG_PRICE = "wrong_price"
    OTHER = "other"


class RetryCategory(str, enum.Enum):
    RETRYABLE = "retryable"
    NEED_MANUAL = "need_manual"
    NON_RETRYABLE = "non_retryable"


class DataSource(str, enum.Enum):
    LEADER_REFUND = "leader_refund"
    WAREHOUSE_REVIEW = "warehouse_review"
    USER_REMARK = "user_remark"
    MANUAL_PRICE_ADJUST = "manual_price_adjust"
    HISTORICAL_IMPORT = "historical_import"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    full_name = Column(String(100))
    hashed_password = Column(String(255))
    role = Column(Enum(UserRole), default=UserRole.READ_ONLY)
    city = Column(String(50))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class LeaderRefund(Base):
    __tablename__ = "leader_refunds"

    id = Column(Integer, primary_key=True, index=True)
    refund_no = Column(String(50), unique=True, index=True)
    order_no = Column(String(50), index=True)
    leader_id = Column(String(50), index=True)
    leader_name = Column(String(100))
    city = Column(String(50), index=True)
    refund_amount = Column(Float)
    compensation_amount = Column(Float, default=0)
    issue_type = Column(Enum(IssueType))
    remark = Column(Text)
    submitted_at = Column(DateTime(timezone=True))
    is_verified = Column(Boolean, default=False)
    verified_by = Column(Integer, ForeignKey("users.id"))
    verified_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    source = Column(Enum(DataSource), default=DataSource.LEADER_REFUND)
    batch_no = Column(String(50))


class WarehouseReview(Base):
    __tablename__ = "warehouse_reviews"

    id = Column(Integer, primary_key=True, index=True)
    review_no = Column(String(50), unique=True, index=True)
    order_no = Column(String(50), index=True)
    sku_code = Column(String(50))
    sku_name = Column(String(200))
    city = Column(String(50), index=True)
    shortage_qty = Column(Integer, default=0)
    damaged_qty = Column(Integer, default=0)
    unit_price = Column(Float)
    compensation_amount = Column(Float, default=0)
    issue_type = Column(Enum(IssueType))
    reviewer_id = Column(String(50))
    reviewed_at = Column(DateTime(timezone=True))
    images = Column(JSON)
    is_verified = Column(Boolean, default=False)
    verified_by = Column(Integer, ForeignKey("users.id"))
    verified_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    source = Column(Enum(DataSource), default=DataSource.WAREHOUSE_REVIEW)
    batch_no = Column(String(50))


class UserRemark(Base):
    __tablename__ = "user_remarks"

    id = Column(Integer, primary_key=True, index=True)
    remark_no = Column(String(50), unique=True, index=True)
    order_no = Column(String(50), index=True)
    user_id = Column(String(50))
    user_name = Column(String(100))
    city = Column(String(50), index=True)
    content = Column(Text)
    issue_type = Column(Enum(IssueType))
    compensation_amount = Column(Float, default=0)
    submitted_at = Column(DateTime(timezone=True))
    is_verified = Column(Boolean, default=False)
    verified_by = Column(Integer, ForeignKey("users.id"))
    verified_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    source = Column(Enum(DataSource), default=DataSource.USER_REMARK)
    batch_no = Column(String(50))


class ManualPriceAdjust(Base):
    __tablename__ = "manual_price_adjusts"

    id = Column(Integer, primary_key=True, index=True)
    adjust_no = Column(String(50), unique=True, index=True)
    order_no = Column(String(50), index=True)
    city = Column(String(50), index=True)
    original_price = Column(Float)
    adjusted_price = Column(Float)
    price_diff = Column(Float)
    compensation_amount = Column(Float, default=0)
    reason = Column(Text)
    operator_id = Column(String(50))
    operated_at = Column(DateTime(timezone=True))
    is_verified = Column(Boolean, default=False)
    verified_by = Column(Integer, ForeignKey("users.id"))
    verified_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    source = Column(Enum(DataSource), default=DataSource.MANUAL_PRICE_ADJUST)
    batch_no = Column(String(50))


class CompensationQueue(Base):
    __tablename__ = "compensation_queues"

    id = Column(Integer, primary_key=True, index=True)
    queue_no = Column(String(50), unique=True, index=True)
    order_no = Column(String(50), index=True)
    city = Column(String(50), index=True)
    source_type = Column(Enum(DataSource))
    source_id = Column(Integer)
    source_table = Column(String(50))
    issue_type = Column(Enum(IssueType))
    compensation_amount = Column(Float, default=0)
    actual_compensation = Column(Float, default=0)
    status = Column(Enum(CompensationStatus), default=CompensationStatus.PENDING)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    retry_category = Column(Enum(RetryCategory))
    last_retry_at = Column(DateTime(timezone=True))
    next_retry_at = Column(DateTime(timezone=True))
    assigned_to = Column(Integer, ForeignKey("users.id"))
    completed_at = Column(DateTime(timezone=True))
    closed_by = Column(Integer, ForeignKey("users.id"))
    closed_at = Column(DateTime(timezone=True))
    close_reason = Column(Text)
    external_receipt_id = Column(String(100))
    external_receipt_status = Column(String(50))
    external_receipt_data = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    batch_no = Column(String(50), index=True)


class RetryLog(Base):
    __tablename__ = "retry_logs"

    id = Column(Integer, primary_key=True, index=True)
    queue_id = Column(Integer, ForeignKey("compensation_queues.id"), index=True)
    retry_number = Column(Integer)
    status_before = Column(String(50))
    status_after = Column(String(50))
    action = Column(String(100))
    error_message = Column(Text)
    response_data = Column(JSON)
    operator_id = Column(Integer, ForeignKey("users.id"))
    operator_name = Column(String(100))
    diff_data = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class FailedRecord(Base):
    __tablename__ = "failed_records"

    id = Column(Integer, primary_key=True, index=True)
    source_type = Column(Enum(DataSource))
    source_table = Column(String(50))
    source_data = Column(JSON)
    batch_no = Column(String(50), index=True)
    error_type = Column(String(100))
    error_message = Column(Text)
    city = Column(String(50), index=True)
    is_resolved = Column(Boolean, default=False)
    resolved_by = Column(Integer, ForeignKey("users.id"))
    resolved_at = Column(DateTime(timezone=True))
    resolution_note = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ImportBatch(Base):
    __tablename__ = "import_batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String(50), unique=True, index=True)
    file_name = Column(String(255))
    source_type = Column(Enum(DataSource))
    total_count = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    imported_by = Column(Integer, ForeignKey("users.id"))
    imported_at = Column(DateTime(timezone=True), server_default=func.now())
    city = Column(String(50), index=True)
    is_historical = Column(Boolean, default=False)


class OperationLog(Base):
    __tablename__ = "operation_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    user_name = Column(String(100))
    action = Column(String(100))
    table_name = Column(String(50))
    record_id = Column(Integer)
    field_name = Column(String(100))
    old_value = Column(Text)
    new_value = Column(Text)
    diff_data = Column(JSON)
    ip_address = Column(String(50))
    user_agent = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
