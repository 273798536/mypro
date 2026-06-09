from sqlalchemy import Column, Integer, String, Float, Text, DateTime, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class BatchStatus(str, enum.Enum):
    PENDING_IMPORT = "待导入"
    IMPORTED = "已导入"
    CONFLICT_CHECKING = "冲突检测中"
    PENDING_REVIEW = "待复核"
    REVIEWING = "复核中"
    COMPLETED = "已完成"


class AnomalyCategory(str, enum.Enum):
    NEED_MATERIAL = "补材料"
    NEED_STANDARD = "改口径"
    NONE = "无异常"


class ResultGrade(str, enum.Enum):
    USABLE = "可用"
    PENDING = "暂缓"
    RECOLLECT = "重新采集"


class ProcessBatch(Base):
    __tablename__ = "process_batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_name = Column(String(255), nullable=False)
    status = Column(Enum(BatchStatus), default=BatchStatus.PENDING_IMPORT)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    remark = Column(Text, nullable=True)
    operator = Column(String(100), nullable=True)

    questions = relationship("QuestionItem", back_populates="batch", cascade="all, delete-orphan")
    param_records = relationship("ParamRecord", back_populates="batch", cascade="all, delete-orphan")
    conflicts = relationship("ConflictRecord", back_populates="batch", cascade="all, delete-orphan")
    reviews = relationship("ReviewRecord", back_populates="batch", cascade="all, delete-orphan")
    error_analyses = relationship("ErrorAnalysis", back_populates="batch", cascade="all, delete-orphan")
    snapshots = relationship("HistorySnapshot", back_populates="batch", cascade="all, delete-orphan")
    exports = relationship("ExportReport", back_populates="batch", cascade="all, delete-orphan")


class QuestionItem(Base):
    __tablename__ = "question_items"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("process_batches.id"), nullable=False)
    original_row_no = Column(Integer, nullable=False)
    question_code = Column(String(100), nullable=False)
    question_title = Column(String(500), nullable=True)
    image_name = Column(String(255), nullable=True)
    source_remark = Column(Text, nullable=True)
    kkt_params_json = Column(Text, nullable=True)
    difficulty = Column(String(50), nullable=True)
    knowledge_point = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    batch = relationship("ProcessBatch", back_populates="questions")
    reviews = relationship("ReviewRecord", back_populates="question", cascade="all, delete-orphan")
    error_analyses = relationship("ErrorAnalysis", back_populates="question", cascade="all, delete-orphan")
    counter_examples = relationship("CounterExample", back_populates="question", cascade="all, delete-orphan")


class ParamRecord(Base):
    __tablename__ = "param_records"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("process_batches.id"), nullable=False)
    original_row_no = Column(Integer, nullable=False)
    question_code = Column(String(100), nullable=False)
    param_key = Column(String(100), nullable=False)
    param_value = Column(String(500), nullable=True)
    source_sheet = Column(String(255), nullable=True)
    source_remark = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    batch = relationship("ProcessBatch", back_populates="param_records")
    conflicts = relationship("ConflictRecord", back_populates="param_record")


class ConflictRecord(Base):
    __tablename__ = "conflict_records"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("process_batches.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("question_items.id"), nullable=True)
    param_record_id = Column(Integer, ForeignKey("param_records.id"), nullable=True)
    question_code = Column(String(100), nullable=False)
    conflict_type = Column(String(100), nullable=False)
    conflict_field = Column(String(100), nullable=True)
    question_value = Column(Text, nullable=True)
    param_value = Column(Text, nullable=True)
    description = Column(Text, nullable=False)
    resolution_suggestion = Column(Text, nullable=True)
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    batch = relationship("ProcessBatch", back_populates="conflicts")
    param_record = relationship("ParamRecord", back_populates="conflicts")


class ReviewRecord(Base):
    __tablename__ = "review_records"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("process_batches.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("question_items.id"), nullable=False)
    anomaly_category = Column(Enum(AnomalyCategory), default=AnomalyCategory.NONE)
    result_grade = Column(Enum(ResultGrade), default=ResultGrade.PENDING)
    reviewer = Column(String(100), nullable=True)
    review_note = Column(Text, nullable=True)
    next_step = Column(String(255), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    batch = relationship("ProcessBatch", back_populates="reviews")
    question = relationship("QuestionItem", back_populates="reviews")


class ErrorAnalysis(Base):
    __tablename__ = "error_analyses"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("process_batches.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("question_items.id"), nullable=False)
    kkt_violation_degree = Column(Float, default=0.0)
    stationarity_error = Column(Float, default=0.0)
    primal_feasibility_error = Column(Float, default=0.0)
    dual_feasibility_error = Column(Float, default=0.0)
    complementarity_error = Column(Float, default=0.0)
    overall_error = Column(Float, default=0.0)
    is_excessive = Column(Boolean, default=False)
    analysis_detail = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    batch = relationship("ProcessBatch", back_populates="error_analyses")
    question = relationship("QuestionItem", back_populates="error_analyses")


class CounterExample(Base):
    __tablename__ = "counter_examples"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("question_items.id"), nullable=False)
    example_content = Column(Text, nullable=False)
    source_reference = Column(String(500), nullable=True)
    explanation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    question = relationship("QuestionItem", back_populates="counter_examples")


class HistorySnapshot(Base):
    __tablename__ = "history_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("process_batches.id"), nullable=False)
    snapshot_name = Column(String(255), nullable=False)
    snapshot_type = Column(String(100), nullable=False)
    snapshot_data = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(String(100), nullable=True)

    batch = relationship("ProcessBatch", back_populates="snapshots")


class ExportReport(Base):
    __tablename__ = "export_reports"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("process_batches.id"), nullable=False)
    report_name = Column(String(255), nullable=False)
    report_type = Column(String(100), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)
    exported_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    batch = relationship("ProcessBatch", back_populates="exports")
