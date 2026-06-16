from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Float, Boolean, ForeignKey, JSON
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)
DB_PATH = os.path.join(DATA_DIR, "lora_ledger.db")

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class LoraRecord(Base):
    __tablename__ = "lora_records"

    id = Column(Integer, primary_key=True, index=True)
    lora_id = Column(String(64), unique=True, index=True, nullable=False)
    lora_name = Column(String(256), nullable=False)
    base_model = Column(String(128), nullable=False)
    version = Column(String(32), nullable=False)
    dataset_name = Column(String(256))
    sample_count = Column(Integer, default=0)
    epoch = Column(Integer, default=0)
    learning_rate = Column(Float, default=0.0)
    rank = Column(Integer, default=0)
    alpha = Column(Float, default=0.0)
    status = Column(String(32), default="pending")
    is_gray_release = Column(Boolean, default=False)
    merge_result = Column(String(32), default="pending")
    merge_result_detail = Column(Text)
    safety_check_result = Column(String(32), default="pending")
    safety_check_detail = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    source_type = Column(String(32), default="import")
    source_ref = Column(String(256))
    truncation_note = Column(Text)

    logs = relationship("ProcessingLog", back_populates="record", cascade="all, delete-orphan")
    feedbacks = relationship("HumanFeedback", back_populates="record", cascade="all, delete-orphan")
    comparisons = relationship("GrayComparison", foreign_keys="GrayComparison.record_id", back_populates="record")


class ProcessingLog(Base):
    __tablename__ = "processing_logs"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("lora_records.id"), nullable=False)
    stage = Column(String(64), nullable=False)
    action = Column(String(64), nullable=False)
    operator = Column(String(64))
    detail = Column(JSON)
    result = Column(String(32), default="success")
    error_msg = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    raw_source_snapshot = Column(Text)

    record = relationship("LoraRecord", back_populates="logs")


class HumanFeedback(Base):
    __tablename__ = "human_feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("lora_records.id"), nullable=False)
    feedback_id = Column(String(64), unique=True, index=True, nullable=False)
    feedback_type = Column(String(32))
    content = Column(Text, nullable=False)
    reviewer = Column(String(64))
    conclusion = Column(String(32))
    confidence = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_duplicate = Column(Boolean, default=False)
    duplicate_of = Column(Integer, ForeignKey("human_feedbacks.id"))
    source_channel = Column(String(32), default="manual")
    import_batch = Column(String(64))

    record = relationship("LoraRecord", back_populates="feedbacks")


class GrayComparison(Base):
    __tablename__ = "gray_comparisons"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("lora_records.id"), nullable=False)
    compared_lora_id = Column(Integer, ForeignKey("lora_records.id"))
    test_case_id = Column(String(64))
    input_prompt = Column(Text)
    output_a = Column(Text)
    output_b = Column(Text)
    diff_score = Column(Float, default=0.0)
    safety_a = Column(String(32))
    safety_b = Column(String(32))
    human_preference = Column(String(32))
    created_at = Column(DateTime, default=datetime.utcnow)

    record = relationship("LoraRecord", back_populates="comparisons", foreign_keys=[record_id])


class SafetyRule(Base):
    __tablename__ = "safety_rules"

    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(String(64), unique=True, index=True, nullable=False)
    rule_name = Column(String(256), nullable=False)
    rule_type = Column(String(32))
    pattern = Column(Text)
    severity = Column(String(32), default="warn")
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ExportRecord(Base):
    __tablename__ = "export_records"

    id = Column(Integer, primary_key=True, index=True)
    export_id = Column(String(64), unique=True, index=True, nullable=False)
    export_type = Column(String(32))
    export_format = Column(String(16), default="xlsx")
    scope = Column(JSON)
    summary_hash = Column(String(64))
    summary_snapshot = Column(JSON)
    file_path = Column(String(512))
    operator = Column(String(64))
    created_at = Column(DateTime, default=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
