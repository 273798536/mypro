import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, Text, Enum, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class QueueStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    FAILED = "failed"
    RETRYING = "retrying"
    MANUAL = "manual"
    FROZEN = "frozen"
    DEAD_LETTER = "dead_letter"
    CLOSED = "closed"
    CANCELLED = "cancelled"


class RetryCategory(str, enum.Enum):
    NETWORK_ERROR = "network_error"
    DATA_INCOMPLETE = "data_incomplete"
    VALIDATION_ERROR = "validation_error"
    DEPENDENCY_ERROR = "dependency_error"
    UNKNOWN = "unknown"
    MANUAL_REVIEW = "manual_review"


class DataSource(str, enum.Enum):
    OUTBOUND_ORDER = "outbound_order"
    RETURN_PHOTO = "return_photo"
    MAINTENANCE_ESTIMATE = "maintenance_estimate"
    SCAN_DETAIL = "scan_detail"
    DEPOSIT_DEDUCTION = "deposit_deduction"


class OperationType(str, enum.Enum):
    SUBMIT = "submit"
    UPDATE = "update"
    RETRY = "retry"
    CANCEL = "cancel"
    MANUAL_DECISION = "manual_decision"
    FREEZE = "freeze"
    UNFREEZE = "unfreeze"
    COMPENSATE = "compensate"
    CLOSE = "close"


class ConflictStrategy(str, enum.Enum):
    IGNORE = "ignore"
    OVERWRITE = "overwrite"
    APPEND = "append"


class ReturnCompensationQueue(Base):
    __tablename__ = "return_compensation_queue"

    id = Column(Integer, primary_key=True, index=True)
    idempotency_key = Column(String, unique=True, index=True, nullable=False)
    batch_no = Column(String, index=True, nullable=False)
    
    status = Column(Enum(QueueStatus), default=QueueStatus.PENDING, index=True)
    retry_category = Column(Enum(RetryCategory), nullable=True)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=5)
    next_retry_at = Column(DateTime, nullable=True)
    
    outbound_order_id = Column(String, index=True, nullable=True)
    customer_id = Column(String, index=True, nullable=True)
    customer_name = Column(String, nullable=True)
    
    has_outbound_order = Column(Boolean, default=False)
    has_return_photos = Column(Boolean, default=False)
    has_maintenance_estimate = Column(Boolean, default=False)
    has_scan_details = Column(Boolean, default=False)
    has_deposit_review = Column(Boolean, default=False)
    
    deposit_amount = Column(Float, default=0)
    compensation_amount = Column(Float, default=0)
    actual_deduction = Column(Float, default=0)
    
    is_frozen = Column(Boolean, default=False)
    frozen_at = Column(DateTime, nullable=True)
    frozen_by = Column(String, nullable=True)
    frozen_reason = Column(Text, nullable=True)
    
    is_manual = Column(Boolean, default=False)
    manual_handler = Column(String, nullable=True)
    manual_decision = Column(String, nullable=True)
    manual_note = Column(Text, nullable=True)
    manual_at = Column(DateTime, nullable=True)
    
    compensated_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    closed_by = Column(String, nullable=True)
    
    error_message = Column(Text, nullable=True)
    error_stack = Column(Text, nullable=True)
    
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    outbound_order = relationship("OutboundOrder", back_populates="queue", uselist=False)
    return_photos = relationship("ReturnPhoto", back_populates="queue")
    maintenance_estimate = relationship("MaintenanceEstimate", back_populates="queue", uselist=False)
    scan_details = relationship("ScanDetail", back_populates="queue")
    deposit_reviews = relationship("DepositReview", back_populates="queue")
    operation_histories = relationship("OperationHistory", back_populates="queue")


