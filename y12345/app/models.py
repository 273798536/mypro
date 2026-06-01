from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, Boolean, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base


class Experiment(Base):
    __tablename__ = "experiments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    frequency_hz = Column(Float, nullable=False)
    pipe_length_m = Column(Float, nullable=False)
    temperature_c = Column(Float, nullable=True, default=20.0)
    temperature_corrected = Column(Boolean, default=False)
    temperature_correction_applied = Column(Float, default=0.0)
    classroom_notes = Column(Text, default="")
    source_ref = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    nodes = relationship("NodeMarking", back_populates="experiment", cascade="all, delete-orphan")
    audit_entries = relationship("AuditLog", back_populates="experiment", cascade="all, delete-orphan")


class NodeMarking(Base):
    __tablename__ = "node_markings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    experiment_id = Column(Integer, ForeignKey("experiments.id"), nullable=False)
    position_m = Column(Float, nullable=False)
    is_antinode = Column(Boolean, default=False)
    manual_override = Column(Boolean, default=False)
    override_reason = Column(Text, nullable=True)
    original_position_m = Column(Float, nullable=True)
    original_is_antinode = Column(Boolean, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    experiment = relationship("Experiment", back_populates="nodes")

    __table_args__ = (
        Index("ix_node_markings_experiment_id", "experiment_id"),
    )


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    experiment_id = Column(Integer, ForeignKey("experiments.id"), nullable=True)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(Integer, nullable=False)
    field_changed = Column(String(100), nullable=False)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    experiment = relationship("Experiment", back_populates="audit_entries")

    __table_args__ = (
        Index("ix_audit_log_experiment_id", "experiment_id"),
        Index("ix_audit_log_entity", "entity_type", "entity_id"),
    )
