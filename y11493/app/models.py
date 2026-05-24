from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Boolean, LargeBinary
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import enum


class DocumentType(str, enum.Enum):
    QUALIFICATION = "qualification"
    QUOTATION = "quotation"
    STAMPED = "stamped"
    HISTORY_ARCHIVE = "history_archive"
    SUPPLEMENT = "supplement"


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    WAITING_RETRY = "waiting_retry"
    WAITING_MANUAL = "waiting_manual"
    PERMANENT_FAILED = "permanent_failed"
    COMPLETED = "completed"


class OperationType(str, enum.Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    IMPORT = "import"
    EXPORT = "export"
    REPLACE = "replace"
    RECONCILE = "reconcile"
    REPLAY = "replay"


class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    document_no = Column(String(100), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    document_type = Column(String(50), nullable=False, index=True)
    status = Column(String(50), default="draft")
    current_version = Column(Integer, default=1)
    
    created_by = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    latest_note = Column(Text)
    
    versions = relationship("DocumentVersion", back_populates="document", cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="document", cascade="all, delete-orphan")
    import_records = relationship("ImportRecord", back_populates="document")


class DocumentVersion(Base):
    __tablename__ = "document_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    version = Column(Integer, nullable=False)
    version_name = Column(String(255))
    
    content_snapshot = Column(JSON)
    diff_from_previous = Column(JSON)
    
    created_by = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    change_reason = Column(Text)
    
    document = relationship("Document", back_populates="versions")
    attachments = relationship("Attachment", back_populates="version")


class Attachment(Base):
    __tablename__ = "attachments"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    version_id = Column(Integer, ForeignKey("document_versions.id"))
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_hash = Column(String(64), index=True)
    file_size = Column(Integer)
    file_type = Column(String(100))
    
    page_count = Column(Integer)
    description = Column(Text)
    
    uploaded_by = Column(String(100))
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)
    
    document = relationship("Document", back_populates="attachments")
    version = relationship("DocumentVersion", back_populates="attachments")


class ImportRecord(Base):
    __tablename__ = "import_records"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    batch_no = Column(String(100), index=True, nullable=False)
    
    source_file = Column(String(255), nullable=False)
    source_file_hash = Column(String(64), index=True)
    source_row_number = Column(Integer)
    
    original_value = Column(Text)
    original_data = Column(JSON)
    
    standard_value = Column(Text)
    parsed_data = Column(JSON)
    
    status = Column(String(50), default="imported")
    is_duplicate = Column(Boolean, default=False)
    override_note = Column(Text)
    override_by = Column(String(100))
    
    imported_by = Column(String(100))
    imported_at = Column(DateTime(timezone=True), server_default=func.now())
    
    document = relationship("Document", back_populates="import_records")


class AsyncTask(Base):
    __tablename__ = "async_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String(100), unique=True, index=True, nullable=False)
    task_type = Column(String(50), nullable=False, index=True)
    
    status = Column(String(50), default=TaskStatus.PENDING, index=True)
    retry_count = Column(Integer, default=0)
    max_retry = Column(Integer, default=3)
    
    input_data = Column(JSON)
    result_data = Column(JSON)
    
    error_message = Column(Text)
    error_traceback = Column(Text)
    manual_note = Column(Text)
    handled_by = Column(String(100))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    next_retry_at = Column(DateTime(timezone=True))
    
    related_document_id = Column(Integer, index=True)
    related_batch_no = Column(String(100), index=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    operation_type = Column(String(50), nullable=False, index=True)
    
    entity_type = Column(String(50))
    entity_id = Column(Integer)
    entity_no = Column(String(100))
    
    before_state = Column(JSON)
    after_state = Column(JSON)
    changes = Column(JSON)
    
    operator = Column(String(100))
    operated_at = Column(DateTime(timezone=True), server_default=func.now())
    ip_address = Column(String(50))
    user_agent = Column(String(500))
    
    note = Column(Text)


class ReconciliationRecord(Base):
    __tablename__ = "reconciliation_records"
    
    id = Column(Integer, primary_key=True, index=True)
    reconcile_no = Column(String(100), unique=True, index=True, nullable=False)
    
    left_document_id = Column(Integer)
    right_document_id = Column(Integer)
    left_version = Column(Integer)
    right_version = Column(Integer)
    
    diff_result = Column(JSON)
    is_consistent = Column(Boolean, default=False)
    
    reconciled_by = Column(String(100))
    reconciled_at = Column(DateTime(timezone=True), server_default=func.now())
    note = Column(Text)


class ExportRecord(Base):
    __tablename__ = "export_records"
    
    id = Column(Integer, primary_key=True, index=True)
    export_no = Column(String(100), unique=True, index=True, nullable=False)
    
    export_type = Column(String(50))
    file_path = Column(String(500))
    file_name = Column(String(255))
    file_hash = Column(String(64))
    
    filter_params = Column(JSON)
    record_count = Column(Integer)
    
    exported_by = Column(String(100))
    exported_at = Column(DateTime(timezone=True), server_default=func.now())
