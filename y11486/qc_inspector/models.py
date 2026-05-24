from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Text, Boolean,
    ForeignKey, Index
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class ImportStatus(PyEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIAL = "partial"


class TaskStatus(PyEnum):
    PENDING = "pending"
    RETRY = "retry_waiting"
    MANUAL = "manual_required"
    PERMANENT = "permanent_failed"
    COMPLETED = "completed"


class ConflictStrategy(PyEnum):
    IGNORE = "ignore"
    OVERWRITE = "overwrite"
    APPEND = "append"


class DataSource(PyEnum):
    INSPECTION = "inspection"
    REWORK = "rework"
    SHIFT = "shift"
    SUPPLIER = "supplier"
    APPROVAL = "approval"


class ImportBatch(Base):
    __tablename__ = "import_batches"

    id = Column(Integer, primary_key=True)
    source = Column(String(50), nullable=False)
    file_name = Column(String(255), nullable=False)
    strategy = Column(String(50), nullable=False, default=ConflictStrategy.IGNORE.value)
    status = Column(String(50), nullable=False, default=ImportStatus.PENDING.value)
    operator = Column(String(100), nullable=False)
    total_rows = Column(Integer, default=0)
    success_rows = Column(Integer, default=0)
    failed_rows = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.now)
    completed_at = Column(DateTime)
    notes = Column(Text)

    rework_records = relationship("ReworkRecord", back_populates="batch", cascade="all, delete-orphan")
    inspection_records = relationship("InspectionRecord", back_populates="batch", cascade="all, delete-orphan")
    shift_records = relationship("ShiftRecord", back_populates="batch", cascade="all, delete-orphan")
    supplier_records = relationship("SupplierRecord", back_populates="batch", cascade="all, delete-orphan")
    approval_records = relationship("ApprovalRecord", back_populates="batch", cascade="all, delete-orphan")
    tasks = relationship("AsyncTask", back_populates="batch", cascade="all, delete-orphan")


class ReworkRecord(Base):
    __tablename__ = "rework_records"

    id = Column(Integer, primary_key=True)
    batch_id = Column(Integer, ForeignKey("import_batches.id"))
    original_row = Column(Integer)
    product_model = Column(String(100))
    serial_number = Column(String(100))
    defect_type = Column(String(100))
    defect_description = Column(Text)
    rework_action = Column(String(200))
    rework_result = Column(String(50))
    responsible_shift = Column(String(50))
    rework_count = Column(Integer, default=1)
    yield_rate = Column(Float)
    inspector = Column(String(100))
    rework_date = Column(DateTime)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    is_valid = Column(Boolean, default=True)
    validation_errors = Column(Text)

    batch = relationship("ImportBatch", back_populates="rework_records")
    audit_logs = relationship("AuditLog", back_populates="rework_record", foreign_keys="AuditLog.rework_record_id")

    __table_args__ = (
        Index("idx_rework_serial", "serial_number"),
        Index("idx_rework_model", "product_model"),
        Index("idx_rework_date", "rework_date"),
    )


class InspectionRecord(Base):
    __tablename__ = "inspection_records"

    id = Column(Integer, primary_key=True)
    batch_id = Column(Integer, ForeignKey("import_batches.id"))
    original_row = Column(Integer)
    product_model = Column(String(100))
    inspection_date = Column(DateTime)
    sample_size = Column(Integer)
    defect_count = Column(Integer)
    defect_rate = Column(Float)
    inspector = Column(String(100))
    result = Column(String(50))
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    is_valid = Column(Boolean, default=True)
    validation_errors = Column(Text)

    batch = relationship("ImportBatch", back_populates="inspection_records")
    audit_logs = relationship("AuditLog", back_populates="inspection_record", foreign_keys="AuditLog.inspection_record_id")


