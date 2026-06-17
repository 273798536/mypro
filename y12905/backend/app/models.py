from sqlalchemy import Column, Integer, String, Text, Float, DateTime, Boolean, ForeignKey, Enum, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from .database import Base


class EvalStatus(str, enum.Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    REVIEW = "REVIEW"


class TaskStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class FinalDecision(str, enum.Enum):
    APPROVED = "APPROVED"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    RERUN = "RERUN"


class PromptVersion(Base):
    __tablename__ = "prompt_versions"
    id = Column(Integer, primary_key=True, index=True)
    version_tag = Column(String, unique=True, nullable=False, index=True)
    content = Column(Text, nullable=False)
    safety_rules_snapshot = Column(JSON, nullable=False, default=lambda: {"rules": []})
    change_log = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    samples = relationship("EvalSample", back_populates="prompt_version", cascade="all, delete-orphan")


class EvalSample(Base):
    __tablename__ = "eval_samples"
    id = Column(Integer, primary_key=True, index=True)
    prompt_version_id = Column(Integer, ForeignKey("prompt_versions.id"), nullable=False)
    input_text = Column(Text, nullable=False)
    model_output = Column(Text, nullable=False)
    score = Column(Float, nullable=False)
    safety_violations = Column(JSON, default=lambda: [])
    eval_status = Column(Enum(EvalStatus), default=EvalStatus.PASS)
    source_material_ref = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    prompt_version = relationship("PromptVersion", back_populates="samples")
    feedbacks = relationship("HumanFeedback", back_populates="sample", cascade="all, delete-orphan")


class GrayCompareTask(Base):
    __tablename__ = "gray_compare_tasks"
    id = Column(Integer, primary_key=True, index=True)
    version_a_id = Column(Integer, ForeignKey("prompt_versions.id"), nullable=False)
    version_b_id = Column(Integer, ForeignKey("prompt_versions.id"), nullable=False)
    metrics_summary = Column(JSON, default=lambda: {})
    status = Column(Enum(TaskStatus), default=TaskStatus.PENDING)
    consistency_flag = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    version_a = relationship("PromptVersion", foreign_keys=[version_a_id])
    version_b = relationship("PromptVersion", foreign_keys=[version_b_id])


class HumanFeedback(Base):
    __tablename__ = "human_feedback"
    id = Column(Integer, primary_key=True, index=True)
    eval_sample_id = Column(Integer, ForeignKey("eval_samples.id"), nullable=False)
    evaluator = Column(String, nullable=False, default="anonymous")
    feedback_text = Column(Text, default="")
    original_score = Column(Float, nullable=False)
    revised_score = Column(Float, nullable=False)
    affects_safety_rules = Column(Boolean, default=False)
    affected_rule_ids = Column(JSON, default=lambda: [])
    final_decision = Column(Enum(FinalDecision), default=FinalDecision.REVIEW_REQUIRED)
    reason = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    sample = relationship("EvalSample", back_populates="feedbacks")
