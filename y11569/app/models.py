from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum, Boolean, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class WorkOrderStatus(PyEnum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    REJECTED = "rejected"
    RECONFIRMED = "reconfirmed"
    AUDIT_ONLY = "audit_only"
    FROZEN = "frozen"
    EXPORTED = "exported"
    WITHDRAWN = "withdrawn"


class SourceType(PyEnum):
    INSPECTION_PHOTO = "inspection_photo"
    HOTLINE = "hotline"
    SPARE_PART = "spare_part"
    MANUAL_PRICE = "manual_price"
    HISTORY_ARCHIVE = "history_archive"


class Role(PyEnum):
    OPERATOR = "operator"
    SUPERVISOR = "supervisor"
    AUDITOR = "auditor"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    real_name = Column(String(100), nullable=False)
    role = Column(Enum(Role), nullable=False)
    hashed_password = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    status_transitions = relationship("StatusTransition", back_populates="operator", foreign_keys="StatusTransition.operator_id")
    created_work_orders = relationship("WorkOrder", back_populates="creator", foreign_keys="WorkOrder.creator_id")


class ImportRecord(Base):
    __tablename__ = "import_records"
    
    id = Column(Integer, primary_key=True, index=True)
    source_file = Column(String(500), nullable=False)
    source_type = Column(Enum(SourceType), nullable=False)
    file_hash = Column(String(64), index=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    total_rows = Column(Integer, default=0)
    success_rows = Column(Integer, default=0)
    failed_rows = Column(Integer, default=0)
    error_details = Column(JSON)
    
    raw_records = relationship("RawRecord", back_populates="import_record")


class RawRecord(Base):
    __tablename__ = "raw_records"
    
    id = Column(Integer, primary_key=True, index=True)
    import_record_id = Column(Integer, ForeignKey("import_records.id"))
    original_line_number = Column(Integer, nullable=False)
    original_data = Column(JSON, nullable=False)
    parsed_data = Column(JSON)
    parse_error = Column(Text)
    is_parsed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    import_record = relationship("ImportRecord", back_populates="raw_records")
    work_order = relationship("WorkOrder", back_populates="raw_record", uselist=False)


class WorkOrder(Base):
    __tablename__ = "work_orders"
    
    id = Column(Integer, primary_key=True, index=True)
    work_order_no = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    location = Column(String(500))
    status = Column(Enum(WorkOrderStatus), default=WorkOrderStatus.DRAFT, nullable=False)
    raw_record_id = Column(Integer, ForeignKey("raw_records.id"))
    creator_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    spare_part_batch = Column(String(100))
    hotline_number = Column(String(50))
    inspection_photo_ref = Column(String(500))
    manual_price_adjustment = Column(JSON)
    
    is_frozen = Column(Boolean, default=False)
    frozen_at = Column(DateTime)
    frozen_by = Column(Integer, ForeignKey("users.id"))
    
    raw_record = relationship("RawRecord", back_populates="work_order")
    creator = relationship("User", back_populates="created_work_orders", foreign_keys=[creator_id])
    status_transitions = relationship("StatusTransition", back_populates="work_order", order_by="StatusTransition.occurred_at")
    evidences = relationship("Evidence", back_populates="work_order")
    judgments = relationship("Judgment", back_populates="work_order", order_by="Judgment.made_at")


class StatusTransition(Base):
    __tablename__ = "status_transitions"
    
    id = Column(Integer, primary_key=True, index=True)
    work_order_id = Column(Integer, ForeignKey("work_orders.id"), nullable=False)
    from_status = Column(Enum(WorkOrderStatus))
    to_status = Column(Enum(WorkOrderStatus), nullable=False)
    operator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    occurred_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    reason = Column(Text, nullable=False)
    
    work_order = relationship("WorkOrder", back_populates="status_transitions")
    operator = relationship("User", back_populates="status_transitions", foreign_keys=[operator_id])


class Evidence(Base):
    __tablename__ = "evidences"
    
    id = Column(Integer, primary_key=True, index=True)
    work_order_id = Column(Integer, ForeignKey("work_orders.id"), nullable=False)
    evidence_type = Column(String(50), nullable=False)
    reference = Column(String(500), nullable=False)
    description = Column(Text)
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    is_original = Column(Boolean, default=True)
    
    work_order = relationship("WorkOrder", back_populates="evidences")


class Judgment(Base):
    __tablename__ = "judgments"
    
    id = Column(Integer, primary_key=True, index=True)
    work_order_id = Column(Integer, ForeignKey("work_orders.id"), nullable=False)
    judge_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    made_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    judgment_type = Column(String(50), nullable=False)
    reason = Column(Text, nullable=False)
    previous_data = Column(JSON)
    new_data = Column(JSON)
    
    work_order = relationship("WorkOrder", back_populates="judgments")


class ExportLog(Base):
    __tablename__ = "export_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    export_type = Column(String(50), nullable=False)
    exported_by = Column(Integer, ForeignKey("users.id"))
    exported_at = Column(DateTime, default=datetime.utcnow)
    work_order_ids = Column(JSON)
    is_sensitive_masked = Column(Boolean, default=True)
    file_path = Column(String(500))
    parameters = Column(JSON)
