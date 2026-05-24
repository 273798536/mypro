from sqlalchemy import Column, String, Integer, DateTime, Text, JSON
from app.models.base import BaseModel


class AuditLog(BaseModel):
    __tablename__ = "audit_logs"

    operation_id = Column(String, unique=True, index=True, nullable=False)
    batch_no = Column(String, index=True)
    record_type = Column(String, index=True)
    record_id = Column(String, index=True)
    operation = Column(String)
    operator = Column(String)
    operation_time = Column(DateTime)
    before_data = Column(JSON, nullable=True)
    after_data = Column(JSON, nullable=True)
    change_reason = Column(String, nullable=True)
    request_id = Column(String, index=True)
    source = Column(String)
    ip_address = Column(String, nullable=True)
