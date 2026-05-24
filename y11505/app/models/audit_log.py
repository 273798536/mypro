from sqlalchemy import Column, String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, index=True)
    batch_id = Column(String, ForeignKey("batches.id"), index=True, nullable=True)
    
    operation_type = Column(String, index=True, nullable=False)
    
    record_type = Column(String, nullable=True)
    record_id = Column(String, nullable=True)
    
    operator = Column(String, nullable=False)
    operation_time = Column(DateTime, default=datetime.now)
    
    before_data = Column(JSON, nullable=True)
    after_data = Column(JSON, nullable=True)
    
    change_reason = Column(Text, nullable=True)
    remark = Column(Text, nullable=True)
    
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    
    batch = relationship("Batch", back_populates="audit_logs")
