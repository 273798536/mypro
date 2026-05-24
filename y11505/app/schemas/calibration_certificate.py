from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date


class CalibrationCertificateBase(BaseModel):
    certificate_no: str
    device_code: str
    device_name: str
    calibration_agency: str
    calibration_date: date
    effective_date: date
    expiry_date: date
    calibration_result: str
    calibration_items: Optional[str] = None
    is_valid: bool = True


class CalibrationCertificateCreate(CalibrationCertificateBase):
    pass


class CalibrationCertificateUpdate(BaseModel):
    calibration_result: Optional[str] = None
    calibration_items: Optional[str] = None
    is_valid: Optional[bool] = None


class CalibrationCertificateResponse(CalibrationCertificateBase):
    id: str
    batch_id: str
    is_expired: bool
    version: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
