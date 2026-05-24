from sqlalchemy import Column, String, Integer, DateTime, Float, Text, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from .database import Base


class BatchStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    VERIFIED = "verified"
    RECONCILED = "reconciled"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"
    FROZEN = "frozen"
    EXPORTED = "exported"
    PARTIAL_FAILED = "partial_failed"


class ReplayAction(str, enum.Enum):
    IGNORE = "ignore"
    OVERWRITE = "overwrite"
    APPEND = "append"


class OperationType(str, enum.Enum):
    CREATE = "create"
    SUBMIT = "submit"
    WITHDRAW = "withdraw"
    VERIFY = "verify"
    REJECT = "reject"
    MODIFY = "modify"
    FREEZE = "freeze"
    EXPORT = "export"
    JUDGE = "judge"
    REPLAY = "replay"


class Batch(Base):
    __tablename__ = "batches"

    id = Column(String, primary_key=True)
    batch_no = Column(String, unique=True, nullable=False, index=True)
    clinic_code = Column(String, nullable=False)
    status = Column(Enum(BatchStatus), default=BatchStatus.DRAFT)
    submitter = Column(String)
    submit_time = Column(DateTime)
    verifier = Column(String)
    verify_time = Column(DateTime)
    is_frozen = Column(Boolean, default=False)
    freeze_time = Column(DateTime)
    frozen_by = Column(String)
    export_time = Column(DateTime)
    exported_by = Column(String)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    remark = Column(Text)
    customer_service_note = Column(Text)
    replay_strategy = Column(Enum(ReplayAction), default=ReplayAction.IGNORE)

    implants = relationship("Implant", back_populates="batch", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="batch", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="batch", cascade="all, delete-orphan")
    handover_papers = relationship("HandoverPaper", back_populates="batch", cascade="all, delete-orphan")
    operation_histories = relationship("OperationHistory", back_populates="batch", cascade="all, delete-orphan")


class Implant(Base):
    __tablename__ = "implants"

    id = Column(String, primary_key=True)
    batch_id = Column(String, ForeignKey("batches.id"), nullable=False)
    implant_id = Column(String, nullable=False)
    batch_no = Column(String, nullable=False)
    implant_model = Column(String, nullable=False)
    original_model = Column(String)
    quantity = Column(Integer, default=1)
    unit = Column(String, default="pcs")
    is_model_changed = Column(Boolean, default=False)
    model_change_reason = Column(Text)
    inventory_deducted = Column(Boolean, default=False)
    deduction_time = Column(DateTime)
    deduction_operator = Column(String)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    batch = relationship("Batch", back_populates="implants")


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(String, primary_key=True)
    batch_id = Column(String, ForeignKey("batches.id"), nullable=False)
    appointment_no = Column(String, nullable=False)
    patient_name = Column(String, nullable=False)
    patient_id = Column(String, nullable=False)
    doctor_name = Column(String)
    appointment_date = Column(DateTime, nullable=False)
    surgery_type = Column(String)
    implant_used = Column(String)
    is_complete = Column(Boolean, default=False)
    medical_record_updated = Column(Boolean, default=False)
    record_update_time = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    batch = relationship("Batch", back_populates="appointments")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(String, primary_key=True)
    batch_id = Column(String, ForeignKey("batches.id"), nullable=False)
    invoice_no = Column(String, nullable=False)
    supplier_name = Column(String, nullable=False)
    invoice_date = Column(DateTime, nullable=False)
    total_amount = Column(Float, default=0)
    currency = Column(String, default="CNY")
    is_verified = Column(Boolean, default=False)
    verified_by = Column(String)
    verify_time = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    batch = relationship("Batch", back_populates="invoices")


class HandoverPaper(Base):
    __tablename__ = "handover_papers"

    id = Column(String, primary_key=True)
    batch_id = Column(String, ForeignKey("batches.id"), nullable=False)
    handover_no = Column(String, nullable=False)
    from_department = Column(String, nullable=False)
    to_department = Column(String, nullable=False)
    handover_date = Column(DateTime, nullable=False)
    handover_person = Column(String)
    receiver = Column(String)
    item_list = Column(Text)
    is_signed = Column(Boolean, default=False)
    sign_time = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    batch = relationship("Batch", back_populates="handover_papers")


class OperationHistory(Base):
    __tablename__ = "operation_histories"

    id = Column(String, primary_key=True)
    batch_id = Column(String, ForeignKey("batches.id"), nullable=False)
    operation_type = Column(Enum(OperationType), nullable=False)
    operator = Column(String, nullable=False)
    operation_time = Column(DateTime, server_default=func.now())
    from_status = Column(String)
    to_status = Column(String)
    changed_fields = Column(Text)
    remark = Column(Text)
    ip_address = Column(String)
    user_agent = Column(String)

    batch = relationship("Batch", back_populates="operation_histories")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True)
    table_name = Column(String, nullable=False)
    record_id = Column(String, nullable=False)
    operation = Column(String, nullable=False)
    old_value = Column(Text)
    new_value = Column(Text)
    operator = Column(String)
    operation_time = Column(DateTime, server_default=func.now())
    request_id = Column(String)
