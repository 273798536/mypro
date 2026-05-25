from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Enum, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from .database import Base


class UserRole(str, enum.Enum):
    EMPLOYEE = "employee"
    MANAGER = "manager"
    FINANCE = "finance"
    AUDITOR = "auditor"
    ADMIN = "admin"


class ReimbursementStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    REJECTED = "rejected"
    SECOND_CONFIRM = "second_confirm"
    AUDIT_ONLY = "audit_only"
    APPROVED = "approved"
    PAID = "paid"


class BatchStrategy(str, enum.Enum):
    IGNORE = "ignore"
    OVERWRITE = "overwrite"
    APPEND = "append"


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    WAIT_RETRY = "wait_retry"
    WAIT_MANUAL = "wait_manual"
    PERMANENT_FAILED = "permanent_failed"
    COMPLETED = "completed"


class EvidenceType(str, enum.Enum):
    INVOICE_PDF = "invoice_pdf"
    TRAVEL_APPLICATION = "travel_application"
    PAYMENT_RECEIPT = "payment_receipt"
    SMS_SCREENSHOT = "sms_screenshot"
    STORE_TRANSFER = "store_transfer"
    OTHER = "other"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    full_name = Column(String)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(Enum(UserRole), default=UserRole.EMPLOYEE)
    department = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    created_batches = relationship("Batch", back_populates="creator", foreign_keys="Batch.creator_id")
    created_reimbursements = relationship("Reimbursement", back_populates="creator", foreign_keys="Reimbursement.creator_id")
    audit_logs = relationship("AuditLog", back_populates="actor", foreign_keys="AuditLog.actor_id")


class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_number = Column(String, unique=True, index=True)
    name = Column(String)
    description = Column(Text)
    strategy = Column(Enum(BatchStrategy), default=BatchStrategy.APPEND)
    creator_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="processing")
    total_items = Column(Integer, default=0)
    processed_items = Column(Integer, default=0)
    failed_items = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))

    creator = relationship("User", back_populates="created_batches")
    reimbursements = relationship("Reimbursement", back_populates="batch")
    evidences = relationship("Evidence", back_populates="batch")
    tasks = relationship("AsyncTask", back_populates="batch")


class Reimbursement(Base):
    __tablename__ = "reimbursements"

    id = Column(Integer, primary_key=True, index=True)
    reimbursement_no = Column(String, unique=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"))
    applicant_id = Column(Integer, ForeignKey("users.id"))
    creator_id = Column(Integer, ForeignKey("users.id"))
    department = Column(String)
    purpose = Column(String)
    total_amount = Column(Float, default=0)
    status = Column(Enum(ReimbursementStatus), default=ReimbursementStatus.DRAFT)
    travel_start_date = Column(DateTime(timezone=True))
    travel_end_date = Column(DateTime(timezone=True))
    travel_destination = Column(String)
    traveler_names = Column(JSON)
    reject_reason = Column(Text)
    second_confirm_note = Column(Text)
    sensitive_fields_masked = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    submitted_at = Column(DateTime(timezone=True))
    approved_at = Column(DateTime(timezone=True))

    idempotency_key = Column(String, unique=True, index=True)

    batch = relationship("Batch", back_populates="reimbursements")
    creator = relationship("User", back_populates="created_reimbursements", foreign_keys=[creator_id])
    invoices = relationship("Invoice", back_populates="reimbursement")
    travel_applications = relationship("TravelApplication", back_populates="reimbursement")
    payment_flows = relationship("PaymentFlow", back_populates="reimbursement")
    evidences = relationship("Evidence", back_populates="reimbursement")
    audit_logs = relationship("AuditLog", back_populates="reimbursement")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    reimbursement_id = Column(Integer, ForeignKey("reimbursements.id"))
    invoice_number = Column(String, index=True)
    invoice_code = Column(String)
    invoice_date = Column(DateTime(timezone=True))
    seller_name = Column(String)
    seller_tax_no = Column(String)
    buyer_name = Column(String)
    buyer_tax_no = Column(String)
    total_amount = Column(Float)
    tax_amount = Column(Float)
    amount_with_tax = Column(Float)
    category = Column(String)
    expense_type = Column(String)
    is_duplicate = Column(Boolean, default=False)
    duplicate_of = Column(Integer, ForeignKey("invoices.id"))
    pdf_hash = Column(String, index=True)
    parsed_data = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    reimbursement = relationship("Reimbursement", back_populates="invoices")


class TravelApplication(Base):
    __tablename__ = "travel_applications"

    id = Column(Integer, primary_key=True, index=True)
    reimbursement_id = Column(Integer, ForeignKey("reimbursements.id"))
    application_no = Column(String, index=True)
    applicant = Column(String)
    department = Column(String)
    purpose = Column(String)
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True))
    destination = Column(String)
    travelers = Column(JSON)
    estimated_amount = Column(Float)
    approved_by = Column(String)
    approved_at = Column(DateTime(timezone=True))
    form_data = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    reimbursement = relationship("Reimbursement", back_populates="travel_applications")


