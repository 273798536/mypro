from sqlalchemy import Column, Integer, String, DateTime, Float, Text, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class BookingRecord(Base):
    __tablename__ = "booking_records"

    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(String, index=True)
    room_name = Column(String, index=True)
    booker = Column(String)
    department = Column(String)
    meeting_topic = Column(String)
    start_time = Column(DateTime, index=True)
    end_time = Column(DateTime, index=True)
    attendee_count = Column(Integer)
    has_tea_break = Column(Boolean, default=False)
    has_equipment = Column(Boolean, default=False)
    status = Column(String, default="scheduled")
    raw_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    access_records = relationship("AccessRecord", back_populates="booking")
    cancel_messages = relationship("CancelMessage", back_populates="booking")
    process_records = relationship("ProcessRecord", back_populates="booking")
    supplier_bills = relationship("SupplierBill", back_populates="booking")


class AccessRecord(Base):
    __tablename__ = "access_records"

    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(String, index=True)
    booking_id = Column(Integer, ForeignKey("booking_records.id"), nullable=True)
    room_name = Column(String, index=True)
    card_number = Column(String)
    person_name = Column(String)
    access_time = Column(DateTime, index=True)
    access_type = Column(String)
    raw_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

    booking = relationship("BookingRecord", back_populates="access_records")


class CancelMessage(Base):
    __tablename__ = "cancel_messages"

    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(String, index=True)
    booking_id = Column(Integer, ForeignKey("booking_records.id"), nullable=True)
    room_name = Column(String, index=True)
    cancel_time = Column(DateTime, index=True)
    canceler = Column(String)
    cancel_reason = Column(Text)
    meeting_start_time = Column(DateTime)
    raw_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

    booking = relationship("BookingRecord", back_populates="cancel_messages")


class SupplierBill(Base):
    __tablename__ = "supplier_bills"

    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(String, index=True)
    booking_id = Column(Integer, ForeignKey("booking_records.id"), nullable=True)
    room_name = Column(String, index=True)
    supplier_name = Column(String)
    service_type = Column(String)
    quantity = Column(Float)
    unit_price = Column(Float)
    total_amount = Column(Float)
    bill_date = Column(DateTime, index=True)
    meeting_date = Column(DateTime)
    raw_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

    booking = relationship("BookingRecord", back_populates="supplier_bills")


class ProcessRecord(Base):
    __tablename__ = "process_records"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(String, index=True)
    booking_id = Column(Integer, ForeignKey("booking_records.id"))
    process_type = Column(String)
    status = Column(String)
    error_type = Column(String, nullable=True)
    error_message = Column(Text, nullable=True)
    original_value = Column(JSON, nullable=True)
    corrected_value = Column(JSON, nullable=True)
    handling_suggestion = Column(Text, nullable=True)
    is_dirty = Column(Boolean, default=False)
    is_resolved = Column(Boolean, default=False)
    processed_at = Column(DateTime, default=datetime.utcnow)
    processed_by = Column(String, default="system")

    booking = relationship("BookingRecord", back_populates="process_records")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    operation = Column(String)
    table_name = Column(String)
    record_id = Column(Integer)
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    change_reason = Column(Text, nullable=True)
    operator = Column(String)
    operation_time = Column(DateTime, default=datetime.utcnow)


class ImportHistory(Base):
    __tablename__ = "import_history"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(String, unique=True, index=True)
    import_type = Column(String)
    source_file = Column(String)
    record_count = Column(Integer)
    success_count = Column(Integer, default=0)
    duplicate_count = Column(Integer, default=0)
    error_count = Column(Integer, default=0)
    duplicate_handling = Column(String, default="skip")
    imported_at = Column(DateTime, default=datetime.utcnow)
    imported_by = Column(String, default="system")
    raw_summary = Column(JSON)
