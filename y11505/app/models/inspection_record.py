from sqlalchemy import Column, String, DateTime, Text, Boolean, ForeignKey, Date, Integer
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base
from app.core.constants import RecordStatus


class InspectionRecord(Base):
    __tablename__ = "inspection_records"

    id = Column(String, primary_key=True, index=True)
    batch_id = Column(String, ForeignKey("batches.id"), index=True)
    
    record_no = Column(String, unique=True, index=True, nullable=False)
    
    device_id = Column(String, ForeignKey("devices.id"), index=True)
    device_name = Column(String, nullable=False)
    device_code = Column(String, nullable=False)
    
    inspection_date = Column(Date, nullable=False)
    inspector = Column(String, nullable=False)
    
    inspection_items = Column(Text, nullable=True)
    inspection_result = Column(String, nullable=False)
    abnormal_description = Column(Text, nullable=True)
    
    status = Column(String, default=RecordStatus.NORMAL, index=True)
    linked_certificate_id = Column(String, nullable=True)
    linked_repair_id = Column(String, nullable=True)
    
    review_status = Column(String, nullable=True)
    review_opinion = Column(Text, nullable=True)
    review_operator = Column(String, nullable=True)
    review_time = Column(DateTime, nullable=True)
    
    manual_reason = Column(Text, nullable=True)
    manual_operator = Column(String, nullable=True)
    manual_time = Column(DateTime, nullable=True)
    
    source_hash = Column(String, index=True)
    version = Column(Integer, default=1)
    
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    batch = relationship("Batch", back_populates="inspection_records")
    device = relationship("Device", back_populates="inspection_records")