class PaymentFlow(Base):
    __tablename__ = "payment_flows"

    id = Column(Integer, primary_key=True, index=True)
    reimbursement_id = Column(Integer, ForeignKey("reimbursements.id"))
    transaction_no = Column(String, index=True)
    pay_time = Column(DateTime(timezone=True))
    pay_amount = Column(Float)
    payer = Column(String)
    payee = Column(String)
    payment_method = Column(String)
    bank_name = Column(String)
    bank_account = Column(String)
    purpose = Column(String)
    flow_hash = Column(String, index=True)
    is_duplicate = Column(Boolean, default=False)
    raw_data = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    reimbursement = relationship("Reimbursement", back_populates="payment_flows")


class Evidence(Base):
    __tablename__ = "evidences"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"))
    reimbursement_id = Column(Integer, ForeignKey("reimbursements.id"))
    evidence_type = Column(Enum(EvidenceType))
    file_name = Column(String)
    file_path = Column(String)
    file_hash = Column(String, index=True)
    file_size = Column(Integer)
    parsed_content = Column(JSON)
    ocr_text = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    batch = relationship("Batch", back_populates="evidences")
    reimbursement = relationship("Reimbursement", back_populates="evidences")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    reimbursement_id = Column(Integer, ForeignKey("reimbursements.id"))
    actor_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String)
    old_values = Column(JSON)
    new_values = Column(JSON)
    change_reason = Column(Text)
    ip_address = Column(String)
    user_agent = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    reimbursement = relationship("Reimbursement", back_populates="audit_logs")
    actor = relationship("User", back_populates="audit_logs")


class AsyncTask(Base):
    __tablename__ = "async_tasks"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String, unique=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"))
    task_type = Column(String)
    status = Column(Enum(TaskStatus), default=TaskStatus.PENDING)
    payload = Column(JSON)
    result = Column(JSON)
    error_message = Column(Text)
    error_stack = Column(Text)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    next_retry_at = Column(DateTime(timezone=True))
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    batch = relationship("Batch", back_populates="tasks")


class SensitiveFieldConfig(Base):
    __tablename__ = "sensitive_field_configs"

    id = Column(Integer, primary_key=True, index=True)
    field_name = Column(String, unique=True)
    table_name = Column(String)
    mask_pattern = Column(String)
    roles_allowed = Column(JSON)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SensitiveFieldAccessLog(Base):
    __tablename__ = "sensitive_field_access_logs"

    id = Column(Integer, primary_key=True, index=True)
    field_name = Column(String, index=True)
    table_name = Column(String, index=True)
    record_id = Column(Integer)
    user_id = Column(Integer, ForeignKey("users.id"))
    user_role = Column(String)
    access_type = Column(String)
    was_masked = Column(Boolean)
    ip_address = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
