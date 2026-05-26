from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Boolean, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class ImportStrategy(str, enum.Enum):
    IGNORE = "ignore"
    OVERWRITE = "overwrite"
    APPEND = "append"


class DataSourceType(str, enum.Enum):
    CONTRACT = "contract"
    INVOICE = "invoice"
    RECEIPT = "receipt"
    COLLECTION = "collection"
    CREDIT = "credit"
    OVERDUE_REPORT = "overdue_report"
    CUSTOMER = "customer"


class AlertType(str, enum.Enum):
    WRONG_RECEIPT_MATCH = "wrong_receipt_match"
    CREDIT_FROZEN = "credit_frozen"
    PROMISE_EXPIRED = "promise_expired"
    OVERDUE_WORSENING = "overdue_worsening"
    MISMATCH_AMOUNT = "mismatch_amount"


class AgingBucket(str, enum.Enum):
    CURRENT = "current"
    DAYS_1_30 = "1-30天"
    DAYS_31_60 = "31-60天"
    DAYS_61_90 = "61-90天"
    DAYS_91_180 = "91-180天"
    DAYS_181_365 = "181-365天"
    OVER_365 = "365天以上"


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    customer_code = Column(String(50), unique=True, index=True, nullable=False)
    customer_name = Column(String(200), nullable=False)
    industry = Column(String(100))
    region = Column(String(100))
    credit_rating = Column(String(20))
    contact_person = Column(String(100))
    contact_phone = Column(String(50))
    address = Column(String(500))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    contracts = relationship("Contract", back_populates="customer")
    invoices = relationship("Invoice", back_populates="customer")
    receipts = relationship("Receipt", back_populates="customer")
    collection_records = relationship("CollectionRecord", back_populates="customer")
    credit_limits = relationship("CreditLimit", back_populates="customer")
    alerts = relationship("Alert", back_populates="customer")


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    contract_no = Column(String(100), unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    contract_amount = Column(Float, nullable=False)
    contract_date = Column(Date, nullable=False)
    start_date = Column(Date)
    end_date = Column(Date)
    payment_terms = Column(String(200))
    credit_days = Column(Integer, default=30)
    status = Column(String(50), default="active")
    remarks = Column(Text)
    source_id = Column(Integer, ForeignKey("data_sources.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    customer = relationship("Customer", back_populates="contracts")
    invoices = relationship("Invoice", back_populates="contract")
    data_source = relationship("DataSource")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_no = Column(String(100), unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    contract_id = Column(Integer, ForeignKey("contracts.id"))
    invoice_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    invoice_amount = Column(Float, nullable=False)
    tax_amount = Column(Float, default=0)
    total_amount = Column(Float, nullable=False)
    currency = Column(String(10), default="CNY")
    status = Column(String(50), default="unpaid")
    paid_amount = Column(Float, default=0)
    remaining_amount = Column(Float, nullable=False)
    aging_bucket = Column(Enum(AgingBucket), default=AgingBucket.CURRENT)
    overdue_days = Column(Integer, default=0)
    promise_date = Column(Date)
    remarks = Column(Text)
    source_id = Column(Integer, ForeignKey("data_sources.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    customer = relationship("Customer", back_populates="invoices")
    contract = relationship("Contract", back_populates="invoices")
    receipt_matches = relationship("ReceiptMatch", back_populates="invoice")
    data_source = relationship("DataSource")


class Receipt(Base):
    __tablename__ = "receipts"

    id = Column(Integer, primary_key=True, index=True)
    receipt_no = Column(String(100), unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    receipt_date = Column(Date, nullable=False)
    receipt_amount = Column(Float, nullable=False)
    currency = Column(String(10), default="CNY")
    payment_method = Column(String(50))
    bank_account = Column(String(100))
    matched_amount = Column(Float, default=0)
    unmatched_amount = Column(Float, nullable=False)
    status = Column(String(50), default="pending")
    remarks = Column(Text)
    source_id = Column(Integer, ForeignKey("data_sources.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    customer = relationship("Customer", back_populates="receipts")
    receipt_matches = relationship("ReceiptMatch", back_populates="receipt")
    data_source = relationship("DataSource")


class ReceiptMatch(Base):
    __tablename__ = "receipt_matches"

    id = Column(Integer, primary_key=True, index=True)
    receipt_id = Column(Integer, ForeignKey("receipts.id"), nullable=False)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    match_amount = Column(Float, nullable=False)
    match_date = Column(Date, nullable=False)
    is_manual = Column(Boolean, default=False)
    is_corrected = Column(Boolean, default=False)
    corrected_from_id = Column(Integer)
    remarks = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    receipt = relationship("Receipt", back_populates="receipt_matches")
    invoice = relationship("Invoice", back_populates="receipt_matches")


class CollectionRecord(Base):
    __tablename__ = "collection_records"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    invoice_id = Column(Integer, ForeignKey("invoices.id"))
    contact_date = Column(Date, nullable=False)
    collector = Column(String(100))
    contact_method = Column(String(50))
    contact_person = Column(String(100))
    promise_date = Column(Date)
    promise_amount = Column(Float)
    next_action_date = Column(Date)
    next_action = Column(String(500))
    status = Column(String(50), default="in_progress")
    notes = Column(Text)
    source_id = Column(Integer, ForeignKey("data_sources.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    customer = relationship("Customer", back_populates="collection_records")
    invoice = relationship("Invoice")
    data_source = relationship("DataSource")


class CreditLimit(Base):
    __tablename__ = "credit_limits"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    credit_limit = Column(Float, nullable=False)
    used_credit = Column(Float, default=0)
    available_credit = Column(Float, nullable=False)
    effective_date = Column(Date, nullable=False)
    expiry_date = Column(Date)
    is_frozen = Column(Boolean, default=False)
    frozen_reason = Column(String(500))
    frozen_date = Column(Date)
    approved_by = Column(String(100))
    remarks = Column(Text)
    source_id = Column(Integer, ForeignKey("data_sources.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    customer = relationship("Customer", back_populates="credit_limits")
    data_source = relationship("DataSource")


class DataSource(Base):
    __tablename__ = "data_sources"

    id = Column(Integer, primary_key=True, index=True)
    source_type = Column(Enum(DataSourceType), nullable=False)
    file_name = Column(String(200))
    import_date = Column(DateTime(timezone=True), server_default=func.now())
    import_strategy = Column(Enum(ImportStrategy), nullable=False)
    record_count = Column(Integer, default=0)
    imported_by = Column(String(100))
    batch_no = Column(String(100), index=True)
    remarks = Column(Text)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    table_name = Column(String(100), nullable=False)
    record_id = Column(Integer, nullable=False)
    action = Column(String(50), nullable=False)
    old_values = Column(Text)
    new_values = Column(Text)
    changed_by = Column(String(100))
    change_reason = Column(String(500))
    source_id = Column(Integer, ForeignKey("data_sources.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    alert_type = Column(Enum(AlertType), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    invoice_id = Column(Integer, ForeignKey("invoices.id"))
    receipt_id = Column(Integer, ForeignKey("receipts.id"))
    message = Column(String(500), nullable=False)
    is_resolved = Column(Boolean, default=False)
    resolved_by = Column(String(100))
    resolved_at = Column(DateTime(timezone=True))
    resolution_notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    customer = relationship("Customer", back_populates="alerts")
    invoice = relationship("Invoice")
    receipt = relationship("Receipt")


class OverdueReport(Base):
    __tablename__ = "overdue_reports"

    id = Column(Integer, primary_key=True, index=True)
    report_date = Column(Date, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    total_overdue = Column(Float, default=0)
    current_amount = Column(Float, default=0)
    bucket_1_30 = Column(Float, default=0)
    bucket_31_60 = Column(Float, default=0)
    bucket_61_90 = Column(Float, default=0)
    bucket_91_180 = Column(Float, default=0)
    bucket_181_365 = Column(Float, default=0)
    bucket_over_365 = Column(Float, default=0)
    source_id = Column(Integer, ForeignKey("data_sources.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    customer = relationship("Customer")
