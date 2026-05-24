from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import (
    Column, Integer, String, DateTime, Text, ForeignKey, Enum, Boolean, JSON
)
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


class RecordState(PyEnum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    FROZEN = "frozen"
    SETTLED = "settled"
    RECALLED = "recalled"
    ARCHIVED = "archived"


class BatchState(PyEnum):
    CREATED = "created"
    IMPORTING = "importing"
    PARTIAL_FAILED = "partial_failed"
    PENDING_REVIEW = "pending_review"
    FROZEN = "frozen"
    SETTLED = "settled"
    RECALLED = "recalled"
    ARCHIVED = "archived"


class DataSource(PyEnum):
    CALENDAR = "calendar"
    ACCESS_CARD = "access_card"
    CANCEL_MESSAGE = "cancel_message"
    PHOTO = "photo"
    MANUAL = "manual"


class Batch(Base):
    __tablename__ = "batches"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    state = Column(Enum(BatchState), default=BatchState.CREATED, nullable=False)
    created_by = Column(String, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    frozen_at = Column(DateTime)
    frozen_by = Column(String)
    frozen_reason = Column(Text)
    settled_at = Column(DateTime)
    settled_by = Column(String)
    extra_data = Column(JSON, default=dict)

    records = relationship("AbnormalRecord", back_populates="batch")
    state_logs = relationship("BatchStateLog", back_populates="batch", order_by="BatchStateLog.change_time")
    original_files = relationship("OriginalFile", back_populates="batch")


class AbnormalRecord(Base):
    __tablename__ = "abnormal_records"

    id = Column(String, primary_key=True)
    batch_id = Column(String, ForeignKey("batches.id"), nullable=False)
    state = Column(Enum(RecordState), default=RecordState.DRAFT, nullable=False)
    source = Column(Enum(DataSource), nullable=False)

    room_code = Column(String, nullable=False)
    room_name = Column(String)
    appointment_id = Column(String)
    appointment_subject = Column(String)
    appointment_date = Column(DateTime, nullable=False)
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    booker = Column(String)
    booker_dept = Column(String)

    has_access_record = Column(Boolean)
    access_person = Column(String)
    access_time = Column(DateTime)

    has_cancel_message = Column(Boolean)
    cancel_time = Column(DateTime)
    cancel_operator = Column(String)

    actual_cost = Column(Integer)
    estimated_cost = Column(Integer)
    cost_recovery_status = Column(String)

    reviewer = Column(String)
    review_time = Column(DateTime)
    review_reason = Column(Text)
    manual_override = Column(Boolean, default=False)
    override_reason = Column(Text)
    override_by = Column(String)
    override_time = Column(DateTime)

    final_result = Column(String)
    final_remark = Column(Text)

    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    batch = relationship("Batch", back_populates="records")
    original_evidences = relationship("OriginalEvidence", back_populates="record")
    state_logs = relationship("RecordStateLog", back_populates="record", order_by="RecordStateLog.change_time")
    attachments = relationship("Attachment", back_populates="record")


class OriginalEvidence(Base):
    __tablename__ = "original_evidences"

    id = Column(Integer, primary_key=True, autoincrement=True)
    record_id = Column(String, ForeignKey("abnormal_records.id"), nullable=False)
    source_file_id = Column(Integer, ForeignKey("original_files.id"))
    original_row_number = Column(Integer)
    original_value = Column(Text, nullable=False)
    parsed_field = Column(String, nullable=False)
    parsed_value = Column(Text)
    parse_note = Column(Text)

    created_at = Column(DateTime, default=func.now())

    record = relationship("AbnormalRecord", back_populates="original_evidences")
    source_file = relationship("OriginalFile")


class OriginalFile(Base):
    __tablename__ = "original_files"

    id = Column(Integer, primary_key=True, autoincrement=True)
    batch_id = Column(String, ForeignKey("batches.id"), nullable=False)
    file_name = Column(String, nullable=False)
    file_hash = Column(String)
    file_size = Column(Integer)
    source_type = Column(Enum(DataSource), nullable=False)
    uploaded_by = Column(String)
    uploaded_at = Column(DateTime, default=func.now())
    total_rows = Column(Integer)
    success_rows = Column(Integer)
    failed_rows = Column(Integer)

    batch = relationship("Batch", back_populates="original_files")


class RecordStateLog(Base):
    __tablename__ = "record_state_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    record_id = Column(String, ForeignKey("abnormal_records.id"), nullable=False)
    from_state = Column(Enum(RecordState))
    to_state = Column(Enum(RecordState), nullable=False)
    operator = Column(String, nullable=False)
    reason = Column(Text, nullable=False)
    change_time = Column(DateTime, default=func.now(), nullable=False)
    log_data = Column(JSON, default=dict)

    record = relationship("AbnormalRecord", back_populates="state_logs")


class BatchStateLog(Base):
    __tablename__ = "batch_state_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    batch_id = Column(String, ForeignKey("batches.id"), nullable=False)
    from_state = Column(Enum(BatchState))
    to_state = Column(Enum(BatchState), nullable=False)
    operator = Column(String, nullable=False)
    reason = Column(Text, nullable=False)
    change_time = Column(DateTime, default=func.now(), nullable=False)
    log_data = Column(JSON, default=dict)

    batch = relationship("Batch", back_populates="state_logs")


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    record_id = Column(String, ForeignKey("abnormal_records.id"), nullable=False)
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String)
    file_size = Column(Integer)
    uploaded_by = Column(String)
    uploaded_at = Column(DateTime, default=func.now())
    description = Column(Text)

    record = relationship("AbnormalRecord", back_populates="attachments")
