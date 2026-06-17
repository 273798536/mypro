from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey,
    Boolean, Float, JSON, Index
)
from sqlalchemy.orm import relationship

from app.database import Base
from app.config import BatchStatus, QuestionStatus


class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String(64), unique=True, index=True, nullable=False)
    batch_name = Column(String(255), nullable=False)
    source_file = Column(String(500))
    source_file_hash = Column(String(128))
    importer = Column(String(128), default="system")
    remark = Column(Text)
    status = Column(String(32), default=BatchStatus.IMPORTED, index=True)
    total_count = Column(Integer, default=0)
    valid_count = Column(Integer, default=0)
    duplicate_count = Column(Integer, default=0)
    conflict_count = Column(Integer, default=0)
    rollback_count = Column(Integer, default=0)
    current_round = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_operation = Column(String(128))
    last_operator = Column(String(128))

    questions = relationship("Question", back_populates="batch", cascade="all, delete-orphan")
    change_records = relationship("ChangeRecord", back_populates="batch", cascade="all, delete-orphan")
    review_records = relationship("ReviewRecord", back_populates="batch", cascade="all, delete-orphan")
    rollback_logs = relationship("RollbackLog", back_populates="batch", cascade="all, delete-orphan")
    materials = relationship("MaterialSource", back_populates="batch", cascade="all, delete-orphan")


class MaterialSource(Base):
    __tablename__ = "material_sources"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False, index=True)
    material_name = Column(String(255), nullable=False)
    material_type = Column(String(64))
    sheet_name = Column(String(128))
    source_row = Column(Integer)
    import_order = Column(Integer, default=0)
    is_rollback_blocker = Column(Boolean, default=False)
    blocker_reason = Column(String(500))
    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    batch = relationship("Batch", back_populates="materials")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False, index=True)
    material_id = Column(Integer, ForeignKey("material_sources.id"), index=True)
    question_no = Column(String(128), index=True)
    dedup_key = Column(String(512), index=True)
    title = Column(Text, nullable=False)
    content = Column(Text)
    answer = Column(Text)
    category = Column(String(128), index=True)
    difficulty = Column(String(32), default="medium")
    tags = Column(JSON)
    expected_model = Column(String(128))
    source_material = Column(String(255))
    source_sheet = Column(String(128))
    source_row = Column(Integer)
    remark = Column(Text)
    remark_append = Column(Text)
    unit = Column(String(64))
    is_old_format = Column(Boolean, default=False)
    has_missing_unit = Column(Boolean, default=False)
    has_append_remark = Column(Boolean, default=False)
    original_data = Column(JSON)
    status = Column(String(32), default=QuestionStatus.PENDING, index=True)
    duplicate_of_id = Column(Integer, ForeignKey("questions.id"))
    dedup_round = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    batch = relationship("Batch", back_populates="questions")
    routing_results = relationship("RoutingResult", back_populates="question", cascade="all, delete-orphan")
    duplicates = relationship("Question", remote_side=[id])


class ChangeRecord(Base):
    __tablename__ = "change_records"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), index=True)
    change_type = Column(String(64), nullable=False, index=True)
    field_name = Column(String(128))
    before_value = Column(JSON)
    after_value = Column(JSON)
    before_status = Column(String(32))
    after_status = Column(String(32))
    operator = Column(String(128), default="system")
    operation_round = Column(Integer, default=1)
    reason = Column(String(500))
    source_material = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    batch = relationship("Batch", back_populates="change_records")


class RoutingResult(Base):
    __tablename__ = "routing_results"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False, index=True)
    model_name = Column(String(128), nullable=False, index=True)
    confidence = Column(Float, default=0.0)
    match_reason = Column(String(500))
    match_tags = Column(JSON)
    routing_rule = Column(String(128))
    is_primary = Column(Boolean, default=False)
    need_review = Column(Boolean, default=False)
    review_reason = Column(String(500))
    round_no = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    created_by = Column(String(128), default="auto")

    question = relationship("Question", back_populates="routing_results")


class ReviewRecord(Base):
    __tablename__ = "review_records"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), index=True)
    reviewer = Column(String(128), nullable=False)
    review_type = Column(String(64))
    review_action = Column(String(64))
    before_status = Column(String(32))
    after_status = Column(String(32))
    before_routing = Column(JSON)
    after_routing = Column(JSON)
    comment = Column(Text)
    manual_fix = Column(Boolean, default=False)
    change_diff = Column(JSON)
    operation_round = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    batch = relationship("Batch", back_populates="review_records")


class RollbackLog(Base):
    __tablename__ = "rollback_logs"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False, index=True)
    from_status = Column(String(32), nullable=False)
    to_status = Column(String(32), nullable=False)
    rollback_reason = Column(Text)
    blocker_material_id = Column(Integer, ForeignKey("material_sources.id"))
    blocker_material_name = Column(String(255))
    blocker_question_ids = Column(JSON)
    blocker_detail = Column(JSON)
    operator = Column(String(128), default="system")
    round_no = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    batch = relationship("Batch", back_populates="rollback_logs")
