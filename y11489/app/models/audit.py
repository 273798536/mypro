from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String, index=True, nullable=False)
    entity_type = Column(String, index=True)
    entity_id = Column(Integer, index=True)
    
    old_values = Column(JSON)
    new_values = Column(JSON)
    
    change_reason = Column(Text)
    user_id = Column(Integer, ForeignKey("users.id"))
    user_name = Column(String)
    user_role = Column(String)
    
    ip_address = Column(String)
    user_agent = Column(String)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")


class ChangeHistory(Base):
    __tablename__ = "change_histories"

    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String, index=True, nullable=False)
    entity_id = Column(Integer, index=True, nullable=False)
    version = Column(Integer, default=1)
    
    field_name = Column(String, index=True)
    old_value = Column(Text)
    new_value = Column(Text)
    
    is_sensitive_field = Column(Integer, default=0)
    is_manual_change = Column(Integer, default=0)
    
    change_reason = Column(Text)
    changed_by = Column(Integer, ForeignKey("users.id"))
    changed_at = Column(DateTime(timezone=True), server_default=func.now())
    
    status_before = Column(String)
    status_after = Column(String)

    changer = relationship("User")
