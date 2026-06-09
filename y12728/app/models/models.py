from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean, Index
from sqlalchemy.orm import relationship

from app.database import Base


class ImportBatch(Base):
    __tablename__ = "import_batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String(64), unique=True, index=True, nullable=False)
    file_name = Column(String(255), nullable=False)
    file_hash = Column(String(64), index=True)
    uploaded_by = Column(String(64), default="system")
    remark = Column(Text)
    total_rows = Column(Integer, default=0)
    valid_rows = Column(Integer, default=0)
    duplicate_rows = Column(Integer, default=0)
    issue_rows = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.now)

    records = relationship("ScoreRecord", back_populates="batch")
    issues = relationship("DataIssue", back_populates="batch")


class ScoreRecord(Base):
    __tablename__ = "score_records"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("import_batches.id"), nullable=False)
    row_no = Column(Integer)

    student_id = Column(String(64), index=True)
    student_name = Column(String(128))
    class_name = Column(String(128))
    subject = Column(String(64), index=True)

    unit_name = Column(String(128))
    unit_missing = Column(Boolean, default=False)

    score_origin = Column(Float)
    score_extrapolated = Column(Float)
    alarm_level = Column(String(32))
    alarm_flag = Column(Boolean, default=False)

    remark_raw = Column(Text)
    remark_clean = Column(Text)

    dedup_key = Column(String(256), index=True)
    is_duplicate = Column(Boolean, default=False)
    duplicate_of_id = Column(Integer, ForeignKey("score_records.id"), nullable=True)

    status = Column(String(32), default="pending", index=True)
    reviewed_by = Column(String(64))
    reviewed_at = Column(DateTime)
    review_note = Column(Text)

    score_original_value = Column(Float)
    score_corrected_value = Column(Float)
    alarm_original_level = Column(String(32))
    alarm_corrected_level = Column(String(32))
    corrected_by = Column(String(64))
    corrected_at = Column(DateTime)

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    batch = relationship("ImportBatch", back_populates="records")
    issues = relationship("DataIssue", back_populates="record")
    review_logs = relationship("ReviewLog", back_populates="record")
    duplicates = relationship("ScoreRecord", remote_side=[id])

    __table_args__ = (
        Index("ix_student_subject_unit", "student_id", "subject", "unit_name"),
    )


class DataIssue(Base):
    __tablename__ = "data_issues"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("import_batches.id"), nullable=False)
    record_id = Column(Integer, ForeignKey("score_records.id"))
    issue_type = Column(String(32), index=True)
    issue_detail = Column(Text)
    column_name = Column(String(64))
    row_no = Column(Integer)
    resolved = Column(Boolean, default=False)
    resolved_note = Column(Text)
    created_at = Column(DateTime, default=datetime.now)

    batch = relationship("ImportBatch", back_populates="issues")
    record = relationship("ScoreRecord", back_populates="issues")


class ReviewLog(Base):
    __tablename__ = "review_logs"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("score_records.id"), nullable=False)
    action = Column(String(32), index=True)
    from_status = Column(String(32))
    to_status = Column(String(32))

    field_name = Column(String(64))
    old_value = Column(Text)
    new_value = Column(Text)

    operator = Column(String(64))
    note = Column(Text)
    created_at = Column(DateTime, default=datetime.now)

    record = relationship("ScoreRecord", back_populates="review_logs")
