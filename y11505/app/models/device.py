from sqlalchemy import Column, String, DateTime, Boolean, Date
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base


class Device(Base):
    __tablename__ = "devices"

    id = Column(String, primary_key=True, index=True)
    device_code = Column(String, unique=True, index=True, nullable=False)
    device_name = Column(String, nullable=False)
    device_model = Column(String, nullable=True)
    serial_number = Column(String, nullable=True)
    
    department = Column(String, nullable=False)
    location = Column(String, nullable=True)
    
    is_active = Column(Boolean, default=True)
    is_disabled = Column(Boolean, default=False)
    disabled_reason = Column(String, nullable=True)
    disabled_time = Column(DateTime, nullable=True)
    
    last_inspection_date = Column(Date, nullable=True)
    next_inspection_date = Column(Date, nullable=True)
    last_calibration_date = Column(Date, nullable=True)
    next_calibration_date = Column(Date, nullable=True)
    
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    inspection_records = relationship("InspectionRecord", back_populates="device")
    calibration_certificates = relationship("CalibrationCertificate", back_populates="device")
    repair_quotes = relationship("RepairQuote", back_populates="device")
    price_adjustments = relationship("PriceAdjustment", back_populates="device")
