from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Float, Boolean, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
from .config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class FunnelSnapshot(Base):
    __tablename__ = "funnel_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    snapshot_name = Column(String(500), nullable=False)
    snapshot_version = Column(String(50), nullable=False)
    model_version = Column(String(200), nullable=False)
    threshold_config = Column(JSON, nullable=False)
    description = Column(Text, nullable=True)
    created_by = Column(String(200), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_locked = Column(Boolean, default=False)
    locked_reason = Column(String(500), nullable=True)
    data_file_path = Column(String(1000), nullable=False)
    status = Column(String(50), default="draft")
    parent_snapshot_id = Column(Integer, ForeignKey("funnel_snapshots.id"), nullable=True)
    seal_month = Column(String(20), nullable=True)

    training_logs = relationship("TrainingLog", back_populates="snapshot", cascade="all, delete-orphan")
    judgments = relationship("SampleJudgment", back_populates="snapshot", cascade="all, delete-orphan")
    changes = relationship("ChangeHistory", back_populates="snapshot", cascade="all, delete-orphan")
    parent = relationship("FunnelSnapshot", remote_side=[id], backref="children")
    feature_materials = relationship("FeatureMaterial", back_populates="snapshot", cascade="all, delete-orphan")


class TrainingLog(Base):
    __tablename__ = "training_logs"

    id = Column(Integer, primary_key=True, index=True)
    snapshot_id = Column(Integer, ForeignKey("funnel_snapshots.id"), nullable=False)
    log_name = Column(String(500), nullable=False)
    log_content_summary = Column(Text, nullable=False)
    log_file_path = Column(String(1000), nullable=False)
    uploaded_by = Column(String(200), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    batch_number = Column(Integer, default=1)
    is_complete = Column(Boolean, default=False)
    completeness_note = Column(String(500), nullable=True)

    snapshot = relationship("FunnelSnapshot", back_populates="training_logs")


class SampleJudgment(Base):
    __tablename__ = "sample_judgments"

    id = Column(Integer, primary_key=True, index=True)
    snapshot_id = Column(Integer, ForeignKey("funnel_snapshots.id"), nullable=False)
    sample_id = Column(String(200), nullable=False)
    sample_content = Column(JSON, nullable=True)
    model_prediction = Column(String(100), nullable=False)
    model_score = Column(Float, nullable=True)
    human_judgment = Column(String(100), nullable=True)
    judged_by = Column(String(200), nullable=True)
    judged_at = Column(DateTime, nullable=True)
    is_manual_locked = Column(Boolean, default=False)
    lock_reason = Column(String(500), nullable=True)
    judgment_note = Column(Text, nullable=True)
    change_reason = Column(String(500), nullable=True)
    previous_judgment = Column(String(100), nullable=True)

    snapshot = relationship("FunnelSnapshot", back_populates="judgments")
    history = relationship("JudgmentHistory", back_populates="judgment", cascade="all, delete-orphan")


class JudgmentHistory(Base):
    __tablename__ = "judgment_histories"

    id = Column(Integer, primary_key=True, index=True)
    judgment_id = Column(Integer, ForeignKey("sample_judgments.id"), nullable=False)
    old_judgment = Column(String(100), nullable=True)
    new_judgment = Column(String(100), nullable=False)
    changed_by = Column(String(200), nullable=False)
    changed_at = Column(DateTime, default=datetime.utcnow)
    change_reason = Column(String(500), nullable=False)
    threshold_before = Column(JSON, nullable=True)
    threshold_after = Column(JSON, nullable=True)
    is_temporary_edit = Column(Boolean, default=False)
    editor_role = Column(String(100), nullable=True)

    judgment = relationship("SampleJudgment", back_populates="history")


class ChangeHistory(Base):
    __tablename__ = "change_histories"

    id = Column(Integer, primary_key=True, index=True)
    snapshot_id = Column(Integer, ForeignKey("funnel_snapshots.id"), nullable=False)
    change_type = Column(String(100), nullable=False)
    field_name = Column(String(200), nullable=True)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    changed_by = Column(String(200), nullable=False)
    changed_at = Column(DateTime, default=datetime.utcnow)
    change_reason = Column(String(500), nullable=False)
    affected_samples = Column(JSON, nullable=True)
    next_step_hint = Column(Text, nullable=True)

    snapshot = relationship("FunnelSnapshot", back_populates="changes")


class FeatureMaterial(Base):
    __tablename__ = "feature_materials"

    id = Column(Integer, primary_key=True, index=True)
    snapshot_id = Column(Integer, ForeignKey("funnel_snapshots.id"), nullable=False)
    material_name = Column(String(500), nullable=False)
    material_type = Column(String(100), nullable=False)
    file_path = Column(String(1000), nullable=False)
    uploaded_by = Column(String(200), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    is_late_arrival = Column(Boolean, default=False)
    impact_description = Column(Text, nullable=True)
    next_action = Column(Text, nullable=True)
    affected_samples_count = Column(Integer, default=0)

    snapshot = relationship("FunnelSnapshot", back_populates="feature_materials")


class JudgmentExplanation(Base):
    __tablename__ = "judgment_explanations"

    id = Column(Integer, primary_key=True, index=True)
    sample_id = Column(String(200), nullable=False)
    old_snapshot_id = Column(Integer, ForeignKey("funnel_snapshots.id"), nullable=False)
    new_snapshot_id = Column(Integer, ForeignKey("funnel_snapshots.id"), nullable=False)
    old_judgment = Column(String(100), nullable=False)
    new_judgment = Column(String(100), nullable=False)
    explanation_text = Column(Text, nullable=False)
    key_factors = Column(JSON, nullable=True)
    threshold_differences = Column(JSON, nullable=True)
    feature_differences = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    old_snapshot = relationship("FunnelSnapshot", foreign_keys=[old_snapshot_id])
    new_snapshot = relationship("FunnelSnapshot", foreign_keys=[new_snapshot_id])


def init_db():
    Base.metadata.create_all(bind=engine)
