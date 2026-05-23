import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean, Enum
from sqlalchemy.orm import relationship
from pydantic import BaseModel, Field
from typing import Optional, List
from app.database import Base


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    RETRY = "retry"
    MANUAL = "manual"
    PERMANENT_FAIL = "permanent_fail"
    SUCCESS = "success"


class ImportSource(str, enum.Enum):
    API = "api"
    FILE_CSV = "file_csv"
    FILE_EXCEL = "file_excel"
    MANUAL = "manual"


class WarehouseOrder(Base):
    __tablename__ = "warehouse_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_no = Column(String, unique=True, index=True, nullable=False)
    customer_id = Column(String, index=True, nullable=False)
    customer_name = Column(String)
    equipment_type = Column(String)
    equipment_code = Column(String)
    quantity = Column(Integer, default=1)
    deposit_amount = Column(Float, default=0.0)
    daily_rental = Column(Float, default=0.0)
    rental_days = Column(Integer)
    outbound_date = Column(DateTime)
    expected_return_date = Column(DateTime)
    shift_code = Column(String)
    operator = Column(String)
    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    return_records = relationship("ReturnRecord", back_populates="warehouse_order")
    repair_estimates = relationship("RepairEstimate", back_populates="warehouse_order")
    import_record_id = Column(Integer, ForeignKey("import_records.id"))
    import_record = relationship("ImportRecord", back_populates="warehouse_orders")


class ReturnRecord(Base):
    __tablename__ = "return_records"

    id = Column(Integer, primary_key=True, index=True)
    return_no = Column(String, unique=True, index=True, nullable=False)
    warehouse_order_id = Column(Integer, ForeignKey("warehouse_orders.id"))
    warehouse_order = relationship("WarehouseOrder", back_populates="return_records")
    customer_id = Column(String, index=True)
    return_date = Column(DateTime)
    return_quantity = Column(Integer, default=0)
    returned_equipment_codes = Column(Text)
    condition_status = Column(String)
    damage_description = Column(Text)
    shift_code = Column(String)
    operator = Column(String)
    is_partial = Column(Boolean, default=False)
    batch_number = Column(Integer, default=1)
    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    photos = relationship("ReturnPhoto", back_populates="return_record")
    deposit_deductions = relationship("DepositDeduction", back_populates="return_record")
    import_record_id = Column(Integer, ForeignKey("import_records.id"))
    import_record = relationship("ImportRecord", back_populates="return_records")


class ReturnPhoto(Base):
    __tablename__ = "return_photos"

    id = Column(Integer, primary_key=True, index=True)
    photo_no = Column(String, unique=True, index=True, nullable=False)
    return_record_id = Column(Integer, ForeignKey("return_records.id"))
    return_record = relationship("ReturnRecord", back_populates="photos")
    file_path = Column(String, nullable=False)
    file_name = Column(String)
    file_size = Column(Integer)
    photo_type = Column(String)
    upload_time = Column(DateTime, default=datetime.utcnow)
    uploader = Column(String)
    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class RepairEstimate(Base):
    __tablename__ = "repair_estimates"

    id = Column(Integer, primary_key=True, index=True)
    estimate_no = Column(String, unique=True, index=True, nullable=False)
    warehouse_order_id = Column(Integer, ForeignKey("warehouse_orders.id"))
    warehouse_order = relationship("WarehouseOrder", back_populates="repair_estimates")
    return_record_id = Column(Integer, ForeignKey("return_records.id"))
    equipment_code = Column(String)
    damage_type = Column(String)
    damage_description = Column(Text)
    estimate_amount = Column(Float, default=0.0)
    parts_cost = Column(Float, default=0.0)
    labor_cost = Column(Float, default=0.0)
    is_customer_liable = Column(Boolean, default=True)
    reviewer = Column(String)
    review_time = Column(DateTime)
    status = Column(String, default="pending")
    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    import_record_id = Column(Integer, ForeignKey("import_records.id"))
    import_record = relationship("ImportRecord", back_populates="repair_estimates")


class DepositDeduction(Base):
    __tablename__ = "deposit_deductions"

    id = Column(Integer, primary_key=True, index=True)
    deduction_no = Column(String, unique=True, index=True, nullable=False)
    return_record_id = Column(Integer, ForeignKey("return_records.id"))
    return_record = relationship("ReturnRecord", back_populates="deposit_deductions")
    warehouse_order_no = Column(String)
    customer_id = Column(String)
    deduction_type = Column(String)
    deduction_amount = Column(Float, default=0.0)
    deduction_reason = Column(Text)
    evidence_chain = Column(Text)
    calculation_rule = Column(String)
    is_manual_adjusted = Column(Boolean, default=False)
    manual_adjust_reason = Column(Text)
    operator = Column(String)
    status = Column(String, default="confirmed")
    created_at = Column(DateTime, default=datetime.utcnow)


class ImportRecord(Base):
    __tablename__ = "import_records"

    id = Column(Integer, primary_key=True, index=True)
    import_batch_no = Column(String, unique=True, index=True, nullable=False)
    source_type = Column(Enum(ImportSource))
    source_file_name = Column(String)
    source_file_path = Column(String)
    source_file_hash = Column(String)
    row_number = Column(Integer)
    raw_data = Column(Text)
    parsed_data = Column(Text)
    target_table = Column(String)
    is_success = Column(Boolean, default=True)
    error_message = Column(Text)
    operator = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    warehouse_orders = relationship("WarehouseOrder", back_populates="import_record")
    return_records = relationship("ReturnRecord", back_populates="import_record")
    repair_estimates = relationship("RepairEstimate", back_populates="import_record")


class AsyncTask(Base):
    __tablename__ = "async_tasks"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String, unique=True, index=True, nullable=False)
    task_type = Column(String, index=True)
    status = Column(Enum(TaskStatus), default=TaskStatus.PENDING)
    payload = Column(Text)
    result = Column(Text)
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    next_retry_time = Column(DateTime)
    completed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ShiftRecord(Base):
    __tablename__ = "shift_records"

    id = Column(Integer, primary_key=True, index=True)
    shift_code = Column(String, unique=True, index=True, nullable=False)
    shift_date = Column(DateTime)
    shift_type = Column(String)
    operator = Column(String)
    on_duty_time = Column(DateTime)
    off_duty_time = Column(DateTime)
    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class ManualPriceAdjustment(Base):
    __tablename__ = "manual_price_adjustments"

    id = Column(Integer, primary_key=True, index=True)
    adjustment_no = Column(String, unique=True, index=True, nullable=False)
    target_record_type = Column(String)
    target_record_id = Column(Integer)
    original_amount = Column(Float)
    adjusted_amount = Column(Float)
    adjustment_reason = Column(Text)
    operator = Column(String)
    approval_status = Column(String, default="pending")
    approver = Column(String)
    approval_time = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)


class ReplayException(Base):
    __tablename__ = "replay_exceptions"

    id = Column(Integer, primary_key=True, index=True)
    exception_no = Column(String, unique=True, index=True, nullable=False)
    replay_context = Column(Text)
    exception_type = Column(String)
    exception_message = Column(Text)
    stack_trace = Column(Text)
    data_snapshot = Column(Text)
    is_resolved = Column(Boolean, default=False)
    resolution_note = Column(Text)
    resolved_at = Column(DateTime)
    resolver = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
