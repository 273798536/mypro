import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.database import Base


class SourceType(str, enum.Enum):
    MAINTENANCE_ORDER = "maintenance_order"
    SPARE_PART_SCAN = "spare_part_scan"
    CUSTOMER_RECEIPT = "customer_receipt"
    SUPPLIER_STATEMENT = "supplier_statement"
    APPROVAL_EMAIL = "approval_email"


class QueueStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    RETRYING = "retrying"
    WAITING_MANUAL = "waiting_manual"
    DEAD_LETTER = "dead_letter"
    COMPENSATED = "compensated"
    CLOSED = "closed"


class TaskStatus(str, enum.Enum):
    WAITING_RETRY = "waiting_retry"
    WAITING_MANUAL = "waiting_manual"
    PERMANENT_FAILED = "permanent_failed"
    COMPLETED = "completed"


class SourceEvidence(Base):
    __tablename__ = "source_evidences"

    id = Column(Integer, primary_key=True, index=True)
    source_file = Column(String, index=True, comment="来源文件名")
    source_line = Column(Integer, comment="原始行号")
    source_type = Column(String, index=True, comment="来源类型")
    raw_data = Column(Text, comment="原始数据JSON")
    parsed_value = Column(Text, comment="解析后标准值JSON")
    created_at = Column(DateTime, default=datetime.utcnow)


class MaintenanceOrder(Base):
    __tablename__ = "maintenance_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_no = Column(String, unique=True, index=True)
    customer_name = Column(String)
    product_model = Column(String)
    fault_description = Column(Text)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    source_evidence_id = Column(Integer, ForeignKey("source_evidences.id"))
    source_evidence = relationship("SourceEvidence")


class SparePartScan(Base):
    __tablename__ = "spare_part_scans"

    id = Column(Integer, primary_key=True, index=True)
    scan_no = Column(String, unique=True, index=True)
    part_code = Column(String, index=True)
    part_name = Column(String)
    quantity = Column(Integer)
    scan_time = Column(DateTime)
    operator = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    source_evidence_id = Column(Integer, ForeignKey("source_evidences.id"))
    source_evidence = relationship("SourceEvidence")


class CustomerReceipt(Base):
    __tablename__ = "customer_receipts"

    id = Column(Integer, primary_key=True, index=True)
    receipt_no = Column(String, unique=True, index=True)
    order_no = Column(String, index=True)
    customer_name = Column(String)
    receipt_time = Column(DateTime)
    image_url = Column(String)
    signed_by = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    source_evidence_id = Column(Integer, ForeignKey("source_evidences.id"))
    source_evidence = relationship("SourceEvidence")


class CompensationQueue(Base):
    __tablename__ = "compensation_queues"

    id = Column(Integer, primary_key=True, index=True)
    idempotent_key = Column(String, unique=True, index=True, comment="幂等键")
    order_no = Column(String, index=True)
    part_code = Column(String, index=True)
    quantity = Column(Integer)
    status = Column(String, default=QueueStatus.PENDING, index=True)
    retry_count = Column(Integer, default=0)
    max_retry = Column(Integer, default=3)
    last_error = Column(Text)
    next_retry_at = Column(DateTime)
    processed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    manual_handler = Column(String, comment="人工处理人")
    manual_note = Column(Text, comment="人工处理备注")


class CompensationRecord(Base):
    __tablename__ = "compensation_records"

    id = Column(Integer, primary_key=True, index=True)
    queue_id = Column(Integer, ForeignKey("compensation_queues.id"))
    queue = relationship("CompensationQueue")
    order_no = Column(String)
    part_code = Column(String)
    quantity = Column(Integer)
    amount = Column(Float, default=0)
    compensated_at = Column(DateTime, default=datetime.utcnow)
    operator = Column(String)
    remark = Column(Text)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    queue_id = Column(Integer, index=True)
    action = Column(String)
    old_status = Column(String)
    new_status = Column(String)
    operator = Column(String)
    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class SupplierStatement(Base):
    __tablename__ = "supplier_statements"

    id = Column(Integer, primary_key=True, index=True)
    statement_no = Column(String, unique=True, index=True)
    supplier_name = Column(String)
    order_no = Column(String, index=True)
    part_code = Column(String, index=True)
    quantity = Column(Integer)
    unit_price = Column(Float, default=0)
    total_amount = Column(Float, default=0)
    statement_date = Column(DateTime)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    source_evidence_id = Column(Integer, ForeignKey("source_evidences.id"))
    source_evidence = relationship("SourceEvidence")


class ApprovalEmail(Base):
    __tablename__ = "approval_emails"

    id = Column(Integer, primary_key=True, index=True)
    email_id = Column(String, unique=True, index=True)
    subject = Column(String)
    sender = Column(String)
    recipient = Column(String)
    order_no = Column(String, index=True)
    approval_status = Column(String, default="pending")
    approval_note = Column(Text)
    approver = Column(String)
    sent_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    source_evidence_id = Column(Integer, ForeignKey("source_evidences.id"))
    source_evidence = relationship("SourceEvidence")


class AsyncTask(Base):
    __tablename__ = "async_tasks"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String, unique=True, index=True)
    task_type = Column(String, index=True)
    status = Column(String, default=TaskStatus.WAITING_RETRY, index=True)
    payload = Column(Text)
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    max_retry = Column(Integer, default=3)
    last_run_at = Column(DateTime)
    next_run_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
