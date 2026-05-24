from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Float, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum

from app.database import Base


class BatchStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    FROZEN = "frozen"
    ARCHIVED = "archived"


class MaterialStatus(str, Enum):
    IN_TRANSIT = "in_transit"
    RECEIVED = "received"
    BORROWED = "borrowed"
    RETURNED = "returned"
    LOST = "lost"
    DAMAGED = "damaged"
    SETTLED = "settled"


class IdempotentAction(str, Enum):
    IGNORE = "ignore"
    OVERWRITE = "overwrite"
    APPEND = "append"


class TaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    WAITING_RETRY = "waiting_retry"
    WAITING_MANUAL = "waiting_manual"
    PERMANENT_FAILED = "permanent_failed"
    COMPLETED = "completed"


class OperationType(str, Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    FREEZE = "freeze"
    UNFREEZE = "unfreeze"
    REVIEW = "review"
    OVERRULE = "overrule"
    ARCHIVE = "archive"
    ATTACH = "attach"


class Batch(Base):
    __tablename__ = "batches"
    
    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String, unique=True, index=True, nullable=False)
    exhibition_name = Column(String, nullable=False)
    status = Column(String, default=BatchStatus.PENDING)
    is_frozen = Column(Boolean, default=False)
    frozen_at = Column(DateTime)
    frozen_by = Column(String)
    frozen_reason = Column(Text)
    unfrozen_at = Column(DateTime)
    unfrozen_by = Column(String)
    unfrozen_reason = Column(Text)
    
    idempotent_action = Column(String, default=IdempotentAction.IGNORE)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    created_by = Column(String)
    updated_by = Column(String)
    
    remark = Column(Text)
    extra_data = Column(JSON)
    
    materials = relationship("MaterialItem", back_populates="batch")
    logistics = relationship("LogisticsReceipt", back_populates="batch")
    borrow_records = relationship("BorrowRecord", back_populates="batch")
    supplement_records = relationship("SupplementRecord", back_populates="batch")
    state_records = relationship("StateRecord", back_populates="batch")
    attachments = relationship("Attachment", back_populates="batch")


class MaterialItem(Base):
    __tablename__ = "material_items"
    
    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"))
    material_code = Column(String, index=True, nullable=False)
    material_name = Column(String, nullable=False)
    category = Column(String)
    quantity = Column(Integer, default=1)
    unit = Column(String)
    warehouse_location = Column(String)
    
    status = Column(String, default=MaterialStatus.IN_TRANSIT)
    current_holder = Column(String)
    current_location = Column(String)
    
    tracking_info = Column(JSON)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    batch = relationship("Batch", back_populates="materials")
    logistics = relationship("LogisticsReceipt", back_populates="material")
    borrow_records = relationship("BorrowRecord", back_populates="material")


class LogisticsReceipt(Base):
    __tablename__ = "logistics_receipts"
    
    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"))
    material_id = Column(Integer, ForeignKey("material_items.id"))
    
    waybill_no = Column(String, index=True)
    sender = Column(String)
    receiver = Column(String)
    send_time = Column(DateTime)
    receive_time = Column(DateTime)
    
    is_received = Column(Boolean, default=False)
    received_quantity = Column(Integer, default=0)
    damaged_quantity = Column(Integer, default=0)
    receiver_signature = Column(String)
    
    receipt_remark = Column(Text)
    images = Column(JSON)
    
    created_at = Column(DateTime, server_default=func.now())
    
    batch = relationship("Batch", back_populates="logistics")
    material = relationship("MaterialItem", back_populates="logistics")


class BorrowRecord(Base):
    __tablename__ = "borrow_records"
    
    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"))
    material_id = Column(Integer, ForeignKey("material_items.id"))
    
    borrower = Column(String, nullable=False)
    borrower_phone = Column(String)
    borrower_department = Column(String)
    borrow_time = Column(DateTime)
    expected_return_time = Column(DateTime)
    actual_return_time = Column(DateTime)
    
    borrow_quantity = Column(Integer, default=1)
    return_quantity = Column(Integer, default=0)
    
    is_returned = Column(Boolean, default=False)
    borrow_remark = Column(Text)
    return_remark = Column(Text)
    
    witness = Column(String)
    approval_by = Column(String)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    batch = relationship("Batch", back_populates="borrow_records")
    material = relationship("MaterialItem", back_populates="borrow_records")
    device_tracking = relationship("DeviceTracking", back_populates="borrow_record", uselist=False)


class SupplementRecord(Base):
    __tablename__ = "supplement_records"
    
    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"))
    
    record_type = Column(String)
    content = Column(Text)
    supplementary_by = Column(String)
    supplementary_time = Column(DateTime)
    
    reason = Column(Text)
    related_material_codes = Column(JSON)
    
    created_at = Column(DateTime, server_default=func.now())
    
    batch = relationship("Batch", back_populates="supplement_records")


class StateRecord(Base):
    __tablename__ = "state_records"
    
    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"))
    material_id = Column(Integer)
    
    from_status = Column(String)
    to_status = Column(String, nullable=False)
    
    changed_at = Column(DateTime, server_default=func.now())
    changed_by = Column(String)
    
    reason = Column(Text)
    change_source = Column(String)
    
    is_freeze_snapshot = Column(Boolean, default=False)
    
    batch = relationship("Batch", back_populates="state_records")


class DeviceTracking(Base):
    __tablename__ = "device_tracking"
    
    id = Column(Integer, primary_key=True, index=True)
    borrow_record_id = Column(Integer, ForeignKey("borrow_records.id"))
    
    device_code = Column(String)
    device_name = Column(String)
    
    last_known_location = Column(String)
    last_seen_time = Column(DateTime)
    last_seen_by = Column(String)
    
    current_status = Column(String)
    responsible_person = Column(String)
    final_disposition = Column(String)
    disposition_time = Column(DateTime)
    disposition_by = Column(String)
    
    tracking_history = Column(JSON)
    remark = Column(Text)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    borrow_record = relationship("BorrowRecord", back_populates="device_tracking")


class Attachment(Base):
    __tablename__ = "attachments"
    
    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"))
    
    file_name = Column(String, nullable=False)
    file_path = Column(String)
    file_type = Column(String)
    file_size = Column(Integer)
    
    uploaded_by = Column(String)
    uploaded_at = Column(DateTime, server_default=func.now())
    
    description = Column(Text)
    
    batch = relationship("Batch", back_populates="attachments")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    batch_id = Column(Integer)
    record_type = Column(String)
    record_id = Column(Integer)
    
    operation_type = Column(String, nullable=False)
    operated_by = Column(String)
    operated_at = Column(DateTime, server_default=func.now())
    
    before_data = Column(JSON)
    after_data = Column(JSON)
    
    change_reason = Column(Text)
    ip_address = Column(String)
    user_agent = Column(String)


class AsyncTask(Base):
    __tablename__ = "async_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String, unique=True, index=True)
    task_name = Column(String, nullable=False)
    
    status = Column(String, default=TaskStatus.PENDING)
    batch_id = Column(Integer)
    
    input_data = Column(JSON)
    result_data = Column(JSON)
    error_message = Column(Text)
    error_traceback = Column(Text)
    
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    next_retry_time = Column(DateTime)
    
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    created_by = Column(String)
    created_at = Column(DateTime, server_default=func.now())
