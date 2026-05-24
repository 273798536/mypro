from sqlalchemy import Column, Integer, String, DateTime, Text, Enum, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base

class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    FAILED = "failed"
    RETRYING = "retrying"
    DEAD_LETTER = "dead_letter"
    MANUAL = "manual"
    CANCELLED = "cancelled"
    FROZEN = "frozen"
    CLOSED = "closed"

class ConflictStrategy(str, enum.Enum):
    IGNORE = "ignore"
    OVERWRITE = "overwrite"
    APPEND = "append"

class AttachmentType(str, enum.Enum):
    QUALIFICATION = "qualification"
    QUOTATION = "quotation"
    SEALED_SCAN = "sealed_scan"
    CONFIRMATION = "confirmation"

class TenderTask(Base):
    __tablename__ = "tender_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(String(64), index=True, nullable=False)
    tender_no = Column(String(64), index=True, nullable=False)
    project_name = Column(String(256), nullable=False)
    
    qualification_file = Column(JSON)
    quotation_version = Column(JSON)
    sealed_scan_file = Column(JSON)
    confirmation_file = Column(JSON)
    
    status = Column(Enum(TaskStatus), default=TaskStatus.PENDING, index=True)
    retry_count = Column(Integer, default=0)
    max_retry_times = Column(Integer, default=3)
    
    submitter = Column(String(64), nullable=False)
    submit_time = Column(DateTime(timezone=True), server_default=func.now())
    last_process_time = Column(DateTime(timezone=True))
    next_retry_time = Column(DateTime(timezone=True))
    
    error_message = Column(Text)
    error_stack = Column(Text)
    
    is_frozen = Column(Boolean, default=False)
    frozen_by = Column(String(64))
    frozen_time = Column(DateTime(timezone=True))
    frozen_reason = Column(String(512))
    
    closed_by = Column(String(64))
    closed_time = Column(DateTime(timezone=True))
    close_reason = Column(String(512))
    
    manual_handler = Column(String(64))
    manual_handle_time = Column(DateTime(timezone=True))
    manual_remark = Column(Text)
    
    conflict_strategy = Column(Enum(ConflictStrategy), default=ConflictStrategy.APPEND)
    parent_task_id = Column(Integer, ForeignKey("tender_tasks.id"))
    
    histories = relationship("TaskHistory", back_populates="task", cascade="all, delete-orphan")
    parent_task = relationship("TenderTask", remote_side=[id])

class TaskHistory(Base):
    __tablename__ = "task_histories"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tender_tasks.id"), nullable=False)
    batch_id = Column(String(64), index=True)
    
    operation_type = Column(String(32), nullable=False)
    operation_detail = Column(JSON)
    operator = Column(String(64), nullable=False)
    operate_time = Column(DateTime(timezone=True), server_default=func.now())
    
    before_status = Column(Enum(TaskStatus))
    after_status = Column(Enum(TaskStatus))
    
    changed_fields = Column(JSON)
    remark = Column(Text)
    
    task = relationship("TenderTask", back_populates="histories")

class DeadLetterTask(Base):
    __tablename__ = "dead_letter_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tender_tasks.id"), unique=True, nullable=False)
    batch_id = Column(String(64), index=True)
    
    fail_count = Column(Integer, default=0)
    last_error = Column(Text)
    first_fail_time = Column(DateTime(timezone=True))
    last_fail_time = Column(DateTime(timezone=True))
    
    retry_classification = Column(String(64))
    is_recoverable = Column(Boolean, default=True)
    recover_remark = Column(Text)
    
    handled = Column(Boolean, default=False)
    handled_by = Column(String(64))
    handled_time = Column(DateTime(timezone=True))
    handle_result = Column(String(32))
