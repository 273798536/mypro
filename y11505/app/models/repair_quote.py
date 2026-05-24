from sqlalchemy import Column, String, DateTime, Text, Boolean, ForeignKey, Date, Integer, Float
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base


class RepairQuote(Base):
    __tablename__ = "repair_quotes"

    id = Column(String, primary_key=True, index=True)
    batch_id = Column(String, ForeignKey("batches.id"), index=True)
    
    quote_no = Column(String, unique=True, index=True, nullable=False)
    
    device_id = Column(String, ForeignKey("devices.id"), index=True)
    device_name = Column(String, nullable=False)
    device_code = Column(String, nullable=False)
    
    fault_description = Column(Text, nullable=False)
    repair_content = Column(Text, nullable=False)
    
    quote_amount = Column(Float, nullable=False)
    quote_date = Column(Date, nullable=False)
    valid_until = Column(Date, nullable=False)
    
    repair_vendor = Column(String, nullable=False)
    quote_status = Column(String, default="pending")
    
    approval_status = Column(String, nullable=True)
    approval_opinion = Column(Text, nullable=True)
    approval_operator = Column(String, nullable=True)
    approval_time = Column(DateTime, nullable=True)
    
    source_hash = Column(String, index=True)
    version = Column(Integer, default=1)
    
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    batch = relationship("Batch", back_populates="repair_quotes")
    device = relationship("Device", back_populates="repair_quotes")
