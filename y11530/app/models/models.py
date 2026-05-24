from sqlalchemy import Column, Integer, String, DateTime, Text, Float, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models.enums import ExceptionStatus, ExceptionType, DataSource, RecordStatus, ActionType


class TellerSchedule(Base):
    __tablename__ = "teller_schedules"

    id = Column(Integer, primary_key=True, index=True)
    idempotency_key = Column(String, unique=True, index=True)
    branch_id = Column(String, index=True)
    branch_name = Column(String)
    teller_id = Column(String, index=True)
    teller_name = Column(String)
    schedule_date = Column(DateTime, index=True)
    shift_type = Column(String)
    window_number = Column(String)
    is_training = Column(Boolean, default=False)
    training_type = Column(String, nullable=True)
    lunch_start = Column(DateTime, nullable=True)
    lunch_end = Column(DateTime, nullable=True)
    source_data = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class LeaveForm(Base):
    __tablename__ = "leave_forms"

    id = Column(Integer, primary_key=True, index=True)
    idempotency_key = Column(String, unique=True, index=True)
    branch_id = Column(String, index=True)
    teller_id = Column(String, index=True)
    teller_name = Column(String)
    leave_type = Column(String)
    start_date = Column(DateTime, index=True)
    end_date = Column(DateTime, index=True)
    leave_days = Column(Float)
    status = Column(String)
    approver = Column(String, nullable=True)
    source_data = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class BusinessForecast(Base):
    __tablename__ = "business_forecasts"

    id = Column(Integer, primary_key=True, index=True)
    idempotency_key = Column(String, unique=True, index=True)
    branch_id = Column(String, index=True)
    forecast_date = Column(DateTime, index=True)
    forecast_window = Column(String)
    expected_customers = Column(Integer)
    expected_transactions = Column(Integer)
    service_level = Column(String)
    source_data = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class RefundFlow(Base):
    __tablename__ = "refund_flows"

    id = Column(Integer, primary_key=True, index=True)
    idempotency_key = Column(String, unique=True, index=True)
    branch_id = Column(String, index=True)
    transaction_id = Column(String, index=True)
    refund_amount = Column(Float)
    refund_date = Column(DateTime, index=True)
    teller_id = Column(String, index=True)
    refund_reason = Column(String)
    source_data = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class InventoryDifference(Base):
    __tablename__ = "inventory_differences"

    id = Column(Integer, primary_key=True, index=True)
    idempotency_key = Column(String, unique=True, index=True)
    branch_id = Column(String, index=True)
    inventory_date = Column(DateTime, index=True)
    item_type = Column(String)
    expected_quantity = Column(Integer)
    actual_quantity = Column(Integer)
    difference = Column(Integer)
    difference_reason = Column(String, nullable=True)
    source_data = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class ExceptionBatch(Base):
    __tablename__ = "exception_batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String, unique=True, index=True)
    branch_id = Column(String, index=True)
    branch_name = Column(String)
    batch_date = Column(DateTime, index=True)
    status = Column(String, default=ExceptionStatus.DRAFT)
    total_records = Column(Integer, default=0)
    unprocessed_records = Column(Integer, default=0)
    corrected_records = Column(Integer, default=0)
    need_manual_confirm_records = Column(Integer, default=0)
    failed_records = Column(Integer, default=0)
    created_by = Column(String)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    frozen_at = Column(DateTime, nullable=True)
    frozen_by = Column(String, nullable=True)
    frozen_reason = Column(Text, nullable=True)
    settled_at = Column(DateTime, nullable=True)
    archived_at = Column(DateTime, nullable=True)

    records = relationship("ExceptionRecord", back_populates="batch")
    status_histories = relationship("StatusHistory", back_populates="batch")
    attachments = relationship("Attachment", back_populates="batch")


class ExceptionRecord(Base):
    __tablename__ = "exception_records"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("exception_batches.id"), index=True)
    record_key = Column(String, unique=True, index=True)
    branch_id = Column(String, index=True)
    exception_type = Column(String)
    status = Column(String, default=RecordStatus.UNPROCESSED)
    exception_date = Column(DateTime, index=True)
    teller_id = Column(String, nullable=True)
    teller_name = Column(String, nullable=True)
    description = Column(Text)
    blocking_point = Column(Text, nullable=True)
    before_status = Column(String, nullable=True)
    after_status = Column(String, nullable=True)
    manual_reason = Column(Text, nullable=True)
    reviewer = Column(String, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    source_type = Column(String)
    source_ids = Column(JSON)
    raw_data = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    batch = relationship("ExceptionBatch", back_populates="records")
    data_sources = relationship("RecordDataSource", back_populates="record")


class RecordDataSource(Base):
    __tablename__ = "record_data_sources"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("exception_records.id"), index=True)
    source_type = Column(String)
    source_id = Column(String)
    source_table = Column(String)

    record = relationship("ExceptionRecord", back_populates="data_sources")


class StatusHistory(Base):
    __tablename__ = "status_histories"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("exception_batches.id"), index=True)
    record_id = Column(Integer, ForeignKey("exception_records.id"), nullable=True, index=True)
    action_type = Column(String)
    from_status = Column(String, nullable=True)
    to_status = Column(String)
    operator = Column(String)
    reason = Column(Text, nullable=True)
    change_details = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    batch = relationship("ExceptionBatch", back_populates="status_histories")


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("exception_batches.id"), index=True)
    file_name = Column(String)
    file_path = Column(String)
    file_type = Column(String)
    file_size = Column(Integer)
    uploaded_by = Column(String)
    uploaded_at = Column(DateTime, server_default=func.now())
    description = Column(Text, nullable=True)

    batch = relationship("ExceptionBatch", back_populates="attachments")


class FailedRecord(Base):
    __tablename__ = "failed_records"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, index=True)
    record_key = Column(String, index=True)
    source_type = Column(String)
    raw_data = Column(JSON)
    error_message = Column(Text)
    error_type = Column(String)
    created_at = Column(DateTime, server_default=func.now())


class OperationLog(Base):
    __tablename__ = "operation_logs"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, nullable=True, index=True)
    record_id = Column(Integer, nullable=True, index=True)
    operator = Column(String)
    action = Column(String)
    details = Column(JSON, nullable=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
