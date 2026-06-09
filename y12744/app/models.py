from sqlalchemy import Column, Integer, String, Float, Text, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class ReviewStatus:
    IMPORTED = "imported"
    REVIEWING = "reviewing"
    CONFIRMED = "confirmed"
    EXPORTED = "exported"
    REJECTED = "rejected"
    PENDING_CONFIRM = "pending_confirm"


class ConicRecord(Base):
    __tablename__ = "conic_records"

    id = Column(Integer, primary_key=True, index=True)
    record_no = Column(String(50), unique=True, index=True, nullable=False)
    student_name = Column(String(100), nullable=False)
    question_id = Column(String(50))
    curve_type = Column(String(20))
    a = Column(Float)
    b = Column(Float)
    c = Column(Float)
    focus_x = Column(Float)
    focus_y = Column(Float)
    directrix = Column(String(100))
    eccentricity = Column(Float)
    unit = Column(String(20))
    raw_formula = Column(Text)
    status = Column(String(30), default=ReviewStatus.IMPORTED)
    chart_updated_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    versions = relationship("RecordVersion", back_populates="record", cascade="all, delete-orphan")
    issues = relationship("ReviewIssue", back_populates="record", cascade="all, delete-orphan")
    answers = relationship("StudentAnswer", back_populates="record", cascade="all, delete-orphan")
    late_params = relationship("LateParameter", back_populates="record", cascade="all, delete-orphan")


class RecordVersion(Base):
    __tablename__ = "record_versions"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("conic_records.id"), nullable=False)
    version_no = Column(Integer, nullable=False)
    a = Column(Float)
    b = Column(Float)
    c = Column(Float)
    curve_type = Column(String(20))
    eccentricity = Column(Float)
    formula = Column(Text)
    computed_results = Column(JSON)
    chart_supplied = Column(Boolean, default=False)
    created_by = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    remark = Column(Text)

    record = relationship("ConicRecord", back_populates="versions")


class ReviewIssue(Base):
    __tablename__ = "review_issues"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("conic_records.id"), nullable=False)
    issue_type = Column(String(50), nullable=False)
    severity = Column(String(20), default="warning")
    description = Column(Text, nullable=False)
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    record = relationship("ConicRecord", back_populates="issues")


class StudentAnswer(Base):
    __tablename__ = "student_answers"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("conic_records.id"), nullable=False)
    answer_type = Column(String(30))
    answer_content = Column(Text)
    is_correct = Column(Boolean)
    source = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)

    record = relationship("ConicRecord", back_populates="answers")


class LateParameter(Base):
    __tablename__ = "late_parameters"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("conic_records.id"), nullable=False)
    param_name = Column(String(50), nullable=False)
    old_value = Column(String(100))
    new_value = Column(String(100))
    impacted_conclusions = Column(JSON)
    merged = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    record = relationship("ConicRecord", back_populates="late_params")
