from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class BatchStatus(str, enum.Enum):
    IMPORTED = "已导入"
    PROCESSING = "处理中"
    PENDING_REVIEW = "待复核"
    REVIEWING = "复核中"
    COMPLETED = "已完成"


class ProcessingStatus(str, enum.Enum):
    PENDING = "待处理"
    RUNNING = "运行中"
    SUCCESS = "成功"
    FAILED = "失败"
    ANOMALY = "异常"


class ReviewResult(str, enum.Enum):
    APPROVED = "通过"
    REJECTED = "驳回"
    NEEDS_REVISION = "需修改"


class EvaluationBatch(Base):
    __tablename__ = "evaluation_batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_code = Column(String(100), nullable=False, index=True)
    prompt_version = Column(String(100), nullable=False, index=True)
    run_number = Column(Integer, nullable=False, default=1)
    status = Column(Enum(BatchStatus), default=BatchStatus.IMPORTED)
    description = Column(Text, nullable=True)
    created_by = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    import_note = Column(Text, nullable=True)

    questions = relationship("EvaluationQuestion", back_populates="batch", cascade="all, delete-orphan")
    processing_records = relationship("ProcessingRecord", back_populates="batch")

    __table_args__ = (
        {'sqlite_autoincrement': True},
    )


class EvaluationQuestion(Base):
    __tablename__ = "evaluation_questions"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("evaluation_batches.id"), nullable=False)
    question_external_id = Column(String(100), nullable=True)
    prompt = Column(Text, nullable=False)
    expected_code = Column(Text, nullable=True)
    question_category = Column(String(100), nullable=True)
    difficulty_level = Column(String(50), nullable=True)
    tags = Column(JSON, nullable=True)
    question_metadata = Column(JSON, nullable=True)

    batch = relationship("EvaluationBatch", back_populates="questions")
    processing_records = relationship("ProcessingRecord", back_populates="question", cascade="all, delete-orphan")


class ProcessingRecord(Base):
    __tablename__ = "processing_records"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("evaluation_batches.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("evaluation_questions.id"), nullable=False)
    run_number = Column(Integer, nullable=False)
    status = Column(Enum(ProcessingStatus), default=ProcessingStatus.PENDING)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    predicted_code = Column(Text, nullable=True)
    execution_result = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    quality_score = Column(Integer, nullable=True)
    metrics = Column(JSON, nullable=True)
    processing_note = Column(Text, nullable=True)

    batch = relationship("EvaluationBatch", back_populates="processing_records")
    question = relationship("EvaluationQuestion", back_populates="processing_records")
    review_record = relationship("ReviewRecord", back_populates="processing_record", uselist=False, cascade="all, delete-orphan")
    anomalies = relationship("AnomalyRecord", back_populates="processing_record", cascade="all, delete-orphan")


class ReviewRecord(Base):
    __tablename__ = "review_records"

    id = Column(Integer, primary_key=True, index=True)
    processing_record_id = Column(Integer, ForeignKey("processing_records.id"), nullable=False)
    reviewer = Column(String(100), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    review_result = Column(Enum(ReviewResult), nullable=True)
    review_comment = Column(Text, nullable=True)

    annotation_record = Column(JSON, nullable=True)
    manual_feedback = Column(JSON, nullable=True)
    tag_conflicts = Column(JSON, nullable=True)

    processing_record = relationship("ProcessingRecord", back_populates="review_record")


class AnomalyRecord(Base):
    __tablename__ = "anomaly_records"

    id = Column(Integer, primary_key=True, index=True)
    processing_record_id = Column(Integer, ForeignKey("processing_records.id"), nullable=False)
    anomaly_type = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    detected_at = Column(DateTime(timezone=True), server_default=func.now())
    handling_opinion = Column(Text, nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    is_resolved = Column(Boolean, default=False)

    processing_record = relationship("ProcessingRecord", back_populates="anomalies")
