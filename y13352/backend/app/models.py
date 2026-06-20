from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class ReplayTask(Base):
    __tablename__ = "replay_tasks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    status = Column(String(50), default="pending")
    snapshot_version = Column(String(100))
    snapshot_alias = Column(String(100))
    snapshot_alias_points_old = Column(Boolean, default=False)
    current_status = Column(String(500), default="待启动")
    page_summary = Column(String(500), default="暂无回放记录")
    created_by = Column(String(100), default="值班人员")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    runs = relationship("ReplayRun", back_populates="task", cascade="all, delete-orphan")
    judgments = relationship("ManualJudgment", back_populates="task", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="task", cascade="all, delete-orphan")


class ReplayRun(Base):
    __tablename__ = "replay_runs"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("replay_tasks.id"), nullable=False)
    run_number = Column(Integer, nullable=False)
    status = Column(String(50), default="running")
    started_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime)
    snapshot_file = Column(String(500))
    threshold = Column(Float, default=0.85)
    sample_count = Column(Integer, default=0)
    anomaly_count = Column(Integer, default=0)
    metrics = Column(JSON, default=dict)
    sample_ids = Column(JSON, default=list)
    anomaly_ids = Column(JSON, default=list)

    task = relationship("ReplayTask", back_populates="runs")
    parameters = relationship("RunParameter", back_populates="run", cascade="all, delete-orphan")


class RunParameter(Base):
    __tablename__ = "run_parameters"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("replay_runs.id"), nullable=False)
    param_name = Column(String(200), nullable=False)
    param_value = Column(String(1000))
    changed_from_previous = Column(Boolean, default=False)
    previous_value = Column(String(1000))

    run = relationship("ReplayRun", back_populates="parameters")


class ManualJudgment(Base):
    __tablename__ = "manual_judgments"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("replay_tasks.id"), nullable=False)
    run_id = Column(Integer, ForeignKey("replay_runs.id"))
    sample_id = Column(String(200), nullable=False)
    original_label = Column(String(50))
    new_label = Column(String(50))
    reason = Column(String(500))
    created_by = Column(String(100), default="值班人员")
    created_at = Column(DateTime, default=datetime.utcnow)

    task = relationship("ReplayTask", back_populates="judgments")


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("replay_tasks.id"), nullable=False)
    run_id = Column(Integer, ForeignKey("replay_runs.id"))
    content = Column(Text, nullable=False)
    note_type = Column(String(20), default="written")
    created_by = Column(String(100), default="值班人员")
    created_at = Column(DateTime, default=datetime.utcnow)

    task = relationship("ReplayTask", back_populates="notes")
