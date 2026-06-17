from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SAEnum, Boolean, Float
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.enums import QuestionStatus, IssueType, CopyrightType


class EvaluationBatch(Base):
    __tablename__ = "evaluation_batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_name = Column(String(255), nullable=False)
    import_time = Column(DateTime, default=datetime.utcnow)
    importer = Column(String(100))
    description = Column(Text)
    subject_category = Column(String(100))
    total_questions = Column(Integer, default=0)
    current_status = Column(SAEnum(QuestionStatus), default=QuestionStatus.IMPORTED)
    rejection_reason = Column(Text)

    questions = relationship("EvaluationQuestion", back_populates="batch", cascade="all, delete-orphan")
    status_history = relationship("StatusHistory", back_populates="batch", cascade="all, delete-orphan")
    prompt_version_tracks = relationship("PromptVersionTrack", back_populates="batch")


class EvaluationQuestion(Base):
    __tablename__ = "evaluation_questions"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("evaluation_batches.id"), nullable=False)
    question_id_external = Column(String(100))
    question_content = Column(Text, nullable=False)
    standard_answer = Column(Text)
    difficulty = Column(String(50))
    knowledge_point = Column(String(255))
    current_status = Column(SAEnum(QuestionStatus), default=QuestionStatus.IMPORTED)
    human_note = Column(Text)
    sort_order = Column(Integer, default=0)

    batch = relationship("EvaluationBatch", back_populates="questions")
    copyright_sources = relationship("CopyrightSource", back_populates="question", cascade="all, delete-orphan")
    review_records = relationship("ReviewRecord", back_populates="question", cascade="all, delete-orphan")
    status_history = relationship("StatusHistory", back_populates="question", cascade="all, delete-orphan")
    prompt_version_tracks = relationship("PromptVersionTrack", back_populates="question")


class CopyrightSource(Base):
    __tablename__ = "copyright_sources"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("evaluation_questions.id"), nullable=False)
    copyright_type = Column(SAEnum(CopyrightType), default=CopyrightType.UNKNOWN)
    source_title = Column(String(500))
    source_author = Column(String(255))
    source_publisher = Column(String(255))
    source_url = Column(String(500))
    publication_date = Column(String(100))
    authorization_number = Column(String(255))
    authorization_expiry = Column(String(100))
    fair_use_justification = Column(Text)
    remark = Column(Text)

    question = relationship("EvaluationQuestion", back_populates="copyright_sources")


class ReviewRecord(Base):
    __tablename__ = "review_records"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("evaluation_questions.id"), nullable=False)
    reviewer = Column(String(100))
    review_time = Column(DateTime, default=datetime.utcnow)
    issue_type = Column(SAEnum(IssueType))
    issue_detail = Column(Text)
    next_action = Column(Text)
    passed = Column(Boolean, default=False)
    human_note_preserved = Column(Text)

    question = relationship("EvaluationQuestion", back_populates="review_records")


class StatusHistory(Base):
    __tablename__ = "status_history"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("evaluation_batches.id"))
    question_id = Column(Integer, ForeignKey("evaluation_questions.id"))
    from_status = Column(SAEnum(QuestionStatus))
    to_status = Column(SAEnum(QuestionStatus), nullable=False)
    operator = Column(String(100))
    operate_time = Column(DateTime, default=datetime.utcnow)
    reason = Column(Text)

    batch = relationship("EvaluationBatch", back_populates="status_history")
    question = relationship("EvaluationQuestion", back_populates="status_history")


class PromptVersion(Base):
    __tablename__ = "prompt_versions"

    id = Column(Integer, primary_key=True, index=True)
    version_code = Column(String(100), nullable=False, unique=True)
    version_name = Column(String(255))
    prompt_content = Column(Text, nullable=False)
    create_time = Column(DateTime, default=datetime.utcnow)
    creator = Column(String(100))
    description = Column(Text)
    is_active = Column(Boolean, default=False)

    tracks = relationship("PromptVersionTrack", back_populates="prompt_version")


class PromptVersionTrack(Base):
    __tablename__ = "prompt_version_tracks"

    id = Column(Integer, primary_key=True, index=True)
    prompt_version_id = Column(Integer, ForeignKey("prompt_versions.id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("evaluation_batches.id"))
    question_id = Column(Integer, ForeignKey("evaluation_questions.id"))
    bind_time = Column(DateTime, default=datetime.utcnow)
    operator = Column(String(100))
    remark = Column(Text)

    prompt_version = relationship("PromptVersion", back_populates="tracks")
    batch = relationship("EvaluationBatch", back_populates="prompt_version_tracks")
    question = relationship("EvaluationQuestion", back_populates="prompt_version_tracks")
