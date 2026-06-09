from datetime import datetime
from sqlalchemy import (
    create_engine, Column, Integer, String, Float, Boolean,
    DateTime, Text, ForeignKey, JSON
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

SQLALCHEMY_DATABASE_URL = "sqlite:///./sudoku_reducer.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="imported")
    total_records = Column(Integer, default=0)
    valid_records = Column(Integer, default=0)
    invalid_records = Column(Integer, default=0)
    note = Column(Text, default="")

    records = relationship("Record", back_populates="batch", cascade="all, delete-orphan")


class Record(Base):
    __tablename__ = "records"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    row_no = Column(Integer)
    candidate_name = Column(String(255))
    value = Column(Float)
    unit = Column(String(50))
    raw_data = Column(JSON)
    is_valid = Column(Boolean, default=True)
    block_reason = Column(String(500), default="")
    status = Column(String(50), default="pending_review")
    reviewed_by = Column(String(100), default="")
    reviewed_at = Column(DateTime)
    is_boundary = Column(Boolean, default=False)
    boundary_arrived_late = Column(Boolean, default=False)
    previous_conclusion = Column(String(500), default="")
    affected_conclusions = Column(JSON, default=list)

    batch = relationship("Batch", back_populates="records")
    status_history = relationship("StatusHistory", back_populates="record", cascade="all, delete-orphan")
    calculation_drafts = relationship("CalculationDraft", back_populates="record", cascade="all, delete-orphan")


class StatusHistory(Base):
    __tablename__ = "status_history"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("records.id"), nullable=False)
    from_status = Column(String(50))
    to_status = Column(String(50))
    changed_by = Column(String(100), default="system")
    changed_at = Column(DateTime, default=datetime.utcnow)
    note = Column(Text, default="")

    record = relationship("Record", back_populates="status_history")


class CalculationDraft(Base):
    __tablename__ = "calculation_drafts"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("records.id"), nullable=False)
    formula_name = Column(String(255))
    formula_expr = Column(Text)
    draft_value = Column(String(500))
    computed_value = Column(Float)
    is_supplement = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    version = Column(Integer, default=1)
    prev_version_id = Column(Integer, default=0)
    diff_note = Column(Text, default="")

    record = relationship("Record", back_populates="calculation_drafts")


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
