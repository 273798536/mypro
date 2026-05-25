from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from .database import Base


class UserRole(str, enum.Enum):
    DATA_ENTRY = "data_entry"
    REVIEWER = "reviewer"
    SUPERVISOR = "supervisor"
    READ_ONLY = "read_only"


class BatchStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    FROZEN = "frozen"
    ARCHIVED = "archived"
    REJECTED = "rejected"


class DirtyRecordType(str, enum.Enum):
    MISSING_FIELD = "missing_field"
    CROSS_DAY = "cross_day"
    NAME_CHANGED = "name_changed"
    AMOUNT_CONFLICT = "amount_conflict"
    QUANTITY_CONFLICT = "quantity_conflict"


class RecordType(str, enum.Enum):
    CHECKIN = "checkin"
    DEPOSIT = "deposit"
    ROOM_CHANGE = "room_change"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    role = Column(Enum(UserRole), default=UserRole.READ_ONLY)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AuditBatch(Base):
    __tablename__ = "audit_batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String, unique=True, index=True)
    audit_date = Column(DateTime)
    status = Column(Enum(BatchStatus), default=BatchStatus.DRAFT)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    frozen_at = Column(DateTime(timezone=True), nullable=True)
    frozen_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    freeze_reason = Column(Text, nullable=True)
    archived_at = Column(DateTime(timezone=True), nullable=True)
    archived_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    creator = relationship("User", foreign_keys=[created_by])
    freezer = relationship("User", foreign_keys=[frozen_by])
    archiver = relationship("User", foreign_keys=[archived_by])
    checkins = relationship("CheckinRecord", back_populates="batch")
    deposits = relationship("DepositRecord", back_populates="batch")
    room_changes = relationship("RoomChangeRecord", back_populates="batch")
    comments = relationship("SupervisorComment", back_populates="batch")
    dirty_records = relationship("DirtyRecord", back_populates="batch")
    state_transitions = relationship("StateTransition", back_populates="batch")


class CheckinRecord(Base):
    __tablename__ = "checkin_records"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("audit_batches.id"))
    record_no = Column(String, index=True)
    guest_name = Column(String)
    id_card = Column(String)
    room_no = Column(String)
    room_type = Column(String)
    checkin_time = Column(DateTime)
    checkout_time = Column(DateTime, nullable=True)
    planned_checkout = Column(DateTime, nullable=True)
    room_rate = Column(Float, default=0)
    actual_room_fee = Column(Float, default=0)
    invoice_amount = Column(Float, default=0)
    is_extended = Column(Boolean, default=False)
    original_checkout = Column(DateTime, nullable=True)
    source = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    raw_data = Column(Text)

    batch = relationship("AuditBatch", back_populates="checkins")


class DepositRecord(Base):
    __tablename__ = "deposit_records"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("audit_batches.id"))
    record_no = Column(String, index=True)
    checkin_record_no = Column(String, index=True)
    guest_name = Column(String)
    room_no = Column(String)
    deposit_amount = Column(Float, default=0)
    deposit_method = Column(String)
    deposit_time = Column(DateTime)
    refund_amount = Column(Float, default=0)
    refund_time = Column(DateTime, nullable=True)
    balance = Column(Float, default=0)
    source = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    raw_data = Column(Text)

    batch = relationship("AuditBatch", back_populates="deposits")


class RoomChangeRecord(Base):
    __tablename__ = "room_change_records"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("audit_batches.id"))
    record_no = Column(String, index=True)
    checkin_record_no = Column(String, index=True)
    guest_name = Column(String)
    old_room_no = Column(String)
    new_room_no = Column(String)
    old_room_type = Column(String)
    new_room_type = Column(String)
    change_time = Column(DateTime)
    old_room_rate = Column(Float, default=0)
    new_room_rate = Column(Float, default=0)
    rate_difference = Column(Float, default=0)
    reason = Column(String)
    operator = Column(String)
    source = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    raw_data = Column(Text)

    batch = relationship("AuditBatch", back_populates="room_changes")


class SupervisorComment(Base):
    __tablename__ = "supervisor_comments"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("audit_batches.id"))
    comment = Column(Text)
    comment_type = Column(String)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    batch = relationship("AuditBatch", back_populates="comments")
    creator = relationship("User")


class DirtyRecord(Base):
    __tablename__ = "dirty_records"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("audit_batches.id"))
    record_type = Column(Enum(RecordType))
    record_id = Column(Integer)
    dirty_type = Column(Enum(DirtyRecordType))
    description = Column(String)
    field_name = Column(String, nullable=True)
    original_value = Column(Text, nullable=True)
    corrected_value = Column(Text, nullable=True)
    is_resolved = Column(Boolean, default=False)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolution_note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    batch = relationship("AuditBatch", back_populates="dirty_records")
    resolver = relationship("User")


class StateTransition(Base):
    __tablename__ = "state_transitions"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("audit_batches.id"))
    from_status = Column(Enum(BatchStatus))
    to_status = Column(Enum(BatchStatus))
    transition_by = Column(Integer, ForeignKey("users.id"))
    transition_at = Column(DateTime(timezone=True), server_default=func.now())
    reason = Column(Text)
    snapshot_before = Column(Text)
    snapshot_after = Column(Text)

    batch = relationship("AuditBatch", back_populates="state_transitions")
    operator = relationship("User")


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("audit_batches.id"))
    file_name = Column(String)
    file_type = Column(String)
    file_path = Column(String)
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    description = Column(String, nullable=True)
