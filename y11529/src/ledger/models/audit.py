from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum, JSON, Boolean
from sqlalchemy.orm import relationship
from .base import BaseModel
from .enums import ActionType, Role


class AuditLog(BaseModel):
    __tablename__ = "audit_logs"

    ledger_record_id = Column(Integer, ForeignKey("ledger_records.id"), nullable=True)
    ledger_record = relationship("LedgerRecord", back_populates="audit_logs")

    action = Column(Enum(ActionType), nullable=False)
    action_by = Column(String(100), nullable=False)
    action_by_role = Column(Enum(Role), nullable=True)
    action_note = Column(Text, nullable=True)

    before_data = Column(JSON, nullable=True)
    after_data = Column(JSON, nullable=True)

    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)

    version_before = Column(Integer, nullable=True)
    version_after = Column(Integer, nullable=True)


class VersionDiff(BaseModel):
    __tablename__ = "version_diffs"

    audit_log_id = Column(Integer, ForeignKey("audit_logs.id"), nullable=False)
    audit_log = relationship("AuditLog", backref="diffs")

    field_name = Column(String(100), nullable=False)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    is_sensitive = Column(Boolean, default=False)
