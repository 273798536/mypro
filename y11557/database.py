from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

SQLALCHEMY_DATABASE_URL = "sqlite:///./agri_delivery.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    hashed_password = Column(String(255))
    role = Column(String(20))
    full_name = Column(String(100))
    region = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class StoreOrder(Base):
    __tablename__ = "store_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_no = Column(String(50), unique=True, index=True)
    store_name = Column(String(100))
    region = Column(String(50))
    product_name = Column(String(100))
    quantity = Column(Float)
    unit = Column(String(20))
    amount = Column(Float)
    driver_name = Column(String(50))
    vehicle_no = Column(String(50))
    order_date = Column(DateTime)
    status = Column(String(20), default="pending")
    data_source = Column(String(20), default="original")
    is_supplementary = Column(Boolean, default=False)
    created_by = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class DriverTrack(Base):
    __tablename__ = "driver_tracks"

    id = Column(Integer, primary_key=True, index=True)
    order_no = Column(String(50), index=True)
    driver_name = Column(String(50))
    vehicle_no = Column(String(50))
    location = Column(String(200))
    track_time = Column(DateTime)
    status = Column(String(20))
    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class ReceiptIOU(Base):
    __tablename__ = "receipt_ious"

    id = Column(Integer, primary_key=True, index=True)
    order_no = Column(String(50), index=True)
    receipt_no = Column(String(50), unique=True, index=True)
    store_name = Column(String(100))
    signatory = Column(String(50))
    sign_time = Column(DateTime)
    actual_quantity = Column(Float)
    actual_amount = Column(Float)
    is_iou = Column(Boolean, default=False)
    iou_amount = Column(Float, default=0)
    payment_status = Column(String(20), default="unpaid")
    remark = Column(Text)
    created_by = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)


class RetryQueue(Base):
    __tablename__ = "retry_queue"

    id = Column(Integer, primary_key=True, index=True)
    order_no = Column(String(50), index=True)
    task_type = Column(String(50))
    current_status = Column(String(30), default="pending")
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    priority = Column(Integer, default=5)
    error_message = Column(Text)
    error_category = Column(String(50))
    last_retry_time = Column(DateTime)
    next_retry_time = Column(DateTime)
    is_dead_letter = Column(Boolean, default=False)
    manual_override = Column(Boolean, default=False)
    handled_by = Column(String(50))
    handled_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)


class ReceiptSubmission(Base):
    __tablename__ = "receipt_submissions"

    id = Column(Integer, primary_key=True, index=True)
    receipt_no = Column(String(50), index=True)
    order_no = Column(String(50), index=True)
    source = Column(String(50))
    submission_data = Column(JSON)
    submission_status = Column(String(30), default="queued")
    verified_status = Column(String(30), default="pending")
    reviewer = Column(String(50))
    review_comment = Column(Text)
    reviewed_at = Column(DateTime)
    created_by = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)


class CompensationRecord(Base):
    __tablename__ = "compensation_records"

    id = Column(Integer, primary_key=True, index=True)
    order_no = Column(String(50), index=True)
    compensation_type = Column(String(50))
    compensation_amount = Column(Float)
    compensation_reason = Column(Text)
    accounting_status = Column(String(30), default="pending")
    posted_by = Column(String(50))
    posted_at = Column(DateTime)
    verified_by = Column(String(50))
    verified_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    order_no = Column(String(50), index=True)
    action = Column(String(50))
    old_value = Column(JSON)
    new_value = Column(JSON)
    operator = Column(String(50))
    operator_role = Column(String(20))
    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class FailedRecord(Base):
    __tablename__ = "failed_records"

    id = Column(Integer, primary_key=True, index=True)
    order_no = Column(String(50), index=True)
    receipt_no = Column(String(50))
    failure_type = Column(String(50))
    error_code = Column(String(50))
    error_message = Column(Text)
    raw_data = Column(JSON)
    is_resolved = Column(Boolean, default=False)
    resolved_by = Column(String(50))
    resolution_note = Column(Text)
    resolved_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
