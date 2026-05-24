import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, JSON, Boolean, TypeDecorator
from sqlalchemy.orm import relationship
from app.database import Base


class DataSourceType(str, enum.Enum):
    CHECK_IN = "check_in"
    DEPOSIT = "deposit"
    ROOM_CHANGE = "room_change"
    INVENTORY_DIFF = "inventory_diff"
    REFUND = "refund"


class CompensationStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    WAITING_RETRY = "waiting_retry"
    WAITING_MANUAL = "waiting_manual"
    MANUAL_TAKEOVER = "manual_takeover"
    COMPENSATED = "compensated"
    PERMANENT_FAILED = "permanent_failed"
    CLOSED = "closed"


class FailureType(str, enum.Enum):
    RETRYABLE = "retryable"
    NEED_MANUAL = "need_manual"
    PERMANENT = "permanent"


class OperationType(str, enum.Enum):
    SUBMIT = "submit"
    RETRY = "retry"
    MANUAL_TAKEOVER = "manual_takeover"
    COMPENSATE = "compensate"
    CLOSE = "close"
    JUDGE_CHANGE = "judge_change"
    IMPORT = "import"


class EnumString(TypeDecorator):
    impl = String(50)
    cache_ok = True

    def __init__(self, enum_class, *args, **kwargs):
        self.enum_class = enum_class
        super().__init__(*args, **kwargs)

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, enum.Enum):
            return value.value
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return self.enum_class(value)


class ImportRecord(Base):
    __tablename__ = "import_records"

    id = Column(Integer, primary_key=True, index=True)
    source_file = Column(String(255), nullable=False, index=True)
    source_type = Column(EnumString(DataSourceType, length=50), nullable=False, index=True)
    original_row_number = Column(Integer, nullable=False)
    original_data = Column(JSON, nullable=False)
    parsed_data = Column(JSON, nullable=False)
    import_batch_no = Column(String(64), index=True)
    imported_at = Column(DateTime, default=datetime.utcnow)
    imported_by = Column(String(64), default="system")
    is_used = Column(Boolean, default=False)
    remark = Column(Text, nullable=True)

    compensation_items = relationship("CompensationQueue", back_populates="import_record")


class CompensationQueue(Base):
    __tablename__ = "compensation_queue"

    id = Column(Integer, primary_key=True, index=True)
    compensation_no = Column(String(64), unique=True, index=True, nullable=False)
    import_record_id = Column(Integer, ForeignKey("import_records.id"), nullable=True)
    source_type = Column(EnumString(DataSourceType, length=50), nullable=False, index=True)
    check_in_no = Column(String(64), index=True)
    room_no = Column(String(32), index=True)
    guest_name = Column(String(128))
    amount = Column(Float, nullable=False)
    deposit_amount = Column(Float, default=0)
    invoice_amount = Column(Float, default=0)
    status = Column(EnumString(CompensationStatus, length=50), default=CompensationStatus.PENDING, index=True)
    retry_count = Column(Integer, default=0)
    max_retry_times = Column(Integer, default=3)
    last_failure_type = Column(EnumString(FailureType, length=50), nullable=True)
    last_error_message = Column(Text, nullable=True)
    last_processed_at = Column(DateTime, nullable=True)
    next_retry_at = Column(DateTime, nullable=True)
    judged_by = Column(String(64), nullable=True)
    judged_at = Column(DateTime, nullable=True)
    judgment_remark = Column(Text, nullable=True)
    compensated_at = Column(DateTime, nullable=True)
    compensated_by = Column(String(64), nullable=True)
    compensation_remark = Column(Text, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    closed_by = Column(String(64), nullable=True)
    close_remark = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    celery_task_id = Column(String(64), nullable=True)
    extra_data = Column(JSON, default=dict)

    import_record = relationship("ImportRecord", back_populates="compensation_items")
    state_transitions = relationship("StateTransition", back_populates="compensation")
    operation_logs = relationship("OperationLog", back_populates="compensation")


class StateTransition(Base):
    __tablename__ = "state_transitions"

    id = Column(Integer, primary_key=True, index=True)
    compensation_id = Column(Integer, ForeignKey("compensation_queue.id"), nullable=False)
    from_status = Column(EnumString(CompensationStatus, length=50), nullable=True)
    to_status = Column(EnumString(CompensationStatus, length=50), nullable=False)
    transition_reason = Column(String(255), nullable=False)
    operated_by = Column(String(64), default="system")
    created_at = Column(DateTime, default=datetime.utcnow)
    extra_info = Column(JSON, default=dict)

    compensation = relationship("CompensationQueue", back_populates="state_transitions")


class OperationLog(Base):
    __tablename__ = "operation_logs"

    id = Column(Integer, primary_key=True, index=True)
    compensation_id = Column(Integer, ForeignKey("compensation_queue.id"), nullable=True)
    operation_type = Column(EnumString(OperationType, length=50), nullable=False, index=True)
    operator = Column(String(64), default="system")
    operation_detail = Column(JSON, default=dict)
    original_data_snapshot = Column(JSON, nullable=True)
    new_data_snapshot = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    ip_address = Column(String(64), nullable=True)
    user_agent = Column(String(255), nullable=True)

    compensation = relationship("CompensationQueue", back_populates="operation_logs")
