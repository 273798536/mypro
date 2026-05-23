from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class AuditAction(str, enum.Enum):
    CREATE = "create"
    UPDATE = "update"
    SUBMIT = "submit"
    REJECT = "reject"
    REVIEW = "review"
    SECOND_CONFIRM = "second_confirm"
    MARK_AUDIT_READY = "mark_audit_ready"
    CORRECT = "correct"
    HANDLE_DIRTY = "handle_dirty"
    HANDLE_DUPLICATE = "handle_duplicate"
    EXPORT = "export"


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True, index=True)
    ledger_id = Column(Integer, ForeignKey("equipment_ledger.id"))
    file_name = Column(String(200))
    file_path = Column(String(500))
    file_type = Column(String(50))
    file_size = Column(Integer)
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    ledger = relationship("EquipmentLedger", back_populates="attachments")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    ledger_id = Column(Integer, ForeignKey("equipment_ledger.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    username = Column(String(50))
    user_role = Column(String(50))
    action = Column(SQLEnum(AuditAction), nullable=False)
    previous_values = Column(JSON)
    new_values = Column(JSON)
    change_reason = Column(Text)
    field_changes = Column(JSON)
    ip_address = Column(String(50))
    user_agent = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    ledger = relationship("EquipmentLedger", back_populates="audit_logs")
