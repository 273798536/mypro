import os
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import (
    create_engine, Column, Integer, String, Float, DateTime,
    Text, Boolean, ForeignKey, Enum, Index
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

DB_PATH = os.path.expanduser("~/.customs_cli/customs.db")
Base = declarative_base()


class ImportStrategy(PyEnum):
    IGNORE = "ignore"
    OVERWRITE = "overwrite"
    APPEND = "append"


class TaskStatus(PyEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    WAIT_RETRY = "wait_retry"
    WAIT_MANUAL = "wait_manual"
    PERMANENT_FAILED = "permanent_failed"
    COMPLETED = "completed"


class DataSourceType(PyEnum):
    DECLARATION = "declaration"
    TRACKING = "tracking"
    TAX_NOTICE = "tax_notice"
    APPROVAL_EMAIL = "approval_email"
    SUPPLIER_STATEMENT = "supplier_statement"


class ExceptionType(PyEnum):
    MISMATCH = "mismatch"
    MISSING_DATA = "missing_data"
    TAX_DISCREPANCY = "tax_discrepancy"
    DUPLICATE = "duplicate"
    INVALID_FORMAT = "invalid_format"


class DataSource(Base):
    __tablename__ = "data_sources"
    
    id = Column(Integer, primary_key=True)
    source_type = Column(Enum(DataSourceType), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    file_hash = Column(String(64), index=True)
    import_strategy = Column(Enum(ImportStrategy), default=ImportStrategy.APPEND)
    batch_id = Column(String(64), index=True)
    imported_by = Column(String(100), default="system")
    imported_at = Column(DateTime, default=datetime.utcnow)
    total_rows = Column(Integer, default=0)
    success_rows = Column(Integer, default=0)
    failed_rows = Column(Integer, default=0)
    remark = Column(Text)
    
    __table_args__ = (
        Index("idx_source_batch", "source_type", "batch_id"),
    )


class Package(Base):
    __tablename__ = "packages"
    
    id = Column(Integer, primary_key=True)
    source_id = Column(Integer, ForeignKey("data_sources.id"))
    batch_id = Column(String(64), index=True)
    original_row = Column(Integer)
    tracking_number = Column(String(100), index=True)
    package_number = Column(String(100), index=True)
    declaration_number = Column(String(100), index=True)
    supplier = Column(String(200), index=True)
    sender = Column(String(200))
    receiver = Column(String(200))
    weight = Column(Float)
    declared_value = Column(Float)
    currency = Column(String(10), default="USD")
    origin_country = Column(String(100))
    destination_country = Column(String(100))
    item_description = Column(Text)
    hs_code = Column(String(50))
    split_flag = Column(Boolean, default=False)
    parent_package_id = Column(Integer, ForeignKey("packages.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    source = relationship("DataSource", backref="packages")
    children = relationship("Package", remote_side=[id])


class TrackingNode(Base):
    __tablename__ = "tracking_nodes"
    
    id = Column(Integer, primary_key=True)
    source_id = Column(Integer, ForeignKey("data_sources.id"))
    batch_id = Column(String(64), index=True)
    original_row = Column(Integer)
    tracking_number = Column(String(100), index=True)
    node_time = Column(DateTime, index=True)
    node_location = Column(String(200))
    node_status = Column(String(100))
    node_description = Column(Text)
    operator = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    source = relationship("DataSource", backref="tracking_nodes")


class TaxNotice(Base):
    __tablename__ = "tax_notices"
    
    id = Column(Integer, primary_key=True)
    source_id = Column(Integer, ForeignKey("data_sources.id"))
    batch_id = Column(String(64), index=True)
    original_row = Column(Integer)
    notice_number = Column(String(100), index=True)
    tracking_number = Column(String(100), index=True)
    declaration_number = Column(String(100), index=True)
    tax_type = Column(String(50))
    tax_amount = Column(Float)
    tax_currency = Column(String(10))
    issue_date = Column(DateTime)
    due_date = Column(DateTime)
    payer = Column(String(200))
    tax_authority = Column(String(200))
    status = Column(String(50), default="unpaid")
    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    source = relationship("DataSource", backref="tax_notices")


class SupplierStatement(Base):
    __tablename__ = "supplier_statements"
    
    id = Column(Integer, primary_key=True)
    source_id = Column(Integer, ForeignKey("data_sources.id"))
    batch_id = Column(String(64), index=True)
    original_row = Column(Integer)
    statement_number = Column(String(100), index=True)
    supplier = Column(String(200), index=True)
    tracking_number = Column(String(100), index=True)
    declaration_number = Column(String(100), index=True)
    invoice_amount = Column(Float)
    currency = Column(String(10))
    tax_amount = Column(Float)
    invoice_date = Column(DateTime)
    due_date = Column(DateTime)
    status = Column(String(50), default="pending")
    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    source = relationship("DataSource", backref="supplier_statements")


class ApprovalEmail(Base):
    __tablename__ = "approval_emails"
    
    id = Column(Integer, primary_key=True)
    source_id = Column(Integer, ForeignKey("data_sources.id"))
    batch_id = Column(String(64), index=True)
    original_row = Column(Integer)
    email_id = Column(String(200), index=True)
    subject = Column(String(500))
    sender = Column(String(200))
    receiver = Column(String(200))
    sent_at = Column(DateTime)
    approval_type = Column(String(100))
    approval_status = Column(String(50))
    related_batch_id = Column(String(64))
    related_tracking_numbers = Column(Text)
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    source = relationship("DataSource", backref="approval_emails")


class TaxRecord(Base):
    __tablename__ = "tax_records"
    
    id = Column(Integer, primary_key=True)
    batch_id = Column(String(64), index=True)
    package_id = Column(Integer, ForeignKey("packages.id"))
    tracking_number = Column(String(100), index=True)
    declaration_number = Column(String(100), index=True)
    supplier = Column(String(200), index=True)
    calculated_tax = Column(Float)
    actual_tax = Column(Float)
    tax_difference = Column(Float)
    tax_type = Column(String(50))
    tax_authority = Column(String(200))
    is_matched = Column(Boolean, default=False)
    split_from_id = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    package = relationship("Package", backref="tax_records")


class ExceptionStage(PyEnum):
    IMPORT = "import"
    CHECK = "check"


class ExceptionRecord(Base):
    __tablename__ = "exception_records"
    
    id = Column(Integer, primary_key=True)
    batch_id = Column(String(64), index=True)
    source_id = Column(Integer, ForeignKey("data_sources.id"))
    exception_type = Column(Enum(ExceptionType), index=True)
    exception_stage = Column(Enum(ExceptionStage), default=ExceptionStage.IMPORT, index=True)
    severity = Column(String(20), default="warning")
    tracking_number = Column(String(100), index=True)
    related_table = Column(String(100))
    related_id = Column(Integer)
    original_row = Column(Integer)
    field_name = Column(String(100))
    expected_value = Column(Text)
    actual_value = Column(Text)
    message = Column(Text)
    is_resolved = Column(Boolean, default=False)
    resolved_by = Column(String(100))
    resolved_at = Column(DateTime)
    resolution_note = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    source = relationship("DataSource", backref="exceptions")


class AsyncTask(Base):
    __tablename__ = "async_tasks"
    
    id = Column(Integer, primary_key=True)
    task_id = Column(String(64), unique=True, index=True)
    task_type = Column(String(100), index=True)
    batch_id = Column(String(64), index=True)
    status = Column(Enum(TaskStatus), default=TaskStatus.PENDING, index=True)
    progress = Column(Integer, default=0)
    total_items = Column(Integer, default=0)
    current_item = Column(Integer, default=0)
    payload = Column(Text)
    result = Column(Text)
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    created_by = Column(String(100), default="system")
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    last_heartbeat = Column(DateTime)
    
    __table_args__ = (
        Index("idx_task_status_created", "status", "created_at"),
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True)
    batch_id = Column(String(64), index=True)
    table_name = Column(String(100), index=True)
    record_id = Column(Integer)
    action = Column(String(50), index=True)
    field_name = Column(String(100))
    old_value = Column(Text)
    new_value = Column(Text)
    changed_by = Column(String(100), default="system")
    changed_at = Column(DateTime, default=datetime.utcnow)
    comment = Column(Text)
    source_type = Column(String(100))
    original_row = Column(Integer)
    
    __table_args__ = (
        Index("idx_audit_table_record", "table_name", "record_id"),
        Index("idx_audit_batch_action", "batch_id", "action"),
    )


def get_engine():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    return create_engine(f"sqlite:///{DB_PATH}")


def get_session():
    engine = get_engine()
    Session = sessionmaker(bind=engine)
    return Session()


def init_db():
    engine = get_engine()
    Base.metadata.create_all(engine)
    return True
