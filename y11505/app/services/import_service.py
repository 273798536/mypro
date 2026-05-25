from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
import uuid
import hashlib
from datetime import datetime, date

from app.core.constants import DuplicateStrategy, RecordStatus, OperationType, RecordType
from app.models import (
    Batch,
    InspectionRecord,
    CalibrationCertificate,
    RepairQuote,
    PriceAdjustment,
    Device,
)
from app.services.audit_service import AuditService
from app.services.device_status_linker import DeviceStatusLinkerService


class ImportService:
    def __init__(self, db: Session):
        self.db = db
        self.audit_service = AuditService(db)
        self.status_linker = DeviceStatusLinkerService(db)
    
    def _calculate_source_hash(self, data: Dict[str, Any]) -> str:
        sorted_data = dict(sorted(data.items()))
        data_str = str(sorted_data)
        return hashlib.md5(data_str.encode()).hexdigest()
    
    def _get_or_create_device(self, device_code: str, device_name: str, department: str) -> Device:
        device = self.db.query(Device).filter(Device.device_code == device_code).first()
        if not device:
            device = Device(
                id=str(uuid.uuid4()),
                device_code=device_code,
                device_name=device_name,
                department=department,
                created_at=datetime.now(),
                updated_at=datetime.now(),
            )
            self.db.add(device)
            self.db.flush()
        return device
    
    def import_inspection_record(
        self,
        batch: Batch,
        record_data: Dict[str, Any],
        operator: str,
    ) -> Tuple[InspectionRecord, str, bool]:
        record_no = record_data.get("record_no")
        if not record_no:
            record_no = f"INSP-{batch.batch_no}-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"
        
        existing = (
            self.db.query(InspectionRecord)
            .filter(InspectionRecord.record_no == record_no)
            .first()
        )
        
        source_hash = self._calculate_source_hash(record_data)
        
        if existing:
            if batch.duplicate_strategy == DuplicateStrategy.IGNORE:
                return existing, "ignored", False
            elif batch.duplicate_strategy == DuplicateStrategy.APPEND:
                record_no = f"{record_no}-{uuid.uuid4().hex[:6]}"
            elif batch.duplicate_strategy == DuplicateStrategy.OVERWRITE:
                before_data = {
                    "inspection_result": existing.inspection_result,
                    "status": existing.status,
                    "version": existing.version,
                }
                
                existing.inspection_result = record_data.get("inspection_result", existing.inspection_result)
                existing.abnormal_description = record_data.get("abnormal_description", existing.abnormal_description)
                existing.inspection_items = record_data.get("inspection_items", existing.inspection_items)
                existing.source_hash = source_hash
                existing.version += 1
                existing.updated_at = datetime.now()
                
                after_data = {
                    "inspection_result": existing.inspection_result,
                    "status": existing.status,
                    "version": existing.version,
                }
                
                self.audit_service.log_operation(
                    batch_id=batch.id,
                    operation_type=OperationType.DATA_IMPORT,
                    record_type="inspection_record",
                    record_id=existing.id,
                    operator=operator,
                    before_data=before_data,
                    after_data=after_data,
                    change_reason="覆盖更新巡检记录",
                )
                
                self.status_linker.link_record_status(existing)
                self.db.flush()
                return existing, "overwritten", True
        
        device = self._get_or_create_device(
            device_code=record_data["device_code"],
            device_name=record_data["device_name"],
            department=batch.department,
        )
        
        inspection_date = record_data.get("inspection_date")
        if isinstance(inspection_date, str):
            inspection_date = datetime.strptime(inspection_date, "%Y-%m-%d").date()
        
        record = InspectionRecord(
            id=str(uuid.uuid4()),
            batch_id=batch.id,
            record_no=record_no,
            device_id=device.id,
            device_name=record_data["device_name"],
            device_code=record_data["device_code"],
            inspection_date=inspection_date,
            inspector=record_data.get("inspector", operator),
            inspection_items=record_data.get("inspection_items"),
            inspection_result=record_data["inspection_result"],
            abnormal_description=record_data.get("abnormal_description"),
            status=RecordStatus.NORMAL,
            source_hash=source_hash,
            version=1,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        
        if record_data.get("inspection_result") != "正常":
            record.status = RecordStatus.ABNORMAL
        
        self.db.add(record)
        self.db.flush()
        
        self.status_linker.link_record_status(record)
        
        self.audit_service.log_operation(
            batch_id=batch.id,
            operation_type=OperationType.DATA_IMPORT,
            record_type="inspection_record",
            record_id=record.id,
            operator=operator,
            before_data=None,
            after_data={
                "record_no": record_no,
                "device_code": record.device_code,
                "inspection_result": record.inspection_result,
            },
            change_reason="导入巡检记录",
        )
        
        return record, "created", True
    
    def import_calibration_certificate(
        self,
        batch: Batch,
        cert_data: Dict[str, Any],
        operator: str,
    ) -> Tuple[CalibrationCertificate, str, bool]:
        certificate_no = cert_data.get("certificate_no")
        if not certificate_no:
            certificate_no = f"CERT-{batch.batch_no}-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"
        
        existing = (
            self.db.query(CalibrationCertificate)
            .filter(CalibrationCertificate.certificate_no == certificate_no)
            .first()
        )
        
        source_hash = self._calculate_source_hash(cert_data)
        
        if existing:
            if batch.duplicate_strategy == DuplicateStrategy.IGNORE:
                return existing, "ignored", False
            elif batch.duplicate_strategy == DuplicateStrategy.APPEND:
                certificate_no = f"{certificate_no}-{uuid.uuid4().hex[:6]}"
            elif batch.duplicate_strategy == DuplicateStrategy.OVERWRITE:
                before_data = {
                    "calibration_result": existing.calibration_result,
                    "is_valid": existing.is_valid,
                    "version": existing.version,
                }
                
                existing.calibration_result = cert_data.get("calibration_result", existing.calibration_result)
                existing.is_valid = cert_data.get("is_valid", existing.is_valid)
                existing.source_hash = source_hash
                existing.version += 1
                existing.updated_at = datetime.now()
                
                after_data = {
                    "calibration_result": existing.calibration_result,
                    "is_valid": existing.is_valid,
                    "version": existing.version,
                }
                
                self.audit_service.log_operation(
                    batch_id=batch.id,
                    operation_type=OperationType.DATA_IMPORT,
                    record_type="calibration_certificate",
                    record_id=existing.id,
                    operator=operator,
                    before_data=before_data,
                    after_data=after_data,
                    change_reason="覆盖更新校准证书",
                )
                
                self.status_linker.check_certificate_expiry(existing)
                self.db.flush()
                return existing, "overwritten", True
        
        device = self._get_or_create_device(
            device_code=cert_data["device_code"],
            device_name=cert_data["device_name"],
            department=batch.department,
        )
        
        def parse_date(d):
            if isinstance(d, str):
                return datetime.strptime(d, "%Y-%m-%d").date()
            return d
        
        certificate = CalibrationCertificate(
            id=str(uuid.uuid4()),
            batch_id=batch.id,
            certificate_no=certificate_no,
            device_id=device.id,
            device_name=cert_data["device_name"],
            device_code=cert_data["device_code"],
            calibration_agency=cert_data["calibration_agency"],
            calibration_date=parse_date(cert_data["calibration_date"]),
            effective_date=parse_date(cert_data["effective_date"]),
            expiry_date=parse_date(cert_data["expiry_date"]),
            calibration_result=cert_data["calibration_result"],
            calibration_items=cert_data.get("calibration_items"),
            is_valid=cert_data.get("is_valid", True),
            is_expired=False,
            source_hash=source_hash,
            version=1,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        
        certificate.is_expired = certificate.check_expired()
        
        self.db.add(certificate)
        self.db.flush()
        
        self.status_linker.check_certificate_expiry(certificate)
        
        self.audit_service.log_operation(
            batch_id=batch.id,
            operation_type=OperationType.DATA_IMPORT,
            record_type="calibration_certificate",
            record_id=certificate.id,
            operator=operator,
            before_data=None,
            after_data={
                "certificate_no": certificate_no,
                "device_code": certificate.device_code,
                "expiry_date": str(certificate.expiry_date),
            },
            change_reason="导入校准证书",
        )
        
        return certificate, "created", True
    
    def import_repair_quote(
        self,
        batch: Batch,
        quote_data: Dict[str, Any],
        operator: str,
    ) -> Tuple[RepairQuote, str, bool]:
        quote_no = quote_data.get("quote_no")
        if not quote_no:
            quote_no = f"QUOTE-{batch.batch_no}-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"
        
        existing = (
            self.db.query(RepairQuote)
            .filter(RepairQuote.quote_no == quote_no)
            .first()
        )
        
        source_hash = self._calculate_source_hash(quote_data)
        
        if existing:
            if batch.duplicate_strategy == DuplicateStrategy.IGNORE:
                return existing, "ignored", False
            elif batch.duplicate_strategy == DuplicateStrategy.APPEND:
                quote_no = f"{quote_no}-{uuid.uuid4().hex[:6]}"
            elif batch.duplicate_strategy == DuplicateStrategy.OVERWRITE:
                before_data = {
                    "quote_amount": existing.quote_amount,
                    "quote_status": existing.quote_status,
                    "version": existing.version,
                }
                
                existing.quote_amount = quote_data.get("quote_amount", existing.quote_amount)
                existing.fault_description = quote_data.get("fault_description", existing.fault_description)
                existing.quote_status = quote_data.get("quote_status", existing.quote_status)
                existing.source_hash = source_hash
                existing.version += 1
                existing.updated_at = datetime.now()
                
                after_data = {
                    "quote_amount": existing.quote_amount,
                    "quote_status": existing.quote_status,
                    "version": existing.version,
                }
                
                self.audit_service.log_operation(
                    batch_id=batch.id,
                    operation_type=OperationType.DATA_IMPORT,
                    record_type="repair_quote",
                    record_id=existing.id,
                    operator=operator,
                    before_data=before_data,
                    after_data=after_data,
                    change_reason="覆盖更新维修报价",
                )
                
                self.db.flush()
                return existing, "overwritten", True
        
        device = self._get_or_create_device(
            device_code=quote_data["device_code"],
            device_name=quote_data["device_name"],
            department=batch.department,
        )
        
        def parse_date(d):
            if isinstance(d, str):
                return datetime.strptime(d, "%Y-%m-%d").date()
            return d
        
        quote = RepairQuote(
            id=str(uuid.uuid4()),
            batch_id=batch.id,
            quote_no=quote_no,
            device_id=device.id,
            device_name=quote_data["device_name"],
            device_code=quote_data["device_code"],
            fault_description=quote_data["fault_description"],
            repair_content=quote_data["repair_content"],
            quote_amount=quote_data["quote_amount"],
            quote_date=parse_date(quote_data["quote_date"]),
            valid_until=parse_date(quote_data["valid_until"]),
            repair_vendor=quote_data["repair_vendor"],
            quote_status=quote_data.get("quote_status", "pending"),
            source_hash=source_hash,
            version=1,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        
        self.db.add(quote)
        self.db.flush()
        
        self.audit_service.log_operation(
            batch_id=batch.id,
            operation_type=OperationType.DATA_IMPORT,
            record_type="repair_quote",
            record_id=quote.id,
            operator=operator,
            before_data=None,
            after_data={
                "quote_no": quote_no,
                "device_code": quote.device_code,
                "quote_amount": quote.quote_amount,
            },
            change_reason="导入维修报价",
        )
        
        return quote, "created", True
    
    def import_price_adjustment(
        self,
        batch: Batch,
        adjustment_data: Dict[str, Any],
        operator: str,
    ) -> Tuple[PriceAdjustment, str, bool]:
        adjustment_no = adjustment_data.get("adjustment_no")
        if not adjustment_no:
            adjustment_no = f"PRICE-{batch.batch_no}-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"
        
        existing = (
            self.db.query(PriceAdjustment)
            .filter(PriceAdjustment.adjustment_no == adjustment_no)
            .first()
        )
        
        source_hash = self._calculate_source_hash(adjustment_data)
        
        if existing:
            if batch.duplicate_strategy == DuplicateStrategy.IGNORE:
                return existing, "ignored", False
            elif batch.duplicate_strategy == DuplicateStrategy.APPEND:
                adjustment_no = f"{adjustment_no}-{uuid.uuid4().hex[:6]}"
            elif batch.duplicate_strategy == DuplicateStrategy.OVERWRITE:
                before_data = {
                    "original_price": existing.original_price,
                    "adjusted_price": existing.adjusted_price,
                    "price_difference": existing.price_difference,
                    "version": existing.version,
                }
                
                existing.original_price = adjustment_data.get("original_price", existing.original_price)
                existing.adjusted_price = adjustment_data.get("adjusted_price", existing.adjusted_price)
                existing.price_difference = adjustment_data.get("price_difference", existing.price_difference)
                existing.adjustment_reason = adjustment_data.get("adjustment_reason", existing.adjustment_reason)
                existing.source_hash = source_hash
                existing.version += 1
                existing.updated_at = datetime.now()
                
                after_data = {
                    "original_price": existing.original_price,
                    "adjusted_price": existing.adjusted_price,
                    "price_difference": existing.price_difference,
                    "version": existing.version,
                }
                
                self.audit_service.log_operation(
                    batch_id=batch.id,
                    operation_type=OperationType.DATA_IMPORT,
                    record_type="price_adjustment",
                    record_id=existing.id,
                    operator=operator,
                    before_data=before_data,
                    after_data=after_data,
                    change_reason="覆盖更新手工改价表",
                )
                
                self.db.flush()
                return existing, "overwritten", True
        
        device = self._get_or_create_device(
            device_code=adjustment_data["device_code"],
            device_name=adjustment_data["device_name"],
            department=batch.department,
        )
        
        def parse_date(d):
            if isinstance(d, str):
                return datetime.strptime(d, "%Y-%m-%d").date()
            return d
        
        adjustment = PriceAdjustment(
            id=str(uuid.uuid4()),
            batch_id=batch.id,
            adjustment_no=adjustment_no,
            device_id=device.id,
            device_name=adjustment_data["device_name"],
            device_code=adjustment_data["device_code"],
            original_price=adjustment_data["original_price"],
            adjusted_price=adjustment_data["adjusted_price"],
            price_difference=adjustment_data.get("price_difference", adjustment_data["adjusted_price"] - adjustment_data["original_price"]),
            adjustment_reason=adjustment_data.get("adjustment_reason", ""),
            effective_date=parse_date(adjustment_data["effective_date"]),
            source_hash=source_hash,
            version=1,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        
        self.db.add(adjustment)
        self.db.flush()
        
        self.audit_service.log_operation(
            batch_id=batch.id,
            operation_type=OperationType.DATA_IMPORT,
            record_type="price_adjustment",
            record_id=adjustment.id,
            operator=operator,
            before_data=None,
            after_data={
                "adjustment_no": adjustment_no,
                "device_code": adjustment.device_code,
                "original_price": adjustment.original_price,
                "adjusted_price": adjustment.adjusted_price,
                "price_difference": adjustment.price_difference,
            },
            change_reason="导入手工改价表",
        )
        
        return adjustment, "created", True
    
    def import_batch_data(
        self,
        batch: Batch,
        inspection_records: List[Dict[str, Any]],
        calibration_certificates: List[Dict[str, Any]],
        repair_quotes: List[Dict[str, Any]],
        price_adjustments: List[Dict[str, Any]],
        operator: str,
    ) -> Dict[str, Any]:
        results = {
            "inspection_records": {"created": 0, "overwritten": 0, "ignored": 0, "failed": 0},
            "calibration_certificates": {"created": 0, "overwritten": 0, "ignored": 0, "failed": 0},
            "repair_quotes": {"created": 0, "overwritten": 0, "ignored": 0, "failed": 0},
            "price_adjustments": {"created": 0, "overwritten": 0, "ignored": 0, "failed": 0},
            "errors": [],
        }
        
        for record_data in inspection_records:
            try:
                _, status, changed = self.import_inspection_record(batch, record_data, operator)
                if changed:
                    results["inspection_records"][status] += 1
                else:
                    results["inspection_records"]["ignored"] += 1
            except Exception as e:
                results["inspection_records"]["failed"] += 1
                results["errors"].append(f"巡检记录导入失败: {str(e)}")
        
        for cert_data in calibration_certificates:
            try:
                _, status, changed = self.import_calibration_certificate(batch, cert_data, operator)
                if changed:
                    results["calibration_certificates"][status] += 1
                else:
                    results["calibration_certificates"]["ignored"] += 1
            except Exception as e:
                results["calibration_certificates"]["failed"] += 1
                results["errors"].append(f"校准证书导入失败: {str(e)}")
        
        for quote_data in repair_quotes:
            try:
                _, status, changed = self.import_repair_quote(batch, quote_data, operator)
                if changed:
                    results["repair_quotes"][status] += 1
                else:
                    results["repair_quotes"]["ignored"] += 1
            except Exception as e:
                results["repair_quotes"]["failed"] += 1
                results["errors"].append(f"维修报价导入失败: {str(e)}")
        
        for adjustment_data in price_adjustments:
            try:
                _, status, changed = self.import_price_adjustment(batch, adjustment_data, operator)
                if changed:
                    results["price_adjustments"][status] += 1
                else:
                    results["price_adjustments"]["ignored"] += 1
            except Exception as e:
                results["price_adjustments"]["failed"] += 1
                results["errors"].append(f"手工改价表导入失败: {str(e)}")
        
        self.db.commit()
        return results