class OutboundOrder(Base):
    __tablename__ = "outbound_orders"

    id = Column(Integer, primary_key=True, index=True)
    queue_id = Column(Integer, ForeignKey("return_compensation_queue.id"))
    order_no = Column(String, unique=True, index=True, nullable=False)
    
    customer_id = Column(String, index=True)
    customer_name = Column(String)
    rental_start_date = Column(DateTime)
    rental_end_date = Column(DateTime)
    total_amount = Column(Float, default=0)
    deposit_amount = Column(Float, default=0)
    
    items = Column(JSON, default=list)
    
    received_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    queue = relationship("ReturnCompensationQueue", back_populates="outbound_order")


class ReturnPhoto(Base):
    __tablename__ = "return_photos"

    id = Column(Integer, primary_key=True, index=True)
    queue_id = Column(Integer, ForeignKey("return_compensation_queue.id"))
    photo_id = Column(String, unique=True, index=True, nullable=False)
    
    photo_url = Column(String, nullable=False)
    photo_type = Column(String)
    upload_time = Column(DateTime)
    uploader = Column(String)
    description = Column(Text)
    
    photo_metadata = Column(JSON, default=dict)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    queue = relationship("ReturnCompensationQueue", back_populates="return_photos")


class MaintenanceEstimate(Base):
    __tablename__ = "maintenance_estimates"

    id = Column(Integer, primary_key=True, index=True)
    queue_id = Column(Integer, ForeignKey("return_compensation_queue.id"))
    estimate_no = Column(String, unique=True, index=True, nullable=False)
    
    estimated_amount = Column(Float, default=0)
    parts_cost = Column(Float, default=0)
    labor_cost = Column(Float, default=0)
    other_cost = Column(Float, default=0)
    
    damage_description = Column(Text)
    estimator = Column(String)
    estimated_at = Column(DateTime)
    
    items = Column(JSON, default=list)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    queue = relationship("ReturnCompensationQueue", back_populates="maintenance_estimate")


class ScanDetail(Base):
    __tablename__ = "scan_details"

    id = Column(Integer, primary_key=True, index=True)
    queue_id = Column(Integer, ForeignKey("return_compensation_queue.id"))
    scan_batch_no = Column(String, index=True, nullable=False)
    
    item_code = Column(String, index=True)
    item_name = Column(String)
    scan_time = Column(DateTime)
    scanner = Column(String)
    scan_location = Column(String)
    
    condition = Column(String)
    quantity = Column(Integer, default=1)
    is_damaged = Column(Boolean, default=False)
    damage_note = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    queue = relationship("ReturnCompensationQueue", back_populates="scan_details")


class DepositReview(Base):
    __tablename__ = "deposit_reviews"

    id = Column(Integer, primary_key=True, index=True)
    queue_id = Column(Integer, ForeignKey("return_compensation_queue.id"))
    review_no = Column(String, unique=True, index=True, nullable=False)
    
    batch_return_no = Column(String, index=True)
    deduction_amount = Column(Float, default=0)
    deduction_reason = Column(Text)
    
    reviewer = Column(String)
    reviewed_at = Column(DateTime)
    review_status = Column(String)
    evidence_chain_complete = Column(Boolean, default=False)
    
    review_note = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    queue = relationship("ReturnCompensationQueue", back_populates="deposit_reviews")


class OperationHistory(Base):
    __tablename__ = "operation_histories"

    id = Column(Integer, primary_key=True, index=True)
    queue_id = Column(Integer, ForeignKey("return_compensation_queue.id"))
    operation_type = Column(Enum(OperationType), nullable=False)
    
    operator = Column(String, nullable=False)
    operated_at = Column(DateTime, default=datetime.utcnow)
    
    old_status = Column(Enum(QueueStatus), nullable=True)
    new_status = Column(Enum(QueueStatus), nullable=True)
    
    change_summary = Column(JSON, default=dict)
    detail = Column(Text)
    ip_address = Column(String)
    user_agent = Column(String)
    
    queue = relationship("ReturnCompensationQueue", back_populates="operation_histories")
