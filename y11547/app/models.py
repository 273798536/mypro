from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class MaterialSource(str, enum.Enum):
    MATERIAL_LIST = "material_list"
    LOGISTICS = "logistics"
    BORROW = "borrow"
    STORE_TRANSFER = "store_transfer"


class QueueStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    RETRYING = "retrying"
    MANUAL_REVIEW = "manual_review"
    COMPENSATED = "compensated"
    CLOSED = "closed"
    DEAD_LETTER = "dead_letter"


class DirtyType(str, enum.Enum):
    MISSING_FIELD = "missing_field"
    CROSS_DAY = "cross_day"
    NAME_CHANGED = "name_changed"
    AMOUNT_CONFLICT = "amount_conflict"
    QUANTITY_CONFLICT = "quantity_conflict"


class RetryCategory(str, enum.Enum):
    NETWORK_ERROR = "network_error"
    DATA_INCOMPLETE = "data_incomplete"
    SYSTEM_ERROR = "system_error"
    BUSINESS_CONFLICT = "business_conflict"
    NEED_MANUAL = "need_manual"


class Material(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True)
    material_code = Column(String, index=True)
    name = Column(String)
    specification = Column(String)
    unit = Column(String)
    unit_price = Column(Float, default=0)
    category = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    is_active = Column(Boolean, default=True)

    borrow_records = relationship("BorrowRecord", back_populates="material")


class LogisticsReceipt(Base):
    __tablename__ = "logistics_receipts"

    id = Column(Integer, primary_key=True, index=True)
    tracking_number = Column(String, index=True)
    material_name = Column(String)
    material_code = Column(String, nullable=True)
    quantity = Column(Float)
    sender = Column(String)
    receiver = Column(String)
    receive_time = Column(DateTime(timezone=True))
    signatory = Column(String)
    sms_screenshot_url = Column(String, nullable=True)
    source = Column(String, default=MaterialSource.LOGISTICS)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    raw_data = Column(Text)

    receipt_queue = relationship("ReceiptQueue", back_populates="logistics_receipt")


class BorrowRecord(Base):
    __tablename__ = "borrow_records"

    id = Column(Integer, primary_key=True, index=True)
    borrow_no = Column(String, index=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=True)
    material_name = Column(String)
    material_code = Column(String, nullable=True)
    quantity = Column(Float)
    borrower = Column(String)
    borrower_department = Column(String)
    borrow_time = Column(DateTime(timezone=True))
    expected_return_time = Column(DateTime(timezone=True), nullable=True)
    actual_return_time = Column(DateTime(timezone=True), nullable=True)
    return_quantity = Column(Float, default=0)
    status = Column(String, default="borrowed")
    handler = Column(String)
    remark = Column(Text, nullable=True)
    source = Column(String, default=MaterialSource.BORROW)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    raw_data = Column(Text)

    material = relationship("Material", back_populates="borrow_records")
    receipt_queue = relationship("ReceiptQueue", back_populates="borrow_record")


class StoreTransferRecord(Base):
    __tablename__ = "store_transfer_records"

    id = Column(Integer, primary_key=True, index=True)
    transfer_no = Column(String, index=True)
    material_name = Column(String)
    material_code = Column(String, nullable=True)
    quantity = Column(Float)
    from_store = Column(String)
    to_store = Column(String)
    transfer_time = Column(DateTime(timezone=True))
    handler = Column(String)
    receiver = Column(String)
    source = Column(String, default=MaterialSource.STORE_TRANSFER)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    raw_data = Column(Text)

    receipt_queue = relationship("ReceiptQueue", back_populates="store_transfer")


class ReceiptQueue(Base):
    __tablename__ = "receipt_queue"

    id = Column(Integer, primary_key=True, index=True)
    queue_no = Column(String, unique=True, index=True)
    source_type = Column(String)
    source_id = Column(Integer)
    material_name = Column(String)
    material_code = Column(String, nullable=True)
    quantity = Column(Float)
    amount = Column(Float, default=0)

    logistics_receipt_id = Column(Integer, ForeignKey("logistics_receipts.id"), nullable=True)
    borrow_record_id = Column(Integer, ForeignKey("borrow_records.id"), nullable=True)
    store_transfer_id = Column(Integer, ForeignKey("store_transfer_records.id"), nullable=True)

    status = Column(String, default=QueueStatus.PENDING)
    retry_count = Column(Integer, default=0)
    max_retry_count = Column(Integer, default=3)
    last_retry_time = Column(DateTime(timezone=True), nullable=True)
    next_retry_time = Column(DateTime(timezone=True), nullable=True)

    retry_category = Column(String, nullable=True)
    is_dirty = Column(Boolean, default=False)
    dirty_type = Column(String, nullable=True)
    dirty_note = Column(Text, nullable=True)

    handler = Column(String, nullable=True)
    handled_at = Column(DateTime(timezone=True), nullable=True)
    handle_note = Column(Text, nullable=True)

    compensated_amount = Column(Float, default=0)
    compensated_at = Column(DateTime(timezone=True), nullable=True)
    compensated_by = Column(String, nullable=True)

    closed_at = Column(DateTime(timezone=True), nullable=True)
    closed_by = Column(String, nullable=True)
    close_note = Column(Text, nullable=True)

    business_date = Column(DateTime(timezone=True), nullable=True)

    original_data = Column(Text)
    corrected_data = Column(Text, nullable=True)
    correction_note = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    logistics_receipt = relationship("LogisticsReceipt", back_populates="receipt_queue")
    borrow_record = relationship("BorrowRecord", back_populates="receipt_queue")
    store_transfer = relationship("StoreTransferRecord", back_populates="receipt_queue")
    status_history = relationship("StatusHistory", back_populates="receipt_queue", order_by="StatusHistory.created_at")


class StatusHistory(Base):
    __tablename__ = "status_history"

    id = Column(Integer, primary_key=True, index=True)
    receipt_queue_id = Column(Integer, ForeignKey("receipt_queue.id"))
    from_status = Column(String, nullable=True)
    to_status = Column(String)
    changed_by = Column(String)
    change_reason = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    receipt_queue = relationship("ReceiptQueue", back_populates="status_history")


class MaterialList(Base):
    __tablename__ = "material_lists"

    id = Column(Integer, primary_key=True, index=True)
    list_no = Column(String, index=True)
    exhibition_name = Column(String)
    material_name = Column(String)
    material_code = Column(String, nullable=True)
    planned_quantity = Column(Float)
    actual_quantity = Column(Float, nullable=True)
    unit_price = Column(Float, default=0)
    total_amount = Column(Float, default=0)
    list_date = Column(DateTime(timezone=True), nullable=True)
    responsible_person = Column(String)
    source = Column(String, default=MaterialSource.MATERIAL_LIST)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    raw_data = Column(Text)
