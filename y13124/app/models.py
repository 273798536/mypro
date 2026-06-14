from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class VerificationBatch(Base):
    __tablename__ = "verification_batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_name = Column(String(255), nullable=False)
    created_by = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="processing")
    description = Column(Text, nullable=True)
    graph_snapshot = Column(JSON, nullable=True)

    records = relationship("PathRecord", back_populates="batch", cascade="all, delete-orphan")
    notes = relationship("StudentNote", back_populates="batch", cascade="all, delete-orphan")
    change_histories = relationship("ChangeHistory", back_populates="batch", cascade="all, delete-orphan")


class PathRecord(Base):
    __tablename__ = "path_records"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("verification_batches.id"), nullable=False)
    record_code = Column(String(100), nullable=False, index=True)
    source_node = Column(String(100), nullable=False)
    target_node = Column(String(100), nullable=False)

    original_distance = Column(Float, nullable=False)
    original_unit = Column(String(20), default="meter")
    original_path = Column(JSON, nullable=True)
    original_judgment = Column(String(50), default="pending")

    current_distance = Column(Float, nullable=True)
    current_unit = Column(String(20), default="meter")
    current_path = Column(JSON, nullable=True)
    current_judgment = Column(String(50), default="pending")

    is_out_of_bounds = Column(Boolean, default=False)
    bounds_detail = Column(Text, nullable=True)
    unit_conversion_note = Column(Text, nullable=True)

    processing_status = Column(String(50), default="pending")
    evidence_status = Column(String(50), default="not_required")
    evidence_missing_items = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    batch = relationship("VerificationBatch", back_populates="records")
    unit_conversions = relationship("UnitConversion", back_populates="record", cascade="all, delete-orphan")
    changes = relationship("ChangeHistory", back_populates="record", cascade="all, delete-orphan")
    note_impacts = relationship("NoteImpact", back_populates="record", cascade="all, delete-orphan")
    extrapolation_warnings = relationship("ExtrapolationWarning", back_populates="record", cascade="all, delete-orphan")
    evidences = relationship("EvidenceItem", back_populates="record", cascade="all, delete-orphan")


class UnitConversion(Base):
    __tablename__ = "unit_conversions"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("path_records.id"), nullable=False)
    from_unit = Column(String(20), nullable=False)
    to_unit = Column(String(20), nullable=False)
    from_value = Column(Float, nullable=False)
    to_value = Column(Float, nullable=False)
    conversion_factor = Column(Float, nullable=False)
    deviation = Column(Float, nullable=True)
    deviation_note = Column(Text, nullable=True)
    formula_used = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    record = relationship("PathRecord", back_populates="unit_conversions")


class ChangeHistory(Base):
    __tablename__ = "change_histories"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("verification_batches.id"), nullable=True)
    record_id = Column(Integer, ForeignKey("path_records.id"), nullable=True)

    change_type = Column(String(50), nullable=False)
    field_changed = Column(String(100), nullable=True)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    old_judgment = Column(String(50), nullable=True)
    new_judgment = Column(String(50), nullable=True)

    source_type = Column(String(50), nullable=False)
    source_id = Column(String(100), nullable=True)
    source_detail = Column(Text, nullable=True)

    changed_by = Column(String(100), nullable=False)
    changed_at = Column(DateTime, default=datetime.utcnow)
    reason = Column(Text, nullable=True)

    current_status_after = Column(String(50), nullable=True)

    batch = relationship("VerificationBatch", back_populates="change_histories")
    record = relationship("PathRecord", back_populates="changes")


class StudentNote(Base):
    __tablename__ = "student_notes"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("verification_batches.id"), nullable=False)
    note_code = Column(String(100), nullable=False, index=True)
    student_id = Column(String(100), nullable=True)
    content = Column(Text, nullable=False)
    note_type = Column(String(50), default="error_remark")
    added_by = Column(String(100), nullable=False)
    added_at = Column(DateTime, default=datetime.utcnow)
    is_applied = Column(Boolean, default=False)
    applied_at = Column(DateTime, nullable=True)
    apply_summary = Column(Text, nullable=True)

    batch = relationship("VerificationBatch", back_populates="notes")
    impacts = relationship("NoteImpact", back_populates="note", cascade="all, delete-orphan")


class NoteImpact(Base):
    __tablename__ = "note_impacts"

    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("student_notes.id"), nullable=False)
    record_id = Column(Integer, ForeignKey("path_records.id"), nullable=False)

    judgment_before = Column(String(50), nullable=True)
    judgment_after = Column(String(50), nullable=True)
    distance_before = Column(Float, nullable=True)
    distance_after = Column(Float, nullable=True)
    path_changed = Column(Boolean, default=False)
    impact_detail = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    note = relationship("StudentNote", back_populates="impacts")
    record = relationship("PathRecord", back_populates="note_impacts")


class ExtrapolationWarning(Base):
    __tablename__ = "extrapolation_warnings"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("verification_batches.id"), nullable=True)
    record_id = Column(Integer, ForeignKey("path_records.id"), nullable=True)
    warning_type = Column(String(50), nullable=False)
    warning_detail = Column(Text, nullable=False)
    affected_field = Column(String(100), nullable=True)
    raw_value = Column(Text, nullable=True)
    boundary_min = Column(Float, nullable=True)
    boundary_max = Column(Float, nullable=True)
    is_handled = Column(Boolean, default=False)
    handling_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    batch = relationship("VerificationBatch")
    record = relationship("PathRecord", back_populates="extrapolation_warnings")


class EvidenceItem(Base):
    __tablename__ = "evidence_items"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("path_records.id"), nullable=False)
    evidence_name = Column(String(255), nullable=False)
    evidence_type = Column(String(50), nullable=False)
    status = Column(String(50), default="pending")
    submitted_by = Column(String(100), nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    detail = Column(Text, nullable=True)

    record = relationship("PathRecord", back_populates="evidences")


class RecalcConsistency(Base):
    __tablename__ = "recalc_consistencies"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, nullable=False)
    record_id = Column(Integer, nullable=True)
    check_type = Column(String(50), nullable=False)
    chart_value = Column(Text, nullable=True)
    detail_value = Column(Text, nullable=True)
    is_consistent = Column(Boolean, default=True)
    inconsistency_detail = Column(Text, nullable=True)
    checked_at = Column(DateTime, default=datetime.utcnow)
