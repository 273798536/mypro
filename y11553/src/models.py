import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
from .database import Base


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    WAITING_RETRY = "waiting_retry"
    WAITING_MANUAL = "waiting_manual"
    PERMANENT_FAILED = "permanent_failed"
    COMPLETED = "completed"


class RecordType(str, enum.Enum):
    INVENTORY = "inventory"
    REPLENISHMENT = "replenishment"
    REFUND = "refund"
    PRICE_ADJUSTMENT = "price_adjustment"


class ProcessingResult(str, enum.Enum):
    NEW = "new"
    DUPLICATE = "duplicate"
    ERROR = "error"


class ImportSource(str, enum.Enum):
    API = "api"
    FILE = "file"
    HISTORY_PACKAGE = "history_package"


class DuplicateType(str, enum.Enum):
    EXACT_MATCH = "exact_match"
    NETWORK_RETRY = "network_retry"
    MANUAL_RESUBMIT = "manual_resubmit"


class ImportTask(Base):
    __tablename__ = "import_tasks"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String(64), unique=True, index=True)
    source_type = Column(Enum(ImportSource), default=ImportSource.API)
    source_file = Column(String(255), nullable=True)
    record_type = Column(Enum(RecordType))
    total_count = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    duplicate_count = Column(Integer, default=0)
    error_count = Column(Integer, default=0)
    status = Column(Enum(TaskStatus), default=TaskStatus.PENDING)
    retry_times = Column(Integer, default=0)
    max_retry_times = Column(Integer, default=3)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    logs = relationship("ProcessingLog", back_populates="task")
    inventories = relationship("InventoryRecord", back_populates="task")
    replenishments = relationship("ReplenishmentPhoto", back_populates="task")
    refunds = relationship("RefundRecord", back_populates="task")
    price_adjustments = relationship("PriceAdjustment", back_populates="task")
    duplicates = relationship("DuplicateRecord", back_populates="task")
    pending_records = relationship("PendingRecord", back_populates="task")


class ProcessingLog(Base):
    __tablename__ = "processing_logs"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("import_tasks.id"))
    record_id = Column(String(128), nullable=True)
    record_type = Column(Enum(RecordType))
    level = Column(String(20), default="info")
    message = Column(Text)
    raw_data = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    task = relationship("ImportTask", back_populates="logs")


class DuplicateRecord(Base):
    __tablename__ = "duplicate_records"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("import_tasks.id"))
    record_type = Column(Enum(RecordType))
    duplicate_type = Column(Enum(DuplicateType))
    source_row_number = Column(Integer, nullable=True)
    original_record_id = Column(String(128))
    duplicate_record_id = Column(String(128))
    fingerprint = Column(String(64), index=True)
    reason = Column(Text)
    raw_data = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    task = relationship("ImportTask", back_populates="duplicates")


class InventoryRecord(Base):
    __tablename__ = "inventory_records"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("import_tasks.id"))
    record_id = Column(String(128), unique=True, index=True)
    source_file = Column(String(255), nullable=True)
    source_row_number = Column(Integer, nullable=True)
    cabinet_id = Column(String(64), index=True)
    cell_id = Column(String(64), index=True)
    sku_id = Column(String(64))
    sku_name = Column(String(255))
    quantity = Column(Integer)
    original_quantity = Column(Integer)
    is_hot_cell = Column(Boolean, default=False)
    processing_reason = Column(Text, nullable=True)
    raw_data = Column(Text)
    fingerprint = Column(String(64), index=True)
    is_duplicate = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    record_time = Column(DateTime)

    task = relationship("ImportTask", back_populates="inventories")


class ReplenishmentPhoto(Base):
    __tablename__ = "replenishment_photos"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("import_tasks.id"))
    record_id = Column(String(128), unique=True, index=True)
    source_file = Column(String(255), nullable=True)
    source_row_number = Column(Integer, nullable=True)
    cabinet_id = Column(String(64), index=True)
    cell_id = Column(String(64))
    photo_url = Column(String(500))
    photo_hash = Column(String(64), index=True)
    replenishment_quantity = Column(Integer)
    operator_id = Column(String(64))
    raw_data = Column(Text)
    fingerprint = Column(String(64), index=True)
    is_duplicate = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    record_time = Column(DateTime)

    task = relationship("ImportTask", back_populates="replenishments")


class RefundRecord(Base):
    __tablename__ = "refund_records"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("import_tasks.id"))
    record_id = Column(String(128), unique=True, index=True)
    source_file = Column(String(255), nullable=True)
    source_row_number = Column(Integer, nullable=True)
    cabinet_id = Column(String(64), index=True)
    order_id = Column(String(128), index=True)
    user_id = Column(String(64))
    sku_id = Column(String(64))
    refund_amount = Column(Float)
    refund_reason = Column(String(500))
    raw_data = Column(Text)
    fingerprint = Column(String(64), index=True)
    is_duplicate = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    record_time = Column(DateTime)

    task = relationship("ImportTask", back_populates="refunds")


class PriceAdjustment(Base):
    __tablename__ = "price_adjustments"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("import_tasks.id"))
    record_id = Column(String(128), unique=True, index=True)
    source_file = Column(String(255), nullable=True)
    source_row_number = Column(Integer, nullable=True)
    cabinet_id = Column(String(64), index=True)
    cell_id = Column(String(64))
    sku_id = Column(String(64))
    original_price = Column(Float)
    new_price = Column(Float)
    operator_id = Column(String(64))
    approval_note = Column(Text, nullable=True)
    raw_data = Column(Text)
    fingerprint = Column(String(64), index=True)
    is_duplicate = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    record_time = Column(DateTime)

    task = relationship("ImportTask", back_populates="price_adjustments")


class ReconciliationResult(Base):
    __tablename__ = "reconciliation_results"

    id = Column(Integer, primary_key=True, index=True)
    reconciliation_id = Column(String(64), unique=True, index=True)
    cabinet_id = Column(String(64), index=True)
    cell_id = Column(String(64))
    sku_id = Column(String(64))
    expected_quantity = Column(Integer)
    actual_quantity = Column(Integer)
    difference = Column(Integer)
    is_consistent = Column(Boolean)
    issue_type = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    report_time = Column(DateTime, default=datetime.utcnow)


class PendingRecordStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    DUPLICATE = "duplicate"
    ERROR = "error"
    WAITING_RETRY = "waiting_retry"
    WAITING_MANUAL = "waiting_manual"
    PERMANENT_FAILED = "permanent_failed"


class PendingRecord(Base):
    __tablename__ = "pending_records"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("import_tasks.id"))
    source_file = Column(String(255), nullable=True)
    source_row_number = Column(Integer)
    record_type = Column(Enum(RecordType))
    raw_data = Column(Text)
    fingerprint = Column(String(64), index=True)
    status = Column(Enum(PendingRecordStatus), default=PendingRecordStatus.PENDING)
    retry_times = Column(Integer, default=0)
    max_retry_times = Column(Integer, default=3)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)

    task = relationship("ImportTask", back_populates="pending_records")
