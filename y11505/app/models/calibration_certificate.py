from sqlalchemy import Column, String, DateTime, Text, Boolean, ForeignKey, Date, Integer
from sqlalchemy.orm import relationship
from datetime import datetime, date

from app.core.database import Base


class CalibrationCertificate(Base):
    __tablename__ = "calibration_certificates"

    id = Column(String, primary_key=True, index=True)
    batch_id = Column(String, ForeignKey("batches.id"), index=True)
    
    certificate_no = Column(String, unique=True, index=True, nullable=False)
    
    device_id = Column(String, ForeignKey("devices.id"), index=True)
    device_name = Column(String, nullable=False)
    device_code = Column(String, nullable=False)
    
    calibration_agency = Column(String, nullable=False)
    calibration_date = Column(Date, nullable=False)
    effective_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=False)
    
    calibration_result = Column(String, nullable=False)
    calibration_items = Column(Text, nullable=True)
    
    is_expired = Column(Boolean, default=False)
    is_valid = Column(Boolean, default=True)
    
    source_hash = Column(String, index=True)
    version = Column(Integer, default=1)
    
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    batch = relationship("Batch", back_populates="calibration_certificates")
    device = relationship("Device", back_populates="calibration_certificates")
    
    def check_expired(self, check_date: date = None) -> bool:
        check_date = check_date or date.today()
        return check_date > self.expiry_date
