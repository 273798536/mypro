from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Float, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class DataBatch(Base):
    __tablename__ = "data_batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String(50), unique=True, index=True, nullable=False)
    source = Column(String(100), nullable=False)
    operator = Column(String(100), nullable=False)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(20), default="processing")
    duplicate_strategy = Column(String(20), default="ignore")
    total_count = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    fail_count = Column(Integer, default=0)
    remark = Column(Text)

    appointments = relationship("Appointment", back_populates="batch")
    locations = relationship("TechnicianLocation", back_populates="batch")
    reviews = relationship("UserReview", back_populates="batch")
    photos = relationship("AbnormalPhoto", back_populates="batch")


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    appointment_no = Column(String(50), index=True, nullable=False)
    batch_id = Column(Integer, ForeignKey("data_batches.id"))
    order_no = Column(String(50), index=True)
    user_name = Column(String(100))
    user_phone = Column(String(20))
    address = Column(String(500))
    appliance_type = Column(String(50))
    appliance_model = Column(String(100))
    service_type = Column(String(50))
    scheduled_time = Column(DateTime(timezone=True))
    actual_time = Column(DateTime(timezone=True))
    technician_id = Column(String(50), index=True)
    technician_name = Column(String(100))
    status = Column(String(20), default="scheduled")
    is_rescheduled = Column(Boolean, default=False)
    original_appointment_no = Column(String(50))
    is_second_visit = Column(Boolean, default=False)
    parent_appointment_no = Column(String(50))
    is_withdrawn = Column(Boolean, default=False)
    withdrawn_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    extra_data = Column(JSON)

    batch = relationship("DataBatch", back_populates="appointments")
    locations = relationship("TechnicianLocation", back_populates="appointment")
    reviews = relationship("UserReview", back_populates="appointment")
    photos = relationship("AbnormalPhoto", back_populates="appointment")
    complaints = relationship("Complaint", back_populates="appointment")
    remarks = relationship("ServiceRemark", back_populates="appointment")


class TechnicianLocation(Base):
    __tablename__ = "technician_locations"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("data_batches.id"))
    appointment_no = Column(String(50), ForeignKey("appointments.appointment_no"), index=True)
    technician_id = Column(String(50), index=True)
    latitude = Column(Float)
    longitude = Column(Float)
    location_time = Column(DateTime(timezone=True))
    location_type = Column(String(20))
    accuracy = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    batch = relationship("DataBatch", back_populates="locations")
    appointment = relationship("Appointment", back_populates="locations")


class UserReview(Base):
    __tablename__ = "user_reviews"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("data_batches.id"))
    appointment_no = Column(String(50), ForeignKey("appointments.appointment_no"), index=True)
    review_no = Column(String(50), unique=True, index=True)
    rating = Column(Integer)
    is_negative = Column(Boolean, default=False)
    negative_reason = Column(String(200))
    negative_reason_detail = Column(Text)
    review_content = Column(Text)
    reviewer_name = Column(String(100))
    reviewer_phone = Column(String(20))
    review_time = Column(DateTime(timezone=True))
    manually_adjusted = Column(Boolean, default=False)
    adjusted_by = Column(String(100))
    adjusted_at = Column(DateTime(timezone=True))
    adjustment_reason = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    batch = relationship("DataBatch", back_populates="reviews")
    appointment = relationship("Appointment", back_populates="reviews")
    complaints = relationship("Complaint", back_populates="review")


class AbnormalPhoto(Base):
    __tablename__ = "abnormal_photos"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("data_batches.id"))
    appointment_no = Column(String(50), ForeignKey("appointments.appointment_no"), index=True)
    photo_no = Column(String(50), unique=True, index=True)
    photo_type = Column(String(50))
    photo_url = Column(String(500))
    photo_path = Column(String(500))
    upload_time = Column(DateTime(timezone=True))
    uploader = Column(String(100))
    description = Column(Text)
    is_abnormal = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    batch = relationship("DataBatch", back_populates="photos")
    appointment = relationship("Appointment", back_populates="photos")


class ServiceRemark(Base):
    __tablename__ = "service_remarks"

    id = Column(Integer, primary_key=True, index=True)
    appointment_no = Column(String(50), ForeignKey("appointments.appointment_no"), index=True)
    operator = Column(String(100), nullable=False)
    remark_type = Column(String(50))
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    appointment = relationship("Appointment", back_populates="remarks")


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    complaint_no = Column(String(50), unique=True, index=True, nullable=False)
    appointment_no = Column(String(50), ForeignKey("appointments.appointment_no"), index=True)
    review_id = Column(Integer, ForeignKey("user_reviews.id"))
    complaint_type = Column(String(50))
    complaint_reason = Column(String(500))
    status = Column(String(20), default="pending")
    merged_from = Column(JSON)
    merge_evidence = Column(JSON)
    is_merged = Column(Boolean, default=False)
    handled_by = Column(String(100))
    handled_at = Column(DateTime(timezone=True))
    handle_result = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    appointment = relationship("Appointment", back_populates="complaints")
    review = relationship("UserReview", back_populates="complaints")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    operation_type = Column(String(50), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(100), nullable=False)
    operator = Column(String(100), nullable=False)
    operation_time = Column(DateTime(timezone=True), server_default=func.now())
    old_value = Column(JSON)
    new_value = Column(JSON)
    change_reason = Column(Text)
    ip_address = Column(String(50))
    user_agent = Column(String(500))


class ExportTask(Base):
    __tablename__ = "export_tasks"

    id = Column(Integer, primary_key=True, index=True)
    task_no = Column(String(50), unique=True, index=True)
    task_type = Column(String(50))
    operator = Column(String(100))
    filters = Column(JSON)
    is_frozen = Column(Boolean, default=False)
    frozen_at = Column(DateTime(timezone=True))
    frozen_by = Column(String(100))
    file_path = Column(String(500))
    file_name = Column(String(200))
    status = Column(String(20), default="pending")
    record_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
