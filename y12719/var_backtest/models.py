from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from var_backtest.database import Base


class QuestionList(Base):
    __tablename__ = "question_lists"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(String, unique=True, index=True)
    name = Column(String)
    version = Column(String)
    received_at = Column(DateTime, default=datetime.utcnow)
    is_current = Column(Boolean, default=True)
    meta = Column(JSON, default=dict)
    questions = relationship("Question", back_populates="question_list", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    question_list_id = Column(Integer, ForeignKey("question_lists.id"))
    question_id = Column(String, index=True)
    title = Column(String)
    content = Column(Text)
    quantile = Column(Float)
    var_level = Column(Float)
    window = Column(Integer)
    params = Column(JSON, default=dict)
    question_list = relationship("QuestionList", back_populates="questions")
    results = relationship("VarResult", back_populates="question")


class BacktestRun(Base):
    __tablename__ = "backtest_runs"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(String, index=True)
    question_list_id = Column(Integer, ForeignKey("question_lists.id"))
    started_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime)
    status = Column(String, default="running")
    triggered_by = Column(String)
    notes = Column(Text)
    results = relationship("VarResult", back_populates="backtest_run", cascade="all, delete-orphan")


class VarResult(Base):
    __tablename__ = "var_results"

    id = Column(Integer, primary_key=True, index=True)
    backtest_run_id = Column(Integer, ForeignKey("backtest_runs.id"))
    question_id = Column(Integer, ForeignKey("questions.id"))
    question_external_id = Column(String, index=True)
    var_value = Column(Float)
    var_lower = Column(Float)
    var_upper = Column(Float)
    var_expected = Column(Float)
    historical_var_value = Column(Float)
    historical_var_source = Column(String)
    is_extrapolation = Column(Boolean, default=False)
    extrapolation_bounds_breached = Column(Boolean, default=False)
    answer_match = Column(Boolean)
    chart_generated = Column(Boolean, default=False)
    chart_path = Column(String)
    chart_hash = Column(String)
    chart_verified = Column(Boolean, default=False)
    last_validated_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    backtest_run = relationship("BacktestRun", back_populates="results")
    question = relationship("Question", back_populates="results")
    anomalies = relationship("AnomalyRecord", back_populates="var_result", cascade="all, delete-orphan")
    validations = relationship("ValidationRecord", back_populates="var_result", cascade="all, delete-orphan")


class ValidationRule(Base):
    __tablename__ = "validation_rules"

    id = Column(Integer, primary_key=True, index=True)
    rule_code = Column(String, unique=True)
    rule_name = Column(String)
    category = Column(String)
    description = Column(Text)
    severity = Column(String)
    is_active = Column(Boolean, default=True)
    params = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)


class ValidationRecord(Base):
    __tablename__ = "validation_records"

    id = Column(Integer, primary_key=True, index=True)
    var_result_id = Column(Integer, ForeignKey("var_results.id"))
    rule_id = Column(Integer, ForeignKey("validation_rules.id"))
    passed = Column(Boolean)
    detail = Column(Text)
    checked_at = Column(DateTime, default=datetime.utcnow)
    var_result = relationship("VarResult", back_populates="validations")


class AnomalyRecord(Base):
    __tablename__ = "anomaly_records"

    id = Column(Integer, primary_key=True, index=True)
    var_result_id = Column(Integer, ForeignKey("var_results.id"))
    anomaly_type = Column(String)
    severity = Column(String)
    action_required = Column(String)
    title = Column(String)
    detail = Column(Text)
    resolution_status = Column(String, default="open")
    resolution_note = Column(Text)
    reported_by = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime)
    var_result = relationship("VarResult", back_populates="anomalies")


class ImpactNotification(Base):
    __tablename__ = "impact_notifications"

    id = Column(Integer, primary_key=True, index=True)
    old_question_list_id = Column(Integer)
    new_question_list_id = Column(Integer)
    question_external_id = Column(String)
    impact_type = Column(String)
    description = Column(Text)
    old_result_summary = Column(JSON)
    needs_rerun = Column(Boolean, default=True)
    notified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
