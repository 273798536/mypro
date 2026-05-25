from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Text, Boolean, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.sqlite import JSON

from app.core.database import Base
from app.models.enums import UserRole, RecordStatus, DirtyType, RecordSource, ReviewResult


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    full_name = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)


class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String, unique=True, index=True, nullable=False)
    name = Column(String)
    region = Column(String, index=True)
    status = Column(Enum(RecordStatus), default=RecordStatus.DRAFT)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    remark = Column(Text)
    
    freeze_reason = Column(Text)
    freeze_time = Column(DateTime)
    unfreeze_reason = Column(Text)
    unfreeze_time = Column(DateTime)
    status_before_freeze = Column(Enum(RecordStatus))
    
    summary_cache = Column(JSON)
    summary_updated_at = Column(DateTime)

    creator = relationship("User", foreign_keys=[created_by])
    appointment_orders = relationship("AppointmentOrder", back_populates="batch", cascade="all, delete-orphan")
    technician_locations = relationship("TechnicianLocation", back_populates="batch", cascade="all, delete-orphan")
    user_reviews = relationship("UserReview", back_populates="batch", cascade="all, delete-orphan")
    external_receipts = relationship("ExternalReceipt", back_populates="batch", cascade="all, delete-orphan")
    dirty_records = relationship("DirtyRecord", back_populates="batch", cascade="all, delete-orphan")
    status_logs = relationship("StatusLog", back_populates="batch", cascade="all, delete-orphan")


class AppointmentOrder(Base):
    __tablename__ = "appointment_orders"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"))
    order_no = Column(String, index=True)
    customer_name = Column(String)
    customer_phone = Column(String)
    address = Column(String)
    product_name = Column(String)
    quantity = Column(Integer, default=1)
    appointment_time = Column(DateTime)
    technician_id = Column(String)
    technician_name = Column(String)
    status = Column(String)
    is_rescheduled = Column(Boolean, default=False)
    reschedule_count = Column(Integer, default=0)
    is_second_visit = Column(Boolean, default=False)
    amount = Column(Float, default=0)
    raw_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    batch = relationship("Batch", back_populates="appointment_orders")


class TechnicianLocation(Base):
    __tablename__ = "technician_locations"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"))
    technician_id = Column(String, index=True)
    technician_name = Column(String)
    order_no = Column(String, index=True)
    checkin_time = Column(DateTime)
    checkout_time = Column(DateTime)
    latitude = Column(Float)
    longitude = Column(Float)
    location_address = Column(String)
    stay_duration = Column(Integer)
    raw_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

    batch = relationship("Batch", back_populates="technician_locations")


class UserReview(Base):
    __tablename__ = "user_reviews"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"))
    order_no = Column(String, index=True)
    customer_name = Column(String)
    customer_phone = Column(String)
    rating = Column(Integer)
    review_content = Column(Text)
    review_time = Column(DateTime)
    has_quality_issue = Column(Boolean, default=False)
    bad_review_reason = Column(String)
    bad_review_found = Column(Boolean, default=False)
    raw_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

    batch = relationship("Batch", back_populates="user_reviews")


class ExternalReceipt(Base):
    __tablename__ = "external_receipts"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"))
    receipt_no = Column(String, index=True)
    order_no = Column(String, index=True)
    receipt_type = Column(String)
    quantity = Column(Integer, default=1)
    amount = Column(Float)
    receipt_time = Column(DateTime)
    handler = Column(String)
    status = Column(String)
    raw_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

    batch = relationship("Batch", back_populates="external_receipts")


class DirtyRecord(Base):
    __tablename__ = "dirty_records"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"))
    source = Column(Enum(RecordSource), nullable=False)
    dirty_type = Column(Enum(DirtyType), nullable=False)
    record_id = Column(String)
    target_model = Column(String)
    target_record_id = Column(Integer)
    field_name = Column(String)
    original_value = Column(Text)
    corrected_value = Column(Text)
    raw_content = Column(JSON)
    handling_opinion = Column(Text)
    is_resolved = Column(Boolean, default=False)
    is_applied = Column(Boolean, default=False)
    resolved_by = Column(Integer, ForeignKey("users.id"))
    resolved_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    batch = relationship("Batch", back_populates="dirty_records")
    resolver = relationship("User", foreign_keys=[resolved_by])


class StatusLog(Base):
    __tablename__ = "status_logs"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"))
    from_status = Column(Enum(RecordStatus))
    to_status = Column(Enum(RecordStatus), nullable=False)
    operator_id = Column(Integer, ForeignKey("users.id"))
    operation_time = Column(DateTime, default=datetime.utcnow)
    reason = Column(Text)
    manual_reason = Column(Text)

    batch = relationship("Batch", back_populates="status_logs")
    operator = relationship("User", foreign_keys=[operator_id])


class ReviewRecord(Base):
    __tablename__ = "review_records"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"))
    reviewer_id = Column(Integer, ForeignKey("users.id"))
    review_result = Column(Enum(ReviewResult), nullable=False)
    review_time = Column(DateTime, default=datetime.utcnow)
    comment = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    reviewer = relationship("User", foreign_keys=[reviewer_id])
