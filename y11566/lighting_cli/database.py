from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Boolean, ForeignKey, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

Base = declarative_base()


class ImportRecord(Base):
    __tablename__ = 'import_records'
    
    id = Column(Integer, primary_key=True)
    batch_id = Column(String(100), nullable=False, index=True)
    source_type = Column(String(50), nullable=False)
    file_name = Column(String(255))
    import_strategy = Column(String(20), default='ignore')
    imported_by = Column(String(100), default='system')
    imported_at = Column(DateTime, default=datetime.now)
    total_rows = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    skipped_count = Column(Integer, default=0)
    status = Column(String(20), default='completed')
    
    work_orders = relationship('WorkOrder', back_populates='import_record')


class WorkOrder(Base):
    __tablename__ = 'work_orders'
    
    id = Column(Integer, primary_key=True)
    fact_id = Column(String(100), unique=True, nullable=False, index=True)
    import_record_id = Column(Integer, ForeignKey('import_records.id'))
    original_line_number = Column(Integer)
    
    location = Column(String(255), nullable=False, index=True)
    road_section = Column(String(255), index=True)
    pole_number = Column(String(50))
    
    issue_type = Column(String(50))
    description = Column(Text)
    severity = Column(String(20), default='normal')
    
    photo_path = Column(String(500))
    photo_exif_data = Column(Text)
    
    hotline_caller = Column(String(100))
    hotline_phone = Column(String(50))
    hotline_time = Column(DateTime)
    
    spare_part_batch = Column(String(100))
    spare_part_name = Column(String(255))
    spare_part_quantity = Column(Integer)
    
    approval_email_subject = Column(String(255))
    approval_email_from = Column(String(100))
    approval_email_time = Column(DateTime)
    approval_status = Column(String(20))
    
    status = Column(String(20), default='pending')
    check_status = Column(String(20), default='unchecked')
    check_error = Column(Text)
    check_error_type = Column(String(20))
    
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    import_record = relationship('ImportRecord', back_populates='work_orders')
    audit_logs = relationship('AuditLog', back_populates='work_order')
    async_tasks = relationship('AsyncTask', back_populates='work_order')


class AuditLog(Base):
    __tablename__ = 'audit_logs'
    
    id = Column(Integer, primary_key=True)
    work_order_id = Column(Integer, ForeignKey('work_orders.id'))
    batch_id = Column(String(100), index=True)
    
    field_name = Column(String(100), nullable=False)
    old_value = Column(Text)
    new_value = Column(Text)
    
    changed_by = Column(String(100), default='system')
    changed_at = Column(DateTime, default=datetime.now)
    change_reason = Column(String(255))
    
    work_order = relationship('WorkOrder', back_populates='audit_logs')


class AsyncTask(Base):
    __tablename__ = 'async_tasks'
    
    id = Column(Integer, primary_key=True)
    work_order_id = Column(Integer, ForeignKey('work_orders.id'))
    task_type = Column(String(50), nullable=False)
    
    status = Column(String(20), default='pending')
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    last_error = Column(Text)
    error_category = Column(String(20))
    
    queued_at = Column(DateTime, default=datetime.now)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    next_retry_at = Column(DateTime)
    
    work_order = relationship('WorkOrder', back_populates='async_tasks')


class Database:
    def __init__(self, db_path=None):
        if db_path is None:
            db_path = os.path.join(os.getcwd(), 'lighting_data.db')
        self.engine = create_engine(f'sqlite:///{db_path}')
        self.Session = sessionmaker(bind=self.engine)
    
    def init_db(self):
        Base.metadata.create_all(self.engine)
    
    def get_session(self):
        return self.Session()
    
    def reset_db(self):
        Base.metadata.drop_all(self.engine)
        Base.metadata.create_all(self.engine)
