from datetime import datetime
from decimal import Decimal
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Date, Numeric, Boolean, ForeignKey, Index
)
from sqlalchemy.orm import relationship

from app.db.session import Base


class ImportBatch(Base):
    __tablename__ = "import_batches"

    id = Column(Integer, primary_key=True, autoincrement=True)
    batch_no = Column(String(32), unique=True, nullable=False)
    source_type = Column(String(32), nullable=False)
    source_file = Column(String(255))
    record_count = Column(Integer, default=0)
    operator = Column(String(64))
    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.now)

    readings = relationship("EnergyReading", back_populates="batch")
    credits = relationship("CreditTransaction", back_populates="batch")
    invoices = relationship("Invoice", back_populates="batch")
    receipts = relationship("Receipt", back_populates="batch")


class Enterprise(Base):
    __tablename__ = "enterprises"

    id = Column(Integer, primary_key=True, autoincrement=True)
    enterprise_code = Column(String(32), unique=True, nullable=False)
    name = Column(String(128), nullable=False)
    credit_code = Column(String(32))
    account_id = Column(String(64))
    initial_balance = Column(Numeric(18, 4), default=0)
    current_balance = Column(Numeric(18, 4), default=0)
    status = Column(String(16), default="active")
    created_at = Column(DateTime, default=datetime.now)

    readings = relationship("EnergyReading", back_populates="enterprise")
    credits = relationship("CreditTransaction", back_populates="enterprise")
    invoices = relationship("Invoice", back_populates="enterprise")
    receipts = relationship("Receipt", back_populates="enterprise")
    clearing_tables = relationship("ClearingTable", back_populates="enterprise")
    corrections = relationship("CorrectionLog", back_populates="enterprise")
    reconciliation_items = relationship("ReconciliationItem", back_populates="enterprise")


class EnergyReading(Base):
    __tablename__ = "energy_readings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    enterprise_id = Column(Integer, ForeignKey("enterprises.id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("import_batches.id"), nullable=False)
    reading_date = Column(Date, nullable=False)
    energy_type = Column(String(32), nullable=False)
    value = Column(Numeric(18, 4), nullable=False)
    unit = Column(String(16), default="kWh")
    source = Column(String(64))
    is_cross_month = Column(Boolean, default=False)
    cross_month_from = Column(Date)
    cross_month_to = Column(Date)
    cross_month_note = Column(Text)
    is_adjusted = Column(Boolean, default=False)
    original_reading_id = Column(Integer)
    created_at = Column(DateTime, default=datetime.now)

    enterprise = relationship("Enterprise", back_populates="readings")
    batch = relationship("ImportBatch", back_populates="readings")

    __table_args__ = (
        Index("ix_reading_enterprise_date", "enterprise_id", "reading_date"),
    )


class CreditTransaction(Base):
    __tablename__ = "credit_transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    enterprise_id = Column(Integer, ForeignKey("enterprises.id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("import_batches.id"), nullable=False)
    transaction_no = Column(String(64), nullable=False)
    credit_type = Column(String(32))
    amount = Column(Numeric(18, 4), nullable=False)
    direction = Column(String(8), nullable=False)
    transaction_date = Column(Date, nullable=False)
    source = Column(String(64))
    is_duplicate = Column(Boolean, default=False)
    duplicate_of = Column(Integer)
    duplicate_note = Column(Text)
    is_adjusted = Column(Boolean, default=False)
    original_transaction_id = Column(Integer)
    created_at = Column(DateTime, default=datetime.now)

    enterprise = relationship("Enterprise", back_populates="credits")
    batch = relationship("ImportBatch", back_populates="credits")

    __table_args__ = (
        Index("ix_credit_enterprise_date", "enterprise_id", "transaction_date"),
        Index("ix_credit_transaction_no", "transaction_no"),
    )


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, autoincrement=True)
    enterprise_id = Column(Integer, ForeignKey("enterprises.id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("import_batches.id"), nullable=False)
    invoice_no = Column(String(64), nullable=False)
    amount = Column(Numeric(18, 4), nullable=False)
    issue_date = Column(Date, nullable=False)
    is_red_flush = Column(Boolean, default=False)
    original_invoice_no = Column(String(64))
    original_invoice_id = Column(Integer)
    red_flush_applied = Column(Boolean, default=False)
    red_flush_note = Column(Text)
    tax_amount = Column(Numeric(18, 4), default=0)
    source = Column(String(64))
    created_at = Column(DateTime, default=datetime.now)

    enterprise = relationship("Enterprise", back_populates="invoices")
    batch = relationship("ImportBatch", back_populates="invoices")

    __table_args__ = (
        Index("ix_invoice_enterprise_date", "enterprise_id", "issue_date"),
        Index("ix_invoice_no", "invoice_no"),
    )


class Receipt(Base):
    __tablename__ = "receipts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    enterprise_id = Column(Integer, ForeignKey("enterprises.id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("import_batches.id"), nullable=False)
    receipt_no = Column(String(64), nullable=False)
    amount = Column(Numeric(18, 4), nullable=False)
    receipt_date = Column(Date, nullable=False)
    source = Column(String(64))
    is_verified = Column(Boolean, default=False)
    verified_by = Column(String(64))
    verified_at = Column(DateTime)
    verification_note = Column(Text)
    matched_credit_id = Column(Integer)
    created_at = Column(DateTime, default=datetime.now)

    enterprise = relationship("Enterprise", back_populates="receipts")
    batch = relationship("ImportBatch", back_populates="receipts")

    __table_args__ = (
        Index("ix_receipt_enterprise_date", "enterprise_id", "receipt_date"),
        Index("ix_receipt_no", "receipt_no"),
    )


class ClearingTable(Base):
    __tablename__ = "clearing_tables"

    id = Column(Integer, primary_key=True, autoincrement=True)
    enterprise_id = Column(Integer, ForeignKey("enterprises.id"), nullable=False)
    period = Column(String(7), nullable=False)
    opening_balance = Column(Numeric(18, 4), default=0)
    total_in = Column(Numeric(18, 4), default=0)
    total_out = Column(Numeric(18, 4), default=0)
    red_flush_adjustment = Column(Numeric(18, 4), default=0)
    closing_balance = Column(Numeric(18, 4), default=0)
    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.now)

    enterprise = relationship("Enterprise", back_populates="clearing_tables")

    __table_args__ = (
        Index("ix_clearing_enterprise_period", "enterprise_id", "period", unique=True),
    )


