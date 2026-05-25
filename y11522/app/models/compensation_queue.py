from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, Enum, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime

from app.db.session import Base
from app.models.base import TimestampMixin
from app.models.enums import QueueStatus, FailCategory


class CompensationQueue(TimestampMixin, Base):
    __tablename__ = "compensation_queue"

    queue_key = Column(String(200), unique=True, nullable=False, index=True)
    appointment_no = Column(String(100), index=True)
    order_no = Column(String(100), index=True)
    user_id = Column(String(100), index=True)
    technician_id = Column(String(100), index=True)
    region = Column(String(100), index=True)

    status = Column(Enum(QueueStatus), default=QueueStatus.PENDING, nullable=False, index=True)
    retry_count = Column(Integer, default=0)
    max_retry_times = Column(Integer, default=3)
    next_retry_at = Column(DateTime)

    fail_category = Column(Enum(FailCategory))
    last_error = Column(Text)
    last_failed_at = Column(DateTime)

    is_rescheduled = Column(Boolean, default=False)
    is_second_visit = Column(Boolean, default=False)
    has_negative_review = Column(Boolean, default=False)
    review_reason = Column(String(500))
    compensation_amount = Column(Integer, default=0)
    compensation_reason = Column(String(500))

    receipt_submitted = Column(Boolean, default=False)
    receipt_data = Column(JSON)
    receipt_submitted_at = Column(DateTime)

    manual_taken_by = Column(String(100))
    manual_taken_at = Column(DateTime)
    manual_note = Column(Text)

    compensated_at = Column(DateTime)
    compensated_by = Column(String(100))

    closed_at = Column(DateTime)
    closed_by = Column(String(100))
    close_reason = Column(String(500))

    raw_data_ids = Column(JSON)
    raw_data_sources = Column(JSON)

    status_history = relationship("StatusHistory", backref="queue_item", cascade="all, delete-orphan")


class StatusHistory(TimestampMixin, Base):
    __tablename__ = "status_history"

    queue_id = Column(Integer, ForeignKey("compensation_queue.id"), nullable=False, index=True)
    from_status = Column(Enum(QueueStatus))
    to_status = Column(Enum(QueueStatus), nullable=False)
    changed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    changed_by = Column(String(100))
    change_reason = Column(String(500))
    extra_data = Column(JSON)
