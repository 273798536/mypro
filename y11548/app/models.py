from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Float, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import enum


class UserRole(str, enum.Enum):
    DATA_ENTRY = "data_entry"
    REVIEWER = "reviewer"
    SUPERVISOR = "supervisor"
    READ_ONLY = "read_only"


class BatchStatus(str, enum.Enum):
    DRAFT = "draft"
    IN_PROGRESS = "in_progress"
    REVIEWING = "reviewing"
    FROZEN = "frozen"
    COMPLETED = "completed"


class RecordStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    REVIEWED = "reviewed"
    REJECTED = "rejected"
    FROZEN = "frozen"


class ImportStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    PARTIAL = "partial"
    FAILED = "failed"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.READ_ONLY)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    created_records = relationship("OperationLog", foreign_keys="OperationLog.created_by", back_populates="creator")


class ExhibitionBatch(Base):
    __tablename__ = "exhibition_batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String, unique=True, index=True, nullable=False)
    exhibition_name = Column(String, nullable=False)
    location = Column(String)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    status = Column(Enum(BatchStatus), nullable=False, default=BatchStatus.DRAFT)
    description = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    frozen_at = Column(DateTime(timezone=True))
    frozen_by = Column(Integer, ForeignKey("users.id"))

    materials = relationship("Material", back_populates="batch")
    logistics = relationship("LogisticsReceipt", back_populates="batch")
    borrow_records = relationship("BorrowRecord", back_populates="batch")
    scan_records = relationship("ScanRecord", back_populates="batch")


class Material(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("exhibition_batches.id"), nullable=False)
    material_code = Column(String, index=True, nullable=False)
    material_name = Column(String, nullable=False)
    category = Column(String)
    specification = Column(String)
    quantity = Column(Integer, nullable=False)
    unit = Column(String, default="件")
    warehouse_location = Column(String)
    status = Column(Enum(RecordStatus), nullable=False, default=RecordStatus.DRAFT)
    remark = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    batch = relationship("ExhibitionBatch", back_populates="materials")


class LogisticsReceipt(Base):
    __tablename__ = "logistics_receipts"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("exhibition_batches.id"), nullable=False)
    waybill_no = Column(String, index=True)
    logistics_company = Column(String)
    sender = Column(String)
    receiver = Column(String)
    receive_date = Column(DateTime, nullable=False)
    material_code = Column(String, index=True)
    material_name = Column(String)
    quantity = Column(Integer, nullable=False)
    package_condition = Column(String)
    is_damaged = Column(Boolean, default=False)
    damage_description = Column(Text)
    status = Column(Enum(RecordStatus), nullable=False, default=RecordStatus.DRAFT)
    remark = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    batch = relationship("ExhibitionBatch", back_populates="logistics")


class BorrowRecord(Base):
    __tablename__ = "borrow_records"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("exhibition_batches.id"), nullable=False)
    borrow_no = Column(String, unique=True, index=True, nullable=False)
    borrower_name = Column(String, nullable=False)
    borrower_phone = Column(String)
    borrower_department = Column(String)
    material_code = Column(String, index=True, nullable=False)
    material_name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    borrow_date = Column(DateTime, nullable=False)
    expected_return_date = Column(DateTime)
    actual_return_date = Column(DateTime)
    return_quantity = Column(Integer, default=0)
    status = Column(Enum(RecordStatus), nullable=False, default=RecordStatus.DRAFT)
    is_returned = Column(Boolean, default=False)
    remark = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    batch = relationship("ExhibitionBatch", back_populates="borrow_records")


class ScanRecord(Base):
    __tablename__ = "scan_records"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("exhibition_batches.id"), nullable=False)
    scan_no = Column(String, unique=True, index=True)
    material_code = Column(String, index=True, nullable=False)
    material_name = Column(String)
    scan_type = Column(String, nullable=False)
    scan_time = Column(DateTime(timezone=True), nullable=False)
    scanner = Column(String)
    location = Column(String)
    quantity = Column(Integer, default=1)
    status = Column(Enum(RecordStatus), nullable=False, default=RecordStatus.DRAFT)
    remark = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    batch = relationship("ExhibitionBatch", back_populates="scan_records")


class ImportTask(Base):
    __tablename__ = "import_tasks"

    id = Column(Integer, primary_key=True, index=True)
    task_no = Column(String, unique=True, index=True, nullable=False)
    batch_id = Column(Integer, ForeignKey("exhibition_batches.id"))
    import_type = Column(String, nullable=False)
    file_name = Column(String)
    status = Column(Enum(ImportStatus), nullable=False, default=ImportStatus.PENDING)
    total_count = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))


class ImportFailure(Base):
    __tablename__ = "import_failures"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("import_tasks.id"), nullable=False)
    row_number = Column(Integer)
    raw_data = Column(JSON)
    error_message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class OperationLog(Base):
    __tablename__ = "operation_logs"

    id = Column(Integer, primary_key=True, index=True)
    operation_type = Column(String, nullable=False)
    table_name = Column(String)
    record_id = Column(Integer)
    old_value = Column(JSON)
    new_value = Column(JSON)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    ip_address = Column(String)
    user_agent = Column(String)

    creator = relationship("User", foreign_keys=[created_by], back_populates="created_records")


class ReconciliationResult(Base):
    __tablename__ = "reconciliation_results"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("exhibition_batches.id"), nullable=False)
    reconciliation_type = Column(String, nullable=False)
    material_code = Column(String, index=True)
    material_name = Column(String)
    expected_quantity = Column(Integer)
    actual_quantity = Column(Integer)
    difference = Column(Integer)
    is_anomaly = Column(Boolean, default=False)
    anomaly_description = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
