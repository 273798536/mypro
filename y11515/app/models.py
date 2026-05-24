from sqlalchemy import Column, Integer, String, DateTime, Float, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class RecordState:
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    FROZEN = "frozen"
    ARCHIVED = "archived"
    WITHDRAWN = "withdrawn"

    STATES = [DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, FROZEN, ARCHIVED, WITHDRAWN]


class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String, unique=True, index=True)
    source_file = Column(String)
    source_file_name = Column(String)
    operator = Column(String)
    station = Column(String)
    total_count = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    status = Column(String, default=RecordState.DRAFT)
    is_frozen = Column(Boolean, default=False)
    frozen_at = Column(DateTime)
    frozen_by = Column(String)
    freeze_reason = Column(Text)
    unfrozen_at = Column(DateTime)
    unfrozen_by = Column(String)
    unfreeze_reason = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    records = relationship("Record", back_populates="batch", cascade="all, delete-orphan")
    state_histories = relationship("BatchStateHistory", back_populates="batch", cascade="all, delete-orphan")
    attachments = relationship("BatchAttachment", back_populates="batch", cascade="all, delete-orphan")


class Record(Base):
    __tablename__ = "records"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"))
    original_row_no = Column(Integer)
    work_order_no = Column(String, index=True)
    valve_code = Column(String)
    valve_name = Column(String)
    inventory_before = Column(Float)
    used_quantity = Column(Float)
    inventory_after = Column(Float)
    is_negative_inventory = Column(Boolean, default=False)
    repair_date = Column(DateTime)
    site = Column(String)
    construction_person = Column(String)
    status = Column(String, default=RecordState.DRAFT)
    original_status = Column(String)
    review_reason = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    batch = relationship("Batch", back_populates="records")
    state_histories = relationship("RecordStateHistory", back_populates="record", cascade="all, delete-orphan")
    attachments = relationship("RecordAttachment", back_populates="record", cascade="all, delete-orphan")
    override_records = relationship("OverrideRecord", back_populates="record", cascade="all, delete-orphan")
    original_data = relationship("OriginalRecordData", back_populates="record", uselist=False, cascade="all, delete-orphan")


class OriginalRecordData(Base):
    __tablename__ = "original_record_data"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("records.id"))
    raw_data = Column(Text)
    parsed_data = Column(Text)
    source_file = Column(String)
    source_row_no = Column(Integer)
    created_at = Column(DateTime, server_default=func.now())

    record = relationship("Record", back_populates="original_data")


class RecordAttachment(Base):
    __tablename__ = "record_attachments"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("records.id"))
    attachment_type = Column(String)
    file_name = Column(String)
    file_path = Column(String)
    file_size = Column(Integer)
    uploaded_by = Column(String)
    uploaded_at = Column(DateTime, server_default=func.now())
    description = Column(Text)

    record = relationship("Record", back_populates="attachments")


class BatchAttachment(Base):
    __tablename__ = "batch_attachments"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"))
    attachment_type = Column(String)
    file_name = Column(String)
    file_path = Column(String)
    file_size = Column(Integer)
    uploaded_by = Column(String)
    uploaded_at = Column(DateTime, server_default=func.now())
    description = Column(Text)

    batch = relationship("Batch", back_populates="attachments")


class RecordStateHistory(Base):
    __tablename__ = "record_state_histories"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("records.id"))
    from_state = Column(String)
    to_state = Column(String)
    transition_type = Column(String)
    operator = Column(String)
    reason = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

    record = relationship("Record", back_populates="state_histories")


class BatchStateHistory(Base):
    __tablename__ = "batch_state_histories"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"))
    from_state = Column(String)
    to_state = Column(String)
    transition_type = Column(String)
    operator = Column(String)
    reason = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

    batch = relationship("Batch", back_populates="state_histories")


class OverrideRecord(Base):
    __tablename__ = "override_records"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("records.id"))
    original_status = Column(String)
    new_status = Column(String)
    override_reason = Column(Text)
    operator = Column(String)
    permission_level = Column(String)
    created_at = Column(DateTime, server_default=func.now())

    record = relationship("Record", back_populates="override_records")
