from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime

from .database import Base


class EvaluationRun(Base):
    __tablename__ = "evaluation_runs"

    id = Column(Integer, primary_key=True, index=True)
    model_version = Column(String(128), index=True)
    evaluator = Column(String(128))
    source_file = Column(String(256))
    original_filename = Column(String(256))
    status = Column(String(32), default="pending")
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    records = relationship("EvaluationRecord", back_populates="run", cascade="all, delete-orphan")
    field_mappings = relationship("FieldMapping", back_populates="run", cascade="all, delete-orphan")


class EvaluationRecord(Base):
    __tablename__ = "evaluation_records"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("evaluation_runs.id"))
    query_id = Column(String(128), index=True)
    query_text = Column(Text)
    expected_docs = Column(JSON, default=list)
    recalled_docs = Column(JSON, default=list)
    metrics = Column(JSON, default=dict)
    original_fields = Column(JSON, default=dict)
    original_row_index = Column(Integer)
    anomaly_flag = Column(String(64), default="")
    anomaly_desc = Column(Text, default="")
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    run = relationship("EvaluationRun", back_populates="records")
    judgments = relationship("ManualJudgment", back_populates="record", cascade="all, delete-orphan")
    anomalies = relationship("AnomalyRecord", back_populates="record", cascade="all, delete-orphan")


class ManualJudgment(Base):
    __tablename__ = "manual_judgments"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("evaluation_records.id"))
    judge_type = Column(String(32))
    before_value = Column(JSON)
    after_value = Column(JSON)
    reason = Column(Text)
    judge_name = Column(String(128))
    created_at = Column(DateTime, default=datetime.utcnow)

    record = relationship("EvaluationRecord", back_populates="judgments")


class FieldMapping(Base):
    __tablename__ = "field_mappings"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("evaluation_runs.id"), nullable=True)
    source_field = Column(String(256))
    standard_field = Column(String(128))
    is_global = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    run = relationship("EvaluationRun", back_populates="field_mappings")


class AnomalyRecord(Base):
    __tablename__ = "anomaly_records"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("evaluation_records.id"))
    anomaly_type = Column(String(64))
    original_description = Column(Text)
    status = Column(String(32), default="open")
    handler = Column(String(128), default="")
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    record = relationship("EvaluationRecord", back_populates="anomalies")