class ShiftRecord(Base):
    __tablename__ = "shift_records"

    id = Column(Integer, primary_key=True)
    batch_id = Column(Integer, ForeignKey("import_batches.id"))
    original_row = Column(Integer)
    shift_name = Column(String(50))
    shift_date = Column(DateTime)
    machine_id = Column(String(50))
    operator = Column(String(100))
    output_count = Column(Integer)
    defect_count = Column(Integer)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    is_valid = Column(Boolean, default=True)
    validation_errors = Column(Text)

    batch = relationship("ImportBatch", back_populates="shift_records")
    audit_logs = relationship("AuditLog", back_populates="shift_record", foreign_keys="AuditLog.shift_record_id")


class SupplierRecord(Base):
    __tablename__ = "supplier_records"

    id = Column(Integer, primary_key=True)
    batch_id = Column(Integer, ForeignKey("import_batches.id"))
    original_row = Column(Integer)
    supplier_name = Column(String(200))
    product_model = Column(String(100))
    quantity = Column(Integer)
    unit_price = Column(Float)
    total_amount = Column(Float)
    invoice_date = Column(DateTime)
    payment_status = Column(String(50))
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    is_valid = Column(Boolean, default=True)
    validation_errors = Column(Text)

    batch = relationship("ImportBatch", back_populates="supplier_records")
    audit_logs = relationship("AuditLog", back_populates="supplier_record", foreign_keys="AuditLog.supplier_record_id")


class ApprovalRecord(Base):
    __tablename__ = "approval_records"

    id = Column(Integer, primary_key=True)
    batch_id = Column(Integer, ForeignKey("import_batches.id"))
    original_row = Column(Integer)
    email_subject = Column(String(255))
    email_from = Column(String(200))
    email_to = Column(String(200))
    approval_type = Column(String(100))
    related_serial = Column(String(100))
    approval_result = Column(String(50))
    approval_date = Column(DateTime)
    approver = Column(String(100))
    comments = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    is_valid = Column(Boolean, default=True)
    validation_errors = Column(Text)

    batch = relationship("ImportBatch", back_populates="approval_records")
    audit_logs = relationship("AuditLog", back_populates="approval_record", foreign_keys="AuditLog.approval_record_id")


class AsyncTask(Base):
    __tablename__ = "async_tasks"

    id = Column(Integer, primary_key=True)
    batch_id = Column(Integer, ForeignKey("import_batches.id"))
    source_type = Column(String(50))
    source_id = Column(Integer)
    task_type = Column(String(100))
    status = Column(String(50), nullable=False, default=TaskStatus.PENDING.value)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    error_message = Column(Text)
    error_details = Column(Text)
    operator = Column(String(100))
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    completed_at = Column(DateTime)
    resume_token = Column(String(255))

    batch = relationship("ImportBatch", back_populates="tasks")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True)
    rework_record_id = Column(Integer, ForeignKey("rework_records.id"))
    inspection_record_id = Column(Integer, ForeignKey("inspection_records.id"))
    shift_record_id = Column(Integer, ForeignKey("shift_records.id"))
    supplier_record_id = Column(Integer, ForeignKey("supplier_records.id"))
    approval_record_id = Column(Integer, ForeignKey("approval_records.id"))
    action = Column(String(50), nullable=False)
    field_name = Column(String(100))
    old_value = Column(Text)
    new_value = Column(Text)
    operator = Column(String(100), nullable=False)
    reason = Column(Text, nullable=False)
    change_source = Column(String(100))
    created_at = Column(DateTime, default=datetime.now)

    rework_record = relationship("ReworkRecord", back_populates="audit_logs", foreign_keys=[rework_record_id])
    inspection_record = relationship("InspectionRecord", back_populates="audit_logs", foreign_keys=[inspection_record_id])
    shift_record = relationship("ShiftRecord", back_populates="audit_logs", foreign_keys=[shift_record_id])
    supplier_record = relationship("SupplierRecord", back_populates="audit_logs", foreign_keys=[supplier_record_id])
    approval_record = relationship("ApprovalRecord", back_populates="audit_logs", foreign_keys=[approval_record_id])

    __table_args__ = (
        Index("idx_audit_created", "created_at"),
        Index("idx_audit_operator", "operator"),
    )
