from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class Sample(Base):
    __tablename__ = "samples"

    id = Column(Integer, primary_key=True, index=True)
    sample_id = Column(String, unique=True, index=True, nullable=False)
    query = Column(Text, nullable=False)
    source = Column(String, default="unknown")
    category = Column(String, default="default")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    evaluations = relationship("EvaluationRecord", back_populates="sample")
    corrections = relationship("ManualCorrection", back_populates="sample")
    review_histories = relationship("ReviewHistory", back_populates="sample")


class AlgorithmVersion(Base):
    __tablename__ = "algorithm_versions"

    id = Column(Integer, primary_key=True, index=True)
    version = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text, default="")
    threshold_config = Column(JSON, default=dict)
    model_info = Column(JSON, default=dict)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    evaluations = relationship("EvaluationRecord", back_populates="version")
    conclusions = relationship("ReviewConclusion", back_populates="version")


class EvaluationRecord(Base):
    __tablename__ = "evaluation_records"

    id = Column(Integer, primary_key=True, index=True)
    sample_id = Column(Integer, ForeignKey("samples.id"), nullable=False)
    version_id = Column(Integer, ForeignKey("algorithm_versions.id"), nullable=False)
    recall_results = Column(JSON, default=list)
    score = Column(Float, default=0.0)
    is_pass = Column(Boolean, default=False)
    is_repeat_eval = Column(Boolean, default=False)
    eval_time = Column(DateTime, default=datetime.utcnow)
    raw_response = Column(JSON, default=dict)
    remark = Column(String, default="")

    sample = relationship("Sample", back_populates="evaluations")
    version = relationship("AlgorithmVersion", back_populates="evaluations")


class ManualCorrection(Base):
    __tablename__ = "manual_corrections"

    id = Column(Integer, primary_key=True, index=True)
    sample_id = Column(Integer, ForeignKey("samples.id"), nullable=False)
    version_id = Column(Integer, ForeignKey("algorithm_versions.id"))
    source = Column(String, nullable=False)
    process_status = Column(String, default="pending")
    correction_data = Column(JSON, default=dict)
    correction_type = Column(String, default="general")
    operator = Column(String, default="")
    remark = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    sample = relationship("Sample", back_populates="corrections")


class ReviewHistory(Base):
    __tablename__ = "review_histories"

    id = Column(Integer, primary_key=True, index=True)
    sample_id = Column(Integer, ForeignKey("samples.id"), nullable=False)
    action_type = Column(String, nullable=False)
    before_data = Column(JSON, default=dict)
    after_data = Column(JSON, default=dict)
    operator = Column(String, default="")
    remark = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    sample = relationship("Sample", back_populates="review_histories")


class ReviewConclusion(Base):
    __tablename__ = "review_conclusions"

    id = Column(Integer, primary_key=True, index=True)
    conclusion_id = Column(String, unique=True, index=True, nullable=False)
    version_id = Column(Integer, ForeignKey("algorithm_versions.id"), nullable=False)
    title = Column(String, nullable=False)
    summary = Column(Text, default="")
    total_samples = Column(Integer, default=0)
    pass_count = Column(Integer, default=0)
    fail_count = Column(Integer, default=0)
    correction_count = Column(Integer, default=0)
    metrics = Column(JSON, default=dict)
    highlights = Column(JSON, default=list)
    is_final = Column(Boolean, default=False)
    operator = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    version = relationship("AlgorithmVersion", back_populates="conclusions")
