from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Boolean, Float, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from .database import Base


class ContractStatus(str, enum.Enum):
    DRAFT = "草稿"
    SUBMITTED = "已提交"
    REJECTED = "已驳回"
    CONFIRMED = "二次确认"
    FROZEN = "已冻结"
    ARCHIVED = "已归档"


class ChangeType(str, enum.Enum):
    NODE_CHANGE = "付款节点变更"
    AMOUNT_CHANGE = "金额变更"
    DATE_CHANGE = "日期变更"
    PARTY_CHANGE = "合同方变更"
    SUPPLEMENTAL = "补充协议"
    MANUAL_REVISION = "人工改判"
    WITHDRAW = "撤回"
    RESUBMIT = "重新提交"


class RoleType(str, enum.Enum):
    CONTRACT_MANAGER = "合同管理员"
    FINANCE = "财务人员"
    LEGAL = "法务人员"
    AUDITOR = "审计人员"
    BUSINESS_HEAD = "业务负责人"
    ADMIN = "系统管理员"


class SourceFileType(str, enum.Enum):
    PDF_CONTRACT = "合同PDF"
    PAYMENT_RECORD = "付款记录"
    ACCEPTANCE_EMAIL = "验收邮件"
    ZIP_ARCHIVE = "历史压缩包"
    MANUAL_ENTRY = "人工补录"


class ImportStatus(str, enum.Enum):
    PENDING = "待处理"
    SUCCESS = "成功"
    PARTIAL = "部分成功"
    FAILED = "失败"


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    contract_no = Column(String(100), unique=True, index=True)
    contract_name = Column(String(200), nullable=False)
    party_a = Column(String(200))
    party_b = Column(String(200))
    total_amount = Column(Float)
    sign_date = Column(DateTime)
    effective_date = Column(DateTime)
    expiry_date = Column(DateTime)
    status = Column(Enum(ContractStatus), default=ContractStatus.DRAFT)
    current_version = Column(Integer, default=1)
    is_frozen = Column(Boolean, default=False)
    frozen_at = Column(DateTime)
    frozen_by = Column(String(100))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    created_by = Column(String(100))
    updated_by = Column(String(100))
    remarks = Column(Text)
    extra_data = Column(JSON)

    payment_nodes = relationship("PaymentNode", back_populates="contract", cascade="all, delete-orphan")
    acceptance_emails = relationship("AcceptanceEmail", back_populates="contract", cascade="all, delete-orphan")
    supplemental_agreements = relationship("SupplementalAgreement", back_populates="contract", cascade="all, delete-orphan")
    change_records = relationship("ChangeRecord", back_populates="contract", cascade="all, delete-orphan")
    import_sources = relationship("ImportSource", back_populates="contract", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="contract", cascade="all, delete-orphan")


class PaymentNode(Base):
    __tablename__ = "payment_nodes"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"))
    node_name = Column(String(200), nullable=False)
    node_no = Column(String(50))
    planned_amount = Column(Float)
    actual_amount = Column(Float)
    planned_date = Column(DateTime)
    actual_date = Column(DateTime)
    milestone = Column(String(200))
    is_completed = Column(Boolean, default=False)
    is_disputed = Column(Boolean, default=False)
    dispute_reason = Column(Text)
    version = Column(Integer, default=1)
    is_latest = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    source_file_id = Column(Integer, ForeignKey("import_sources.id"))
    original_line_no = Column(Integer)
    original_value = Column(JSON)
    remarks = Column(Text)

    contract = relationship("Contract", back_populates="payment_nodes")
    change_records = relationship("ChangeRecord", back_populates="payment_node")
    import_source = relationship("ImportSource")


class AcceptanceEmail(Base):
    __tablename__ = "acceptance_emails"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"))
    email_subject = Column(String(300))
    sender = Column(String(200))
    receiver = Column(String(500))
    send_date = Column(DateTime)
    email_content = Column(Text)
    acceptance_result = Column(String(100))
    acceptance_date = Column(DateTime)
    is_verified = Column(Boolean, default=False)
    verified_by = Column(String(100))
    verified_at = Column(DateTime)
    version = Column(Integer, default=1)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    source_file_id = Column(Integer, ForeignKey("import_sources.id"))
    original_line_no = Column(Integer)
    original_value = Column(JSON)
    remarks = Column(Text)
    attachments = Column(JSON)

    contract = relationship("Contract", back_populates="acceptance_emails")
    import_source = relationship("ImportSource")


