from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, Index
from sqlalchemy.dialects.sqlite import JSON
from datetime import datetime
from models import Base

class IdempotencyKey(Base):
    __tablename__ = 'idempotency_keys'
    
    id = Column(Integer, primary_key=True)
    idempotency_key = Column(String(128), unique=True, nullable=False)
    data_type = Column(String(32), nullable=False)
    record_id = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    __table_args__ = (
        Index('idx_idempotency_key', 'idempotency_key', unique=True),
    )

class Registration(Base):
    __tablename__ = 'registrations'
    
    id = Column(Integer, primary_key=True)
    batch_id = Column(String(64), nullable=False)
    employee_id = Column(String(64))
    employee_name = Column(String(128))
    department = Column(String(128))
    training_course = Column(String(256))
    training_date = Column(String(32))
    registration_time = Column(DateTime)
    amount = Column(Float, default=0)
    status = Column(String(32), default='registered')
    raw_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    __table_args__ = (
        Index('idx_reg_batch', 'batch_id'),
        Index('idx_reg_employee', 'employee_id', 'training_course'),
    )

class SignRecord(Base):
    __tablename__ = 'sign_records'
    
    id = Column(Integer, primary_key=True)
    batch_id = Column(String(64), nullable=False)
    sign_id = Column(String(128), unique=True, nullable=False)
    employee_id = Column(String(64))
    employee_name = Column(String(128))
    training_course = Column(String(256))
    sign_time = Column(DateTime, nullable=False)
    sign_type = Column(String(32), default='normal')
    qr_code = Column(String(256))
    location = Column(String(256))
    device_info = Column(String(512))
    is_proxy = Column(Boolean, default=False)
    is_makeup = Column(Boolean, default=False)
    raw_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    __table_args__ = (
        Index('idx_sign_batch', 'batch_id'),
        Index('idx_sign_employee', 'employee_id'),
        Index('idx_sign_time', 'sign_time'),
    )

class Homework(Base):
    __tablename__ = 'homeworks'
    
    id = Column(Integer, primary_key=True)
    batch_id = Column(String(64), nullable=False)
    homework_id = Column(String(128), unique=True, nullable=False)
    employee_id = Column(String(64))
    employee_name = Column(String(128))
    training_course = Column(String(256))
    submit_time = Column(DateTime)
    score = Column(Float)
    status = Column(String(32), default='submitted')
    raw_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    __table_args__ = (
        Index('idx_hw_batch', 'batch_id'),
        Index('idx_hw_employee', 'employee_id'),
    )

class Refund(Base):
    __tablename__ = 'refunds'
    
    id = Column(Integer, primary_key=True)
    batch_id = Column(String(64), nullable=False)
    refund_id = Column(String(128), unique=True, nullable=False)
    employee_id = Column(String(64))
    employee_name = Column(String(128))
    training_course = Column(String(256))
    refund_amount = Column(Float, nullable=False)
    refund_time = Column(DateTime)
    refund_reason = Column(String(512))
    raw_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    __table_args__ = (
        Index('idx_refund_batch', 'batch_id'),
        Index('idx_refund_employee', 'employee_id'),
    )

class DirtyRecord(Base):
    __tablename__ = 'dirty_records'
    
    id = Column(Integer, primary_key=True)
    batch_id = Column(String(64), nullable=False)
    data_type = Column(String(32), nullable=False)
    dirty_type = Column(String(64), nullable=False)
    error_message = Column(String(1024))
    raw_data = Column(JSON, nullable=False)
    suggestion = Column(String(1024))
    is_fixed = Column(Boolean, default=False)
    fixed_by = Column(String(128))
    fixed_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    __table_args__ = (
        Index('idx_dirty_batch', 'batch_id'),
        Index('idx_dirty_type', 'dirty_type'),
        Index('idx_dirty_fixed', 'is_fixed'),
    )

class ReconciliationResult(Base):
    __tablename__ = 'reconciliation_results'
    
    id = Column(Integer, primary_key=True)
    batch_id = Column(String(64), nullable=False, unique=True)
    total_registrations = Column(Integer, default=0)
    total_signs = Column(Integer, default=0)
    total_homeworks = Column(Integer, default=0)
    total_refunds = Column(Integer, default=0)
    signed_count = Column(Integer, default=0)
    unsigned_count = Column(Integer, default=0)
    proxy_sign_count = Column(Integer, default=0)
    makeup_sign_count = Column(Integer, default=0)
    homework_completed = Column(Integer, default=0)
    refund_count = Column(Integer, default=0)
    refund_amount = Column(Float, default=0)
    dirty_count = Column(Integer, default=0)
    unfixed_dirty_count = Column(Integer, default=0)
    details = Column(JSON)
    report_generated_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    __table_args__ = (
        Index('idx_recon_batch', 'batch_id', unique=True),
    )
