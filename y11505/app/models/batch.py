from sqlalchemy import Column, String, DateTime, Text, Boolean, Integer
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base
from app.core.constants import BatchStatus, DuplicateStrategy


class Batch(Base):
    __tablename__ = "batches"

    id = Column(String, primary_key=True, index=True)
    batch_no = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    
    department = Column(String, nullable=False)
    operator = Column(String, nullable=False)
    
    status = Column(String, default=BatchStatus.DRAFT, index=True)
    status_before_freeze = Column(String, nullable=True)
    
    duplicate_strategy = Column(String, default=DuplicateStrategy.IGNORE)
    
    record_count = Column(Integer, default=0)
    abnormal_count = Column(Integer, default=0)
    
    review_reason = Column(Text, nullable=True)
    review_operator = Column(String, nullable=True)
    review_time = Column(DateTime, nullable=True)
    
    freeze_reason = Column(Text, nullable=True)
    freeze_operator = Column(String, nullable=True)
    freeze_time = Column(DateTime, nullable=True)
    
    settle_reason = Column(Text, nullable=True)
    settle_operator = Column(String, nullable=True)
    settle_time = Column(DateTime, nullable=True)
    
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    inspection_records = relationship("InspectionRecord", back_populates="batch", cascade="all, delete-orphan")
    calibration_certificates = relationship("CalibrationCertificate", back_populates="batch", cascade="all, delete-orphan")
    repair_quotes = relationship("RepairQuote", back_populates="batch", cascade="all, delete-orphan")
    price_adjustments = relationship("PriceAdjustment", back_populates="batch", cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="batch", cascade="all, delete-orphan")
    status_histories = relationship("StatusHistory", back_populates="batch", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="batch", cascade="all, delete-orphan")
