from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Text, Boolean,
    ForeignKey, Enum, JSON
)
from sqlalchemy.orm import relationship
from .base import BaseModel
from .enums import (
    RecordStatus, RecordType, NodeType, TaxNoticeType, ChangeReason, ActionType
)


class ImportSource(BaseModel):
    __tablename__ = "import_sources"

    filename = Column(String(255), nullable=False)
    file_hash = Column(String(64), nullable=False)
    uploaded_by = Column(String(100), nullable=False)
    total_rows = Column(Integer, default=0)
    success_rows = Column(Integer, default=0)
    failed_rows = Column(Integer, default=0)
    raw_content = Column(Text, nullable=True)


class LedgerRecord(BaseModel):
    __tablename__ = "ledger_records"

    record_no = Column(String(50), unique=True, index=True, nullable=False)
    version = Column(Integer, default=1)
    record_type = Column(Enum(RecordType), nullable=False)
    status = Column(Enum(RecordStatus), default=RecordStatus.DRAFT)
    is_frozen = Column(Boolean, default=False)

    tracking_no = Column(String(100), index=True)
    package_no = Column(String(100), index=True)
    customs_no = Column(String(100), index=True)

    declaration = relationship("DeclarationForm", back_populates="ledger_record", uselist=False)
    trace_node = relationship("TraceNode", back_populates="ledger_record", uselist=False)
    tax_notice = relationship("TaxNotice", back_populates="ledger_record", uselist=False)
    supplementary = relationship("SupplementaryRecord", back_populates="ledger_record", uselist=False)
    shift = relationship("ShiftRecord", back_populates="ledger_record", uselist=False)

    import_source_id = Column(Integer, ForeignKey("import_sources.id"), nullable=True)
    import_row_number = Column(Integer, nullable=True)
    import_raw_data = Column(JSON, nullable=True)

    current_handler = Column(String(100))
    final_handler = Column(String(100))

    change_reason = Column(Enum(ChangeReason), nullable=True)
    change_reason_note = Column(Text, nullable=True)

    parent_record_id = Column(Integer, ForeignKey("ledger_records.id"), nullable=True)

    audit_logs = relationship("AuditLog", back_populates="ledger_record", order_by="AuditLog.created_at.desc()")


class DeclarationForm(BaseModel):
    __tablename__ = "declaration_forms"

    ledger_record_id = Column(Integer, ForeignKey("ledger_records.id"), nullable=False)
    ledger_record = relationship("LedgerRecord", back_populates="declaration")

    declaration_no = Column(String(100), unique=True, index=True)
    declaration_date = Column(DateTime(timezone=True))
    declarant = Column(String(100))
    exporter = Column(String(255))
    importer = Column(String(255))

    hs_code = Column(String(50))
    goods_description = Column(Text)
    quantity = Column(Float)
    unit = Column(String(50))
    declared_value = Column(Float)
    currency = Column(String(10), default="CNY")
    weight = Column(Float)

    origin_country = Column(String(100))
    destination_country = Column(String(100))

    tax_amount = Column(Float, default=0)
    duty_amount = Column(Float, default=0)
    vat_amount = Column(Float, default=0)

    is_exception = Column(Boolean, default=False)
    exception_note = Column(Text, nullable=True)
    exception_owner = Column(String(100), nullable=True)


class TraceNode(BaseModel):
    __tablename__ = "trace_nodes"

    ledger_record_id = Column(Integer, ForeignKey("ledger_records.id"), nullable=False)
    ledger_record = relationship("LedgerRecord", back_populates="trace_node")

    node_type = Column(Enum(NodeType), nullable=False)
    node_time = Column(DateTime(timezone=True), nullable=False)
    node_location = Column(String(255))
    operator = Column(String(100))
    node_note = Column(Text)

    previous_node_id = Column(Integer, ForeignKey("trace_nodes.id"), nullable=True)
    next_node_id = Column(Integer, ForeignKey("trace_nodes.id"), nullable=True)


class TaxNotice(BaseModel):
    __tablename__ = "tax_notices"

    ledger_record_id = Column(Integer, ForeignKey("ledger_records.id"), nullable=False)
    ledger_record = relationship("LedgerRecord", back_populates="tax_notice")

    notice_no = Column(String(100), unique=True, index=True)
    notice_type = Column(Enum(TaxNoticeType), default=TaxNoticeType.INITIAL)
    notice_date = Column(DateTime(timezone=True))
    due_date = Column(DateTime(timezone=True))

    original_tax = Column(Float, default=0)
    supplementary_tax = Column(Float, default=0)
    late_fee = Column(Float, default=0)
    total_tax = Column(Float, default=0)

    is_paid = Column(Boolean, default=False)
    paid_date = Column(DateTime(timezone=True), nullable=True)

    payer = Column(String(100))


class SupplementaryRecord(BaseModel):
    __tablename__ = "supplementary_records"

    ledger_record_id = Column(Integer, ForeignKey("ledger_records.id"), nullable=False)
    ledger_record = relationship("LedgerRecord", back_populates="supplementary")

    supplementary_no = Column(String(100), unique=True, index=True)
    supplementary_date = Column(DateTime(timezone=True))
    supplementary_by = Column(String(100))

    supplementary_type = Column(String(100))
    supplementary_note = Column(Text)

    original_field = Column(String(100))
    original_value = Column(Text)
    corrected_value = Column(Text)


class ShiftRecord(BaseModel):
    __tablename__ = "shift_records"

    ledger_record_id = Column(Integer, ForeignKey("ledger_records.id"), nullable=False)
    ledger_record = relationship("LedgerRecord", back_populates="shift")

    shift_no = Column(String(100), unique=True, index=True)
    shift_date = Column(DateTime(timezone=True))
    shift_type = Column(String(50))

    operator = Column(String(100))
    previous_operator = Column(String(100))

    handover_note = Column(Text)
    handover_items = Column(JSON, nullable=True)
