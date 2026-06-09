from __future__ import annotations

from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class ImportBatch(Base):
    __tablename__ = "import_batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String(64), unique=True, index=True, nullable=False)
    filename = Column(String(255), nullable=False)
    source = Column(String(32), default="error_analysis")
    total_count = Column(Integer, default=0)
    duplicate_count = Column(Integer, default=0)
    new_count = Column(Integer, default=0)
    updated_count = Column(Integer, default=0)
    quality_issues = Column(Integer, default=0)
    imported_by = Column(String(64), default="排课老师")
    created_at = Column(DateTime, default=datetime.now)
    remark = Column(Text, default="")

    records = relationship("QuestionRecord", back_populates="batch", cascade="all, delete-orphan")
    issues = relationship("QualityIssue", back_populates="batch", cascade="all, delete-orphan")


class QuestionRecord(Base):
    __tablename__ = "question_records"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("import_batches.id"), nullable=False)
    content_hash = Column(String(64), index=True, nullable=False)
    question_id = Column(String(64), index=True, default="")
    question_no = Column(String(64), default="")
    question_title = Column(Text, default="")
    matrix_data = Column(Text, default="")
    eigenvalue_exact = Column(String(255), default="")
    eigenvalue_approx = Column(String(255), default="")
    error_value = Column(Float, default=0.0)
    error_level = Column(String(16), default="normal")
    remark = Column(Text, default="")
    status = Column(String(16), default="pending")
    constraint_pass = Column(Boolean, default=False)
    reviewed_by = Column(String(64), default="")
    reviewed_at = Column(DateTime, nullable=True)
    raw_data = Column(Text, default="")
    has_empty = Column(Boolean, default=False)
    has_duplicate = Column(Boolean, default=False)
    remark_mixed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    batch = relationship("ImportBatch", back_populates="records")
    audit_logs = relationship("AuditLog", back_populates="record", cascade="all, delete-orphan")
    linked_records = relationship("RecordLink", foreign_keys="RecordLink.record_id",
                                   back_populates="record", cascade="all, delete-orphan")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("question_records.id"), nullable=False)
    field_name = Column(String(64), nullable=False)
    old_value = Column(Text, default="")
    new_value = Column(Text, default="")
    operator = Column(String(64), default="排课老师")
    operation = Column(String(32), default="update")
    created_at = Column(DateTime, default=datetime.now)
    comment = Column(Text, default="")

    record = relationship("QuestionRecord", back_populates="audit_logs")


class QualityIssue(Base):
    __tablename__ = "quality_issues"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("import_batches.id"), nullable=False)
    record_id = Column(Integer, nullable=True)
    issue_type = Column(String(32), nullable=False)
    description = Column(Text, default="")
    field_name = Column(String(64), default="")
    severity = Column(String(16), default="warning")
    resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)

    batch = relationship("ImportBatch", back_populates="issues")


class RecordLink(Base):
    __tablename__ = "record_links"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("question_records.id"), nullable=False)
    linked_record_id = Column(Integer, nullable=False)
    link_type = Column(String(32), default="duplicate")
    created_at = Column(DateTime, default=datetime.now)

    record = relationship("QuestionRecord", back_populates="linked_records")
