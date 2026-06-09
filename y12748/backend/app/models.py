from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class ImportBatch(Base):
    __tablename__ = "import_batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_name = Column(String(255), nullable=False)
    file_name = Column(String(255))
    imported_by = Column(String(100), default="投研助理")
    imported_at = Column(DateTime, default=datetime.utcnow)
    total_records = Column(Integer, default=0)
    valid_records = Column(Integer, default=0)
    invalid_records = Column(Integer, default=0)
    status = Column(String(50), default="pending")
    remark = Column(Text)

    records = relationship("QuestionRecord", back_populates="batch")
    review_sessions = relationship("ReviewSession", back_populates="batch")


class QuestionRecord(Base):
    __tablename__ = "question_records"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("import_batches.id"))
    question_id = Column(String(100), index=True)
    question_content = Column(Text)
    material_name = Column(String(255))
    material_type = Column(String(100))
    stress_level = Column(Float)
    temperature = Column(Float)
    lifetime_hours = Column(Float)
    unit = Column(String(50))
    student_answer = Column(Text)
    correct_answer = Column(Text)
    constraint_condition = Column(Text)
    remark = Column(Text)
    source = Column(String(100))
    is_duplicate = Column(Boolean, default=False)
    duplicate_of_id = Column(Integer, ForeignKey("question_records.id"))
    has_unit_issue = Column(Boolean, default=False)
    has_empty_value = Column(Boolean, default=False)
    has_mixed_remark = Column(Boolean, default=False)
    has_conflict = Column(Boolean, default=False)
    conflict_detail = Column(Text)
    status = Column(String(50), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    batch = relationship("ImportBatch", back_populates="records")
    corrections = relationship("CorrectionHistory", back_populates="record")
    review_results = relationship("ReviewResult", back_populates="record")
    duplicate_of = relationship("QuestionRecord", remote_side=[id])


class CorrectionHistory(Base):
    __tablename__ = "correction_histories"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("question_records.id"))
    field_name = Column(String(100))
    old_value = Column(Text)
    new_value = Column(Text)
    corrected_by = Column(String(100), default="投研助理")
    corrected_at = Column(DateTime, default=datetime.utcnow)
    comment = Column(Text)

    record = relationship("QuestionRecord", back_populates="corrections")


class ReviewSession(Base):
    __tablename__ = "review_sessions"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("import_batches.id"))
    session_name = Column(String(255), nullable=False)
    session_type = Column(String(50), default="daily")
    created_by = Column(String(100), default="投研助理")
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    status = Column(String(50), default="pending")
    include_wrong_answers = Column(Boolean, default=True)
    include_historical_answers = Column(Boolean, default=True)
    include_conflicts = Column(Boolean, default=True)
    total_items = Column(Integer, default=0)
    reviewed_items = Column(Integer, default=0)
    passed_items = Column(Integer, default=0)
    pending_items = Column(Integer, default=0)
    remark = Column(Text)

    batch = relationship("ImportBatch", back_populates="review_sessions")
    results = relationship("ReviewResult", back_populates="session")
    reports = relationship("Report", back_populates="session")


class ReviewResult(Base):
    __tablename__ = "review_results"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("review_sessions.id"))
    record_id = Column(Integer, ForeignKey("question_records.id"))
    before_status = Column(String(50))
    after_status = Column(String(50))
    reviewer = Column(String(100), default="投研助理")
    reviewed_at = Column(DateTime, default=datetime.utcnow)
    review_comment = Column(Text)
    is_conflict_resolved = Column(Boolean, default=False)
    conflict_resolution = Column(Text)

    session = relationship("ReviewSession", back_populates="results")
    record = relationship("QuestionRecord", back_populates="review_results")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("review_sessions.id"))
    batch_id = Column(Integer, ForeignKey("import_batches.id"))
    report_type = Column(String(50), default="student")
    generated_by = Column(String(100), default="系统")
    generated_at = Column(DateTime, default=datetime.utcnow)
    file_name = Column(String(255))
    file_path = Column(String(500))
    summary = Column(JSON)
    curve_data = Column(JSON)
    status = Column(String(50), default="generated")

    session = relationship("ReviewSession", back_populates="reports")


class ReliabilityCurve(Base):
    __tablename__ = "reliability_curves"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("question_records.id"))
    batch_id = Column(Integer, ForeignKey("import_batches.id"))
    session_id = Column(Integer, ForeignKey("review_sessions.id"))
    material_name = Column(String(255))
    weibull_shape = Column(Float)
    weibull_scale = Column(Float)
    mean_lifetime = Column(Float)
    median_lifetime = Column(Float)
    b10_lifetime = Column(Float)
    curve_points = Column(JSON)
    calculated_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="calculated")
