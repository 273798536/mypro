from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String(50), unique=True, index=True, nullable=False)
    source_file = Column(String(255), nullable=False)
    imported_by = Column(String(100), default="system")
    imported_at = Column(DateTime, default=datetime.now)
    status = Column(String(20), default="imported")
    total_records = Column(Integer, default=0)
    anomaly_count = Column(Integer, default=0)
    remark = Column(Text, nullable=True)

    records = relationship("DerivativeRecord", back_populates="batch", cascade="all, delete-orphan")
    status_transitions = relationship("StatusTransition", back_populates="batch", cascade="all, delete-orphan")
    report_snapshots = relationship("ReportSnapshot", back_populates="batch", cascade="all, delete-orphan")


class DerivativeRecord(Base):
    __tablename__ = "derivative_records"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    row_no = Column(Integer, nullable=False)
    indicator_name = Column(String(200), nullable=False)
    indicator_code = Column(String(50), nullable=True)
    period = Column(String(20), nullable=True)
    value = Column(Float, nullable=True)
    unit = Column(String(30), nullable=True)
    first_derivative = Column(Float, nullable=True)
    first_derivative_sign = Column(String(10), nullable=True)
    second_derivative = Column(Float, nullable=True)
    second_derivative_sign = Column(String(10), nullable=True)
    sign_change_type = Column(String(50), nullable=True)
    is_anomaly = Column(Boolean, default=False)
    anomaly_type = Column(String(50), nullable=True)
    anomaly_detail = Column(Text, nullable=True)
    status = Column(String(20), default="pending")
    raw_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    batch = relationship("Batch", back_populates="records")
    review_logs = relationship("ReviewLog", back_populates="record", cascade="all, delete-orphan")


class ReviewLog(Base):
    __tablename__ = "review_logs"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("derivative_records.id"), nullable=False)
    reviewer = Column(String(100), default="anonymous")
    action = Column(String(20), nullable=False)
    comment = Column(Text, nullable=True)
    before_status = Column(String(20), nullable=True)
    after_status = Column(String(20), nullable=True)
    field_changes = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

    record = relationship("DerivativeRecord", back_populates="review_logs")


class StatusTransition(Base):
    __tablename__ = "status_transitions"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    from_status = Column(String(20), nullable=True)
    to_status = Column(String(20), nullable=False)
    operator = Column(String(100), default="system")
    comment = Column(Text, nullable=True)
    transitioned_at = Column(DateTime, default=datetime.now)

    batch = relationship("Batch", back_populates="status_transitions")


class ReportSnapshot(Base):
    __tablename__ = "report_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    snapshot_type = Column(String(20), nullable=False)
    title = Column(String(200), nullable=False)
    plain_explanation = Column(Text, nullable=True)
    chart_data = Column(JSON, nullable=True)
    summary_data = Column(JSON, nullable=True)
    created_by = Column(String(100), default="system")
    created_at = Column(DateTime, default=datetime.now)

    batch = relationship("Batch", back_populates="report_snapshots")
