from typing import Optional, List
from sqlalchemy.orm import Session
from datetime import datetime, date

from app.core.constants import RecordStatus
from app.models import (
    Device,
    CalibrationCertificate,
    InspectionRecord,
)


class DeviceStatusLinkerService:
    def __init__(self, db: Session):
        self.db = db
    
    def check_certificate_expiry(self, certificate: CalibrationCertificate) -> None:
        is_expired = certificate.check_expired()
        
        if is_expired != certificate.is_expired:
            certificate.is_expired = is_expired
            certificate.updated_at = datetime.now()
            
            if is_expired:
                self._trigger_certificate_expired(certificate)
            else:
                self._trigger_certificate_renewed(certificate)
            
            self.db.flush()
    
    def check_device_disabled(self, device: Device) -> None:
        if device.is_disabled:
            self._trigger_device_disabled(device)
        else:
            self._trigger_device_enabled(device)
    
    def _trigger_certificate_expired(self, certificate: CalibrationCertificate) -> None:
        device = self.db.query(Device).filter(Device.id == certificate.device_id).first()
        if not device:
            return
        
        records = (
            self.db.query(InspectionRecord)
            .filter(
                InspectionRecord.device_id == device.id,
                InspectionRecord.is_deleted == False,
            )
            .all()
        )
        
        for record in records:
            if record.status != RecordStatus.CERTIFICATE_EXPIRED:
                record.status = RecordStatus.CERTIFICATE_EXPIRED
                record.updated_at = datetime.now()
    
    def _trigger_certificate_renewed(self, certificate: CalibrationCertificate) -> None:
        device = self.db.query(Device).filter(Device.id == certificate.device_id).first()
        if not device:
            return
        
        valid_certs = (
            self.db.query(CalibrationCertificate)
            .filter(
                CalibrationCertificate.device_id == device.id,
                CalibrationCertificate.is_valid == True,
                CalibrationCertificate.is_expired == False,
                CalibrationCertificate.is_deleted == False,
            )
            .count()
        )
        
        if valid_certs > 0:
            records = (
                self.db.query(InspectionRecord)
                .filter(
                    InspectionRecord.device_id == device.id,
                    InspectionRecord.status == RecordStatus.CERTIFICATE_EXPIRED,
                    InspectionRecord.is_deleted == False,
                )
                .all()
            )
            
            for record in records:
                record.status = RecordStatus.NORMAL
                record.updated_at = datetime.now()
    
    def _trigger_device_disabled(self, device: Device) -> None:
        records = (
            self.db.query(InspectionRecord)
            .filter(
                InspectionRecord.device_id == device.id,
                InspectionRecord.is_deleted == False,
            )
            .all()
        )
        
        for record in records:
            if record.status != RecordStatus.DEVICE_DISABLED:
                record.status = RecordStatus.DEVICE_DISABLED
                record.updated_at = datetime.now()
    
    def _trigger_device_enabled(self, device: Device) -> None:
        records = (
            self.db.query(InspectionRecord)
            .filter(
                InspectionRecord.device_id == device.id,
                InspectionRecord.status == RecordStatus.DEVICE_DISABLED,
                InspectionRecord.is_deleted == False,
            )
            .all()
        )
        
        for record in records:
            record.status = RecordStatus.NORMAL
            record.updated_at = datetime.now()
    
    def link_record_status(self, record: InspectionRecord) -> None:
        device = self.db.query(Device).filter(Device.id == record.device_id).first()
        if not device:
            return
        
        if device.is_disabled:
            record.status = RecordStatus.DEVICE_DISABLED
            return
        
        expired_certs = (
            self.db.query(CalibrationCertificate)
            .filter(
                CalibrationCertificate.device_id == device.id,
                CalibrationCertificate.is_valid == True,
                CalibrationCertificate.is_expired == True,
                CalibrationCertificate.is_deleted == False,
            )
            .count()
        )
        
        if expired_certs > 0:
            record.status = RecordStatus.CERTIFICATE_EXPIRED
            return
        
        if record.inspection_result != "正常" and record.status == RecordStatus.NORMAL:
            record.status = RecordStatus.ABNORMAL
    
    def batch_check_expired_certificates(self, check_date: Optional[date] = None) -> int:
        check_date = check_date or date.today()
        
        certificates = (
            self.db.query(CalibrationCertificate)
            .filter(
                CalibrationCertificate.is_valid == True,
                CalibrationCertificate.is_deleted == False,
            )
            .all()
        )
        
        updated_count = 0
        for cert in certificates:
            was_expired = cert.is_expired
            is_expired = check_date > cert.expiry_date
            
            if was_expired != is_expired:
                cert.is_expired = is_expired
                cert.updated_at = datetime.now()
                
                if is_expired:
                    self._trigger_certificate_expired(cert)
                else:
                    self._trigger_certificate_renewed(cert)
                
                updated_count += 1
        
        if updated_count > 0:
            self.db.commit()
        
        return updated_count