class CorrectionLog(Base):
    __tablename__ = "correction_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    enterprise_id = Column(Integer, ForeignKey("enterprises.id"), nullable=False)
    target_table = Column(String(32), nullable=False)
    target_id = Column(Integer, nullable=False)
    field_name = Column(String(64), nullable=False)
    old_value = Column(Text)
    new_value = Column(Text)
    reason = Column(Text)
    operator = Column(String(64))
    created_at = Column(DateTime, default=datetime.now)

    enterprise = relationship("Enterprise", back_populates="corrections")


class Anomaly(Base):
    __tablename__ = "anomalies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    reconciliation_id = Column(Integer, ForeignKey("reconciliations.id"), nullable=False)
    enterprise_id = Column(Integer, ForeignKey("enterprises.id"), nullable=False)
    anomaly_type = Column(String(32), nullable=False)
    severity = Column(String(16), nullable=False)
    description = Column(Text, nullable=False)
    target_table = Column(String(32))
    target_id = Column(Integer)
    status = Column(String(16), default="open")
    resolution_note = Column(Text)
    resolved_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.now)

    reconciliation = relationship("Reconciliation", back_populates="anomalies")


class Reconciliation(Base):
    __tablename__ = "reconciliations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    period = Column(String(7), nullable=False)
    status = Column(String(16), default="pending")
    total_enterprises = Column(Integer, default=0)
    anomalies_found = Column(Integer, default=0)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    operator = Column(String(64))
    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.now)

    items = relationship("ReconciliationItem", back_populates="reconciliation", cascade="all, delete-orphan")
    anomalies = relationship("Anomaly", back_populates="reconciliation", cascade="all, delete-orphan")


class ReconciliationItem(Base):
    __tablename__ = "reconciliation_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    reconciliation_id = Column(Integer, ForeignKey("reconciliations.id"), nullable=False)
    enterprise_id = Column(Integer, ForeignKey("enterprises.id"), nullable=False)
    opening_balance = Column(Numeric(18, 4), default=0)
    period_in = Column(Numeric(18, 4), default=0)
    period_out = Column(Numeric(18, 4), default=0)
    red_flush_adjustment = Column(Numeric(18, 4), default=0)
    calculated_closing = Column(Numeric(18, 4), default=0)
    reported_closing = Column(Numeric(18, 4), default=0)
    balance_diff = Column(Numeric(18, 4), default=0)
    cross_month_readings = Column(Integer, default=0)
    duplicate_credits = Column(Integer, default=0)
    red_flush_unapplied = Column(Integer, default=0)
    receipts_unverified = Column(Integer, default=0)
    has_anomaly = Column(Boolean, default=False)
    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.now)

    reconciliation = relationship("Reconciliation", back_populates="items")
    enterprise = relationship("Enterprise", back_populates="reconciliation_items")

    __table_args__ = (
        Index("ix_item_reconciliation_enterprise", "reconciliation_id", "enterprise_id", unique=True),
    )