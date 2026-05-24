from sqlalchemy import Column, String, DateTime, Text, Boolean, ForeignKey, Date, Integer, Float
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base


class PriceAdjustment(Base):
    __tablename__ = "price_adjustments"

    id = Column(String, primary_key=True, index=True)
    batch_id = Column(String, ForeignKey("batches.id"), index=True)
    
    adjustment_no = Column(String, unique=True, index=True, nullable=False)
    
    device_id = Column(String, ForeignKey("devices.id"), index=True)
    device_name = Column(String, nullable=False)
    device_code = Column(String, nullable=False)
    
    original_price = Column(Float, nullable=False)
    adjusted_price = Column(Float, nullable=False)
    price_difference = Column(Float, nullable=False)
    
    adjustment_reason = Column(Text, nullable=False)
    effective_date = Column(Date, nullable=False)
    
    approval_status = Column(String, default="pending")
    approval_opinion = Column(Text, nullable=True)
    approval_operator = Column(String, nullable=True)
    approval_time = Column(DateTime, nullable=True)
    
    source_hash = Column(String, index=True)
    version = Column(Integer, default=1)
    
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    batch = relationship("Batch", back_populates="price_adjustments")
    device = relationship("Device", back_populates="price_adjustments")
