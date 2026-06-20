from __future__ import annotations
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    Text,
    DateTime,
    ForeignKey,
    JSON,
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from replay.database import Base


class ReplaySession(Base):
    __tablename__ = "replay_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_name = Column(String(256), nullable=False)
    status = Column(String(32), nullable=False, default="pending")
    config = Column(JSON, nullable=True)
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)

    records = relationship("QueueRecord", back_populates="session")
    history_entries = relationship("ReplayHistory", back_populates="session")


class QueueRecord(Base):
    __tablename__ = "queue_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("replay_sessions.id"), nullable=False)
    sample_id = Column(String(128), nullable=False)
    status = Column(String(32), nullable=False, default="pending")
    original_verdict = Column(String(64), nullable=True)
    final_verdict = Column(String(64), nullable=True)
    metric_value = Column(Float, nullable=True)
    is_outlier = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    session = relationship("ReplaySession", back_populates="records")
    exceptions = relationship("ExceptionEvent", back_populates="record")
    adjudications = relationship("AdjudicationChange", back_populates="record")
    material_versions = relationship("MaterialVersion", back_populates="record")
    grayscale_errors = relationship("GrayScaleError", back_populates="record")
    confirmations = relationship("HumanConfirmation", back_populates="record")
    history_entries = relationship("ReplayHistory", back_populates="record")


class ExceptionEvent(Base):
    __tablename__ = "exception_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    record_id = Column(Integer, ForeignKey("queue_records.id"), nullable=False)
    exception_type = Column(String(64), nullable=False)
    exception_detail = Column(Text, nullable=True)
    source_line = Column(String(512), nullable=True)
    detected_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    record = relationship("QueueRecord", back_populates="exceptions")


class AdjudicationChange(Base):
    __tablename__ = "adjudication_changes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    record_id = Column(Integer, ForeignKey("queue_records.id"), nullable=False)
    old_verdict = Column(String(64), nullable=True)
    new_verdict = Column(String(64), nullable=False)
    source = Column(String(64), nullable=False)
    source_id = Column(Integer, nullable=True)
    operator = Column(String(128), nullable=True)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    record = relationship("QueueRecord", back_populates="adjudications")


class MaterialVersion(Base):
    __tablename__ = "material_versions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    record_id = Column(Integer, ForeignKey("queue_records.id"), nullable=False)
    material_type = Column(String(64), nullable=False)
    content = Column(Text, nullable=True)
    version = Column(Integer, default=1)
    is_current = Column(Boolean, default=True)
    revised_from = Column(Integer, ForeignKey("material_versions.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    record = relationship("QueueRecord", back_populates="material_versions")


class GrayScaleError(Base):
    __tablename__ = "grayscale_errors"

    id = Column(Integer, primary_key=True, autoincrement=True)
    record_id = Column(Integer, ForeignKey("queue_records.id"), nullable=False)
    expected_ratio = Column(Float, nullable=True)
    actual_ratio = Column(Float, nullable=True)
    impact_scope = Column(Text, nullable=True)
    source_line = Column(String(512), nullable=True)
    detected_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    record = relationship("QueueRecord", back_populates="grayscale_errors")


class HumanConfirmation(Base):
    __tablename__ = "human_confirmations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    record_id = Column(Integer, ForeignKey("queue_records.id"), nullable=False)
    confirmer = Column(String(128), nullable=False)
    before_status = Column(String(64), nullable=True)
    after_status = Column(String(64), nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    record = relationship("QueueRecord", back_populates="confirmations")


class ReplayHistory(Base):
    __tablename__ = "replay_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("replay_sessions.id"), nullable=False)
    record_id = Column(Integer, ForeignKey("queue_records.id"), nullable=True)
    event_type = Column(String(64), nullable=False)
    event_detail = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    session = relationship("ReplaySession", back_populates="history_entries")
    record = relationship("QueueRecord", back_populates="history_entries")
