from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, JSON, Float, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

SQLALCHEMY_DATABASE_URL = "sqlite:///./drift_monitor.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class DriftCase(Base):
    __tablename__ = "drift_cases"

    id = Column(Integer, primary_key=True, index=True)
    case_no = Column(String(64), unique=True, index=True, nullable=False)
    title = Column(String(256), nullable=False)
    model_name = Column(String(128), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    runs = relationship("ReplayRun", back_populates="case", cascade="all, delete-orphan")
    timeline = relationship("TimelineEvent", back_populates="case", cascade="all, delete-orphan")


class ReplayRun(Base):
    __tablename__ = "replay_runs"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("drift_cases.id"), nullable=False)
    run_version = Column(Integer, nullable=False)
    model_version = Column(String(64), nullable=False)
    status = Column(String(32), nullable=False, default="pending")
    # pending / running / completed / pending_confirm / confirmed / rejected
    trigger_source = Column(String(32), nullable=False)  # scheduled / manual / feature_arrived
    triggered_by = Column(String(64), nullable=False, default="system")
    drift_score = Column(Float, nullable=True)
    threshold = Column(Float, nullable=True)
    is_drift = Column(Boolean, nullable=True)
    final_conclusion = Column(Text, nullable=True)
    feature_late_reason = Column(Text, nullable=True)
    confirm_next_step = Column(Text, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)

    case = relationship("DriftCase", back_populates="runs")
    snapshots = relationship("FeatureSnapshot", back_populates="run", cascade="all, delete-orphan")
    materials = relationship("MaterialMapping", back_populates="run", cascade="all, delete-orphan")
    judgments = relationship("ManualJudgment", back_populates="run", cascade="all, delete-orphan")


class FeatureSnapshot(Base):
    __tablename__ = "feature_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("replay_runs.id"), nullable=False)
    feature_name = Column(String(128), nullable=False)
    reference_dist = Column(JSON, nullable=False)
    current_dist = Column(JSON, nullable=False)
    ks_statistic = Column(Float, nullable=True)
    was_late = Column(Boolean, default=False)
    arrived_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    run = relationship("ReplayRun", back_populates="snapshots")


class MaterialMapping(Base):
    __tablename__ = "material_mappings"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("replay_runs.id"), nullable=False)
    material_name_raw = Column(String(256), nullable=False)
    material_name_standard = Column(String(256), nullable=False)
    matched_evidence = Column(Text, nullable=False)
    linked_conclusion = Column(Text, nullable=False)
    uploaded_by = Column(String(64), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    run = relationship("ReplayRun", back_populates="materials")


class ManualJudgment(Base):
    __tablename__ = "manual_judgments"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("replay_runs.id"), nullable=False)
    judge_name = Column(String(64), nullable=False)
    judgment = Column(String(16), nullable=False)  # confirmed / rejected / adjusted
    reason = Column(Text, nullable=False)
    before_status = Column(String(32), nullable=False)
    after_status = Column(String(32), nullable=False)
    # 标记该判词是否已被后续模型版本覆盖为不可见
    preserved = Column(Boolean, default=True)
    # 引用上一个模型版本的 run_id，用于回溯链
    prev_run_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    run = relationship("ReplayRun", back_populates="judgments")


class TimelineEvent(Base):
    __tablename__ = "timeline_events"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("drift_cases.id"), nullable=False)
    run_id = Column(Integer, nullable=True)
    event_type = Column(String(32), nullable=False)
    # run_started / run_completed / status_changed / material_linked / judgment_added / feature_arrived / rerun_triggered / exported
    operator = Column(String(64), nullable=False, default="system")
    description = Column(Text, nullable=False)
    meta = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("DriftCase", back_populates="timeline")


def init_db():
    Base.metadata.create_all(bind=engine)
