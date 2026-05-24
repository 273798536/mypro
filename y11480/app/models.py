from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class UserRole(str, enum.Enum):
    DATA_ENTRY = "data_entry"
    REVIEWER = "reviewer"
    SUPERVISOR = "supervisor"
    READ_ONLY = "read_only"


class BatchStatus(str, enum.Enum):
    CREATED = "created"
    ATTACHMENTS_UPLOADED = "attachments_uploaded"
    REVIEWING = "reviewing"
    REVIEWED = "reviewed"
    FROZEN = "frozen"
    SETTLED = "settled"
    WITHDRAWN = "withdrawn"
    ARCHIVED = "archived"


class DirtyRecordType(str, enum.Enum):
    MISSING_FIELDS = "missing_fields"
    CROSS_DATE = "cross_date"
    NAME_CHANGED = "name_changed"
    AMOUNT_CONFLICT = "amount_conflict"
    QUANTITY_CONFLICT = "quantity_conflict"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    full_name = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    created_batches = relationship("Batch", foreign_keys="Batch.created_by", back_populates="creator")
    reviewed_batches = relationship("Batch", foreign_keys="Batch.reviewed_by", back_populates="reviewer")
    comments = relationship("SupervisorComment", back_populates="supervisor")


class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String(50), unique=True, index=True, nullable=False)
    pot_no = Column(String(50), index=True, nullable=False)
    product_name = Column(String(200), nullable=False)
    production_date = Column(DateTime, nullable=False)
    status = Column(Enum(BatchStatus), default=BatchStatus.CREATED, nullable=False)

    before_freeze_status = Column(Enum(BatchStatus))
    freeze_reason = Column(Text)

    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    reviewed_by = Column(Integer, ForeignKey("users.id"))
    reviewed_at = Column(DateTime(timezone=True))
    review_result = Column(String(50))
    review_comment = Column(Text)

    settled_at = Column(DateTime(timezone=True))
    settled_by = Column(Integer, ForeignKey("users.id"))

    withdrawn_at = Column(DateTime(timezone=True))
    withdrawn_by = Column(Integer, ForeignKey("users.id"))
    withdraw_reason = Column(Text)

    archived_at = Column(DateTime(timezone=True))

    creator = relationship("User", foreign_keys=[created_by], back_populates="created_batches")
    reviewer = relationship("User", foreign_keys=[reviewed_by], back_populates="reviewed_batches")

    sample_labels = relationship("SampleLabel", back_populates="batch", cascade="all, delete-orphan")
    temperature_records = relationship("TemperatureRecord", back_populates="batch", cascade="all, delete-orphan")
    store_complaints = relationship("StoreComplaint", back_populates="batch", cascade="all, delete-orphan")
    supervisor_comments = relationship("SupervisorComment", back_populates="batch", cascade="all, delete-orphan")
    status_history = relationship("StatusHistory", back_populates="batch", cascade="all, delete-orphan")
    dirty_records = relationship("DirtyRecord", back_populates="batch", cascade="all, delete-orphan")
    affected_stores = relationship("AffectedStore", back_populates="batch", cascade="all, delete-orphan")


class SampleLabel(Base):
    __tablename__ = "sample_labels"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    idempotency_key = Column(String(100), index=True)

    label_code = Column(String(100))
    sample_time = Column(DateTime)
    sampler = Column(String(50))
    sample_location = Column(String(100))
    quantity = Column(Float)
    unit = Column(String(20))
    storage_condition = Column(String(100))

    raw_data = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    batch = relationship("Batch", back_populates="sample_labels")


class TemperatureRecord(Base):
    __tablename__ = "temperature_records"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    idempotency_key = Column(String(100), index=True)

    record_time = Column(DateTime)
    temperature = Column(Float)
    measure_point = Column(String(100))
    recorder = Column(String(50))
    is_abnormal = Column(Boolean, default=False)
    remark = Column(Text)

    raw_data = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    batch = relationship("Batch", back_populates="temperature_records")


class StoreComplaint(Base):
    __tablename__ = "store_complaints"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    idempotency_key = Column(String(100), index=True)

    store_name = Column(String(200))
    store_code = Column(String(50))
    complaint_time = Column(DateTime)
    complaint_type = Column(String(100))
    complaint_content = Column(Text)
    quantity = Column(Float)
    amount = Column(Float)
    contact_person = Column(String(50))
    contact_phone = Column(String(50))
    status = Column(String(50), default="pending")

    raw_data = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    batch = relationship("Batch", back_populates="store_complaints")


class SupervisorComment(Base):
    __tablename__ = "supervisor_comments"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    supervisor_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    comment_type = Column(String(50))
    content = Column(Text, nullable=False)
    attachment_urls = Column(JSON)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    batch = relationship("Batch", back_populates="supervisor_comments")
    supervisor = relationship("User", back_populates="comments")


class StatusHistory(Base):
    __tablename__ = "status_history"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)

    from_status = Column(Enum(BatchStatus))
    to_status = Column(Enum(BatchStatus), nullable=False)
    changed_by = Column(Integer, ForeignKey("users.id"))
    change_reason = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    batch = relationship("Batch", back_populates="status_history")


class DirtyRecord(Base):
    __tablename__ = "dirty_records"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"))
    source_type = Column(String(50), nullable=False)
    source_id = Column(String(100))

    dirty_type = Column(Enum(DirtyRecordType), nullable=False)
    description = Column(Text, nullable=False)

    raw_content = Column(JSON, nullable=False)
    processing_opinion = Column(Text)
    is_resolved = Column(Boolean, default=False)
    resolved_by = Column(Integer, ForeignKey("users.id"))
    resolved_at = Column(DateTime(timezone=True))

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    batch = relationship("Batch", back_populates="dirty_records")


class AffectedStore(Base):
    __tablename__ = "affected_stores"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)

    store_name = Column(String(200), nullable=False)
    store_code = Column(String(50))
    quantity_received = Column(Float)
    quantity_used = Column(Float)
    quantity_remaining = Column(Float)
    distribution_time = Column(DateTime)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    batch = relationship("Batch", back_populates="affected_stores")


class IdempotencyRecord(Base):
    __tablename__ = "idempotency_records"

    id = Column(Integer, primary_key=True, index=True)
    idempotency_key = Column(String(100), unique=True, index=True, nullable=False)
    request_type = Column(String(50), nullable=False)
    record_id = Column(Integer)
    record_type = Column(String(50))

    created_at = Column(DateTime(timezone=True), server_default=func.now())
