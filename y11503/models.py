from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
import config

class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String(50), unique=True, index=True, nullable=False)
    status = Column(String(20), default=config.BatchStatus.DRAFT, index=True)
    operator = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    total_parts = Column(Integer, default=0)
    success_parts = Column(Integer, default=0)
    failed_parts = Column(Integer, default=0)
    idempotency_key = Column(String(100), unique=True, index=True, nullable=False)
    duplicate_strategy = Column(String(20), default=config.DuplicateStrategy.IGNORE)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    submitted_at = Column(DateTime, nullable=True)
    frozen_at = Column(DateTime, nullable=True)

    repair_orders = relationship("RepairOrder", back_populates="batch", cascade="all, delete-orphan")
    parts = relationship("SparePart", back_populates="batch", cascade="all, delete-orphan")
    photos = relationship("Photo", back_populates="batch", cascade="all, delete-orphan")
    operation_logs = relationship("OperationLog", back_populates="batch", cascade="all, delete-orphan")

class RepairOrder(Base):
    __tablename__ = "repair_orders"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    order_no = Column(String(50), index=True, nullable=False)
    customer_name = Column(String(100))
    customer_phone = Column(String(20))
    product_model = Column(String(100))
    fault_description = Column(Text)
    engineer = Column(String(50))
    is_late_submit = Column(Boolean, default=False)
    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    batch = relationship("Batch", back_populates="repair_orders")
    parts = relationship("SparePart", back_populates="repair_order")

class SparePart(Base):
    __tablename__ = "spare_parts"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    repair_order_id = Column(Integer, ForeignKey("repair_orders.id"), nullable=True)
    part_code = Column(String(50), index=True, nullable=False)
    part_name = Column(String(100))
    barcode = Column(String(100), index=True)
    quantity = Column(Integer, default=1)
    status = Column(String(20), default=config.PartStatus.PENDING, index=True)
    is_returned = Column(Boolean, default=False)
    is_scrapped = Column(Boolean, default=False)
    is_mixed = Column(Boolean, default=False)
    scan_time = Column(DateTime)
    scan_operator = Column(String(50))
    validation_result = Column(String(20))
    validation_message = Column(Text)
    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    batch = relationship("Batch", back_populates="parts")
    repair_order = relationship("RepairOrder", back_populates="parts")

class Photo(Base):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    photo_type = Column(String(20), index=True, nullable=False)
    file_path = Column(String(255), nullable=False)
    file_name = Column(String(255))
    file_size = Column(Integer)
    upload_operator = Column(String(50))
    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    batch = relationship("Batch", back_populates="photos")

class OperationLog(Base):
    __tablename__ = "operation_logs"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    operation = Column(String(50), index=True, nullable=False)
    operator = Column(String(50), nullable=False)
    old_status = Column(String(20))
    new_status = Column(String(20))
    changed_fields = Column(Text)
    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    batch = relationship("Batch", back_populates="operation_logs")

class IdempotencyRecord(Base):
    __tablename__ = "idempotency_records"

    id = Column(Integer, primary_key=True, index=True)
    idempotency_key = Column(String(100), unique=True, index=True, nullable=False)
    batch_no = Column(String(50))
    request_hash = Column(String(64))
    processed_at = Column(DateTime, default=datetime.utcnow)
    result_status = Column(String(20))
    result_message = Column(Text)