class SupplementalAgreement(Base):
    __tablename__ = "supplemental_agreements"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"))
    agreement_no = Column(String(100))
    agreement_name = Column(String(200))
    sign_date = Column(DateTime)
    effective_date = Column(DateTime)
    change_summary = Column(Text)
    original_content = Column(Text)
    new_content = Column(Text)
    is_applied = Column(Boolean, default=False)
    applied_at = Column(DateTime)
    applied_by = Column(String(100))
    version = Column(Integer, default=1)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    source_file_id = Column(Integer, ForeignKey("import_sources.id"))
    original_line_no = Column(Integer)
    original_value = Column(JSON)
    remarks = Column(Text)

    contract = relationship("Contract", back_populates="supplemental_agreements")
    import_source = relationship("ImportSource")


class ImportSource(Base):
    __tablename__ = "import_sources"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"))
    file_name = Column(String(300))
    file_type = Column(Enum(SourceFileType))
    file_path = Column(String(500))
    file_hash = Column(String(64))
    file_size = Column(Integer)
    upload_time = Column(DateTime, server_default=func.now())
    upload_by = Column(String(100))
    import_status = Column(Enum(ImportStatus), default=ImportStatus.PENDING)
    import_error = Column(Text)
    parsed_count = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    parse_result = Column(JSON)
    remarks = Column(Text)

    contract = relationship("Contract", back_populates="import_sources")


class ChangeRecord(Base):
    __tablename__ = "change_records"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"))
    payment_node_id = Column(Integer, ForeignKey("payment_nodes.id"))
    change_type = Column(Enum(ChangeType))
    change_reason = Column(Text)
    field_name = Column(String(100))
    old_value = Column(JSON)
    new_value = Column(JSON)
    changed_by = Column(String(100))
    changed_by_role = Column(Enum(RoleType))
    changed_at = Column(DateTime, server_default=func.now())
    is_manual_revision = Column(Boolean, default=False)
    revision_remark = Column(Text)
    version_before = Column(Integer)
    version_after = Column(Integer)
    source_evidence = Column(JSON)
    audit_status = Column(String(50), default="待审核")
    audit_by = Column(String(100))
    audit_at = Column(DateTime)
    audit_remark = Column(Text)

    contract = relationship("Contract", back_populates="change_records")
    payment_node = relationship("PaymentNode", back_populates="change_records")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"))
    action = Column(String(200))
    action_detail = Column(Text)
    operator = Column(String(100))
    operator_role = Column(Enum(RoleType))
    operate_time = Column(DateTime, server_default=func.now())
    ip_address = Column(String(50))
    user_agent = Column(String(500))
    before_data = Column(JSON)
    after_data = Column(JSON)
    is_readonly_access = Column(Boolean, default=False)

    contract = relationship("Contract", back_populates="audit_logs")


class ManualJudgment(Base):
    __tablename__ = "manual_judgments"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer)
    target_type = Column(String(50))
    target_id = Column(Integer)
    judgment_type = Column(String(100))
    judgment_reason = Column(Text)
    judgment_result = Column(JSON)
    judged_by = Column(String(100))
    judged_by_role = Column(Enum(RoleType))
    judged_at = Column(DateTime, server_default=func.now())
    is_effective = Column(Boolean, default=True)
    original_evidence = Column(JSON)
    remarks = Column(Text)
    created_at = Column(DateTime, server_default=func.now())


class ExportRecord(Base):
    __tablename__ = "export_records"

    id = Column(Integer, primary_key=True, index=True)
    export_type = Column(String(100))
    export_scope = Column(JSON)
    is_sensitive_masked = Column(Boolean, default=True)
    export_by = Column(String(100))
    export_by_role = Column(Enum(RoleType))
    export_at = Column(DateTime, server_default=func.now())
    file_path = Column(String(500))
    file_name = Column(String(300))
    file_hash = Column(String(64))
    record_count = Column(Integer)
    export_remark = Column(Text)
    related_contract_ids = Column(JSON)


class DeadLetterStatus(str, enum.Enum):
    PENDING = "待重试"
    RETRYING = "重试中"
    RESOLVED = "已解决"
    FAILED = "最终失败"


class DeadLetter(Base):
    __tablename__ = "dead_letters"

    id = Column(Integer, primary_key=True, index=True)
    import_source_id = Column(Integer, ForeignKey("import_sources.id"))
    source_type = Column(String(50))
    source_data = Column(JSON)
    original_line_no = Column(Integer)
    error_message = Column(Text)
    error_type = Column(String(200))
    stack_trace = Column(Text)
    status = Column(Enum(DeadLetterStatus), default=DeadLetterStatus.PENDING)
    retry_count = Column(Integer, default=0)
    max_retry = Column(Integer, default=3)
    last_retry_at = Column(DateTime)
    next_retry_at = Column(DateTime)
    resolved_at = Column(DateTime)
    resolved_by = Column(String(100))
    resolution_note = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    extra_metadata = Column(JSON)
