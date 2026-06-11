from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from .database import Base


class EmailStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    SUSPENDED = "suspended"
    ERROR = "error"


class RecordStatus(str, enum.Enum):
    NORMAL = "normal"
    SUPPLEMENTARY = "supplementary"
    ABNORMAL = "abnormal"
    SUSPENDED = "suspended"
    DUPLICATE = "duplicate"


class ImportAction(str, enum.Enum):
    CREATED = "created"
    UPDATED = "updated"
    SKIPPED = "skipped"
    SUSPENDED = "suspended"
    ERROR = "error"


class ApprovalEmail(Base):
    __tablename__ = "approval_emails"

    id = Column(Integer, primary_key=True, index=True)
    email_message_id = Column(String(255), unique=True, index=True, nullable=False)
    subject = Column(String(500), nullable=False)
    sender = Column(String(255), nullable=False)
    recipient = Column(String(255), nullable=False)
    sent_at = Column(DateTime, nullable=False)
    received_at = Column(DateTime, default=datetime.utcnow)
    raw_content = Column(Text, nullable=False)
    status = Column(Enum(EmailStatus), default=EmailStatus.PENDING)
    error_message = Column(Text, nullable=True)
    is_attachment_late = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    cashflow_records = relationship("CashflowRecord", back_populates="approval_email", cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="approval_email", cascade="all, delete-orphan")
    import_logs = relationship("ImportLog", back_populates="approval_email")


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True, index=True)
    approval_email_id = Column(Integer, ForeignKey("approval_emails.id"), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_content_hash = Column(String(64), nullable=True)
    is_arrived = Column(Boolean, default=False)
    arrived_at = Column(DateTime, nullable=True)
    raw_content = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    approval_email = relationship("ApprovalEmail", back_populates="attachments")


class CashflowRecord(Base):
    __tablename__ = "cashflow_records"

    id = Column(Integer, primary_key=True, index=True)
    approval_email_id = Column(Integer, ForeignKey("approval_emails.id"), nullable=False)
    original_row_number = Column(Integer, nullable=True)
    raw_mixed_tax_rate_column = Column(String(500), nullable=True)
    tax_amount = Column(Float, nullable=True)
    exchange_rate = Column(Float, nullable=True)
    transaction_date = Column(DateTime, nullable=True)
    amount = Column(Float, nullable=True)
    currency = Column(String(10), nullable=True)
    counterparty = Column(String(255), nullable=True)
    voucher_number = Column(String(100), nullable=True)
    unique_key = Column(String(255), unique=True, index=True, nullable=True)
    status = Column(Enum(RecordStatus), default=RecordStatus.NORMAL)
    abnormal_reason = Column(Text, nullable=True)
    raw_data = Column(Text, nullable=True)
    is_manual_remark_updated = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    approval_email = relationship("ApprovalEmail", back_populates="cashflow_records")
    manual_remarks = relationship("ManualRemark", back_populates="cashflow_record", cascade="all, delete-orphan", order_by="ManualRemark.created_at.desc()")
    import_logs = relationship("ImportLog", back_populates="cashflow_record")


class ManualRemark(Base):
    __tablename__ = "manual_remarks"

    id = Column(Integer, primary_key=True, index=True)
    cashflow_record_id = Column(Integer, ForeignKey("cashflow_records.id"), nullable=False)
    remark_content = Column(Text, nullable=False)
    operator = Column(String(100), nullable=False)
    is_export_synced = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    cashflow_record = relationship("CashflowRecord", back_populates="manual_remarks")


class ImportLog(Base):
    __tablename__ = "import_logs"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String(50), nullable=False, index=True)
    approval_email_id = Column(Integer, ForeignKey("approval_emails.id"), nullable=True)
    cashflow_record_id = Column(Integer, ForeignKey("cashflow_records.id"), nullable=True)
    original_row_number = Column(Integer, nullable=True)
    action = Column(Enum(ImportAction), nullable=False)
    detail = Column(Text, nullable=True)
    imported_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    approval_email = relationship("ApprovalEmail", back_populates="import_logs")
    cashflow_record = relationship("CashflowRecord", back_populates="import_logs")
