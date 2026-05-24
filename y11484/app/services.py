import json
from typing import List, Optional, Tuple, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app import models, schemas


VALID_STATUSES = ["draft", "submitted", "rejected", "confirmed"]
STATUS_TRANSITIONS = {
    "draft": ["submitted"],
    "submitted": ["rejected", "confirmed"],
    "rejected": ["submitted"],
    "confirmed": []
}

SENSITIVE_FIELDS = ["sampler", "recorder", "handler", "scanner", "created_by", "updated_by"]


class StatusTransitionError(Exception):
    pass


class DataValidationError(Exception):
    pass


class RecordNotFoundError(Exception):
    pass


class IdempotentOperation:
    def __init__(self, db: Session):
        self.db = db

    def check_duplicate_operation(self, operation_id: str, operation_type: str) -> bool:
        existing = self.db.query(models.AuditLog).filter(
            models.AuditLog.change_reason.like(f"%{operation_id}%")
        ).first()
        return existing is not None


class StatusMachine:
    def __init__(self, db: Session):
        self.db = db

    def validate_transition(self, old_status: str, new_status: str) -> bool:
        if old_status not in STATUS_TRANSITIONS:
            return False
        return new_status in STATUS_TRANSITIONS[old_status]

    def change_status(
        self,
        record_type: str,
        record_id: int,
        new_status: str,
        change_reason: str,
        operator: str,
        operator_role: str,
        ip_address: Optional[str] = None
    ) -> Tuple[Any, models.AuditLog]:
        model_map = {
            "sample_label": models.SampleLabel,
            "temperature": models.TemperatureRecord,
            "complaint": models.StoreComplaint,
            "scan": models.ScanRecord
        }

        if record_type not in model_map:
            raise ValueError(f"Unknown record type: {record_type}")

        model = model_map[record_type]
        record = self.db.query(model).filter(model.id == record_id).first()

        if not record:
            raise RecordNotFoundError(f"{record_type} record {record_id} not found")

        old_status = record.status

        if old_status == new_status:
            audit_log = self._create_audit_log(
                sample_label_id=record.sample_label_id if hasattr(record, 'sample_label_id') else record.id,
                action_type=f"{record_type}_status_unchanged",
                old_status=old_status,
                new_status=new_status,
                change_reason=f"幂等操作 - {change_reason}",
                operator=operator,
                operator_role=operator_role,
                ip_address=ip_address
            )
            return record, audit_log

        if not self.validate_transition(old_status, new_status):
            raise StatusTransitionError(
                f"Invalid status transition: {old_status} -> {new_status}"
            )

        record.status = new_status
        record.version += 1
        record.updated_by = operator
        record.updated_at = datetime.now()

        audit_log = self._create_audit_log(
            sample_label_id=record.sample_label_id if hasattr(record, 'sample_label_id') else record.id,
            action_type=f"{record_type}_status_change",
            old_status=old_status,
            new_status=new_status,
            change_reason=change_reason,
            operator=operator,
            operator_role=operator_role,
            ip_address=ip_address
        )

        self.db.commit()
        self.db.refresh(record)

        return record, audit_log

    def _create_audit_log(
        self,
        sample_label_id: int,
        action_type: str,
        old_status: str,
        new_status: str,
        change_reason: str,
        operator: str,
        operator_role: str,
        ip_address: Optional[str] = None,
        sensitive_fields_changed: Optional[str] = None
    ) -> models.AuditLog:
        audit_log = models.AuditLog(
            sample_label_id=sample_label_id,
            action_type=action_type,
            old_status=old_status,
            new_status=new_status,
            change_reason=change_reason,
            operator=operator,
            operator_role=operator_role,
            ip_address=ip_address,
            sensitive_fields_changed=sensitive_fields_changed
        )
        self.db.add(audit_log)
        self.db.commit()
        self.db.refresh(audit_log)
        return audit_log


class DataValidator:
    def __init__(self, db: Session):
        self.db = db

    def validate_sample_label(self, data: dict) -> Tuple[bool, str]:
        if not data.get("batch_no"):
            return False, "批次号不能为空"
        if not data.get("product_name"):
            return False, "产品名称不能为空"
        if data.get("production_time") and data.get("sample_time"):
            if data["sample_time"] < data["production_time"]:
                return False, "留样时间不能早于生产时间"
        return True, ""

    def validate_temperature(self, data: dict) -> Tuple[bool, str]:
        if not data.get("sample_label_id"):
            return False, "留样标签ID不能为空"
        
        sample_label = self.db.query(models.SampleLabel).filter(
            and_(
                models.SampleLabel.id == data["sample_label_id"],
                models.SampleLabel.is_active == True
            )
        ).first()
        if not sample_label:
            return False, f"留样标签ID {data['sample_label_id']} 不存在"
        
        temp = data.get("temperature")
        if temp is None:
            return False, "温度值不能为空"
        if temp < -30 or temp > 50:
            return False, f"温度值异常: {temp}°C (正常范围 -30°C ~ 50°C)"
        return True, ""

    def validate_complaint(self, data: dict) -> Tuple[bool, str]:
        if not data.get("store_id"):
            return False, "门店ID不能为空"
        if not data.get("complaint_type"):
            return False, "投诉类型不能为空"
        
        if data.get("sample_label_id"):
            sample_label = self.db.query(models.SampleLabel).filter(
                and_(
                    models.SampleLabel.id == data["sample_label_id"],
                    models.SampleLabel.is_active == True
                )
            ).first()
            if not sample_label:
                return False, f"留样标签ID {data['sample_label_id']} 不存在"
        
        return True, ""

    def validate_scan_record(self, data: dict) -> Tuple[bool, str]:
        if not data.get("store_id"):
            return False, "门店ID不能为空"
        qty = data.get("quantity")
        if qty is None or qty <= 0:
            return False, "数量必须大于0"
        
        if data.get("sample_label_id"):
            sample_label = self.db.query(models.SampleLabel).filter(
                and_(
                    models.SampleLabel.id == data["sample_label_id"],
                    models.SampleLabel.is_active == True
                )
            ).first()
            if not sample_label:
                return False, f"留样标签ID {data['sample_label_id']} 不存在"
        
        return True, ""


class FailedRecordManager:
    def __init__(self, db: Session):
        self.db = db

    def save_failed_record(
        self,
        source_type: str,
        source_data: Any,
        error_message: str
    ) -> models.FailedRecord:
        failed_record = models.FailedRecord(
            source_type=source_type,
            source_data=json.dumps(source_data, ensure_ascii=False, default=str),
            error_message=error_message,
            processed=False
        )
        self.db.add(failed_record)
        self.db.commit()
        self.db.refresh(failed_record)
        return failed_record

    def get_failed_records(self, source_type: Optional[str] = None) -> List[models.FailedRecord]:
        query = self.db.query(models.FailedRecord)
        if source_type:
            query = query.filter(models.FailedRecord.source_type == source_type)
        return query.all()


class DataConsistencyService:
    def __init__(self, db: Session):
        self.db = db

    def get_consistent_record(self, model, record_id: int):
        record = self.db.query(model).filter(
            and_(model.id == record_id, model.is_active == True)
        ).first()
        if not record:
            raise RecordNotFoundError(f"Record {record_id} not found or inactive")
        return record

    def trace_report_to_source(
        self,
        batch_no: str
    ) -> schemas.BatchTraceResult:
        sample_label = self.db.query(models.SampleLabel).filter(
            models.SampleLabel.batch_no == batch_no
        ).first()

        if not sample_label:
            raise RecordNotFoundError(f"批次 {batch_no} 不存在")

        stores = []
        seen_stores = set()
        for scan in sample_label.scan_records:
            if scan.store_id not in seen_stores:
                seen_stores.add(scan.store_id)
                stores.append({
                    "store_id": scan.store_id,
                    "store_name": scan.store_name,
                    "scan_count": len([s for s in sample_label.scan_records if s.store_id == scan.store_id]),
                    "total_quantity": sum(s.quantity for s in sample_label.scan_records if s.store_id == scan.store_id)
                })

        return schemas.BatchTraceResult(
            batch_no=sample_label.batch_no,
            product_name=sample_label.product_name,
            stores=stores,
            temperature_records=[
                {
                    "id": t.id,
                    "record_time": t.record_time,
                    "temperature": t.temperature,
                    "recorder": t.recorder,
                    "status": t.status
                }
                for t in sample_label.temperature_records
            ],
            complaints=[
                {
                    "id": c.id,
                    "store_id": c.store_id,
                    "store_name": c.store_name,
                    "complaint_type": c.complaint_type,
                    "complaint_time": c.complaint_time,
                    "status": c.status
                }
                for c in sample_label.complaints
            ],
            scan_records=[
                {
                    "id": s.id,
                    "store_id": s.store_id,
                    "store_name": s.store_name,
                    "scan_time": s.scan_time,
                    "quantity": s.quantity,
                    "status": s.status
                }
                for s in sample_label.scan_records
            ],
            audit_logs=[
                {
                    "id": a.id,
                    "action_type": a.action_type,
                    "old_status": a.old_status,
                    "new_status": a.new_status,
                    "change_reason": a.change_reason,
                    "operator": a.operator,
                    "operator_role": a.operator_role,
                    "created_at": a.created_at
                }
                for a in sample_label.audit_logs
            ]
        )


class RoleBasedViewService:
    def __init__(self, user_role: str):
        self.user_role = user_role
        self.can_see_sensitive = user_role in ["quality_manager", "admin"]

    def mask_sensitive_fields(self, data: dict) -> dict:
        if self.can_see_sensitive:
            return data
        
        masked = data.copy()
        for field in SENSITIVE_FIELDS:
            if field in masked and masked[field]:
                original = masked[field]
                if len(original) > 2:
                    masked[field] = original[0] + "*" * (len(original) - 2) + original[-1]
                else:
                    masked[field] = "*" * len(original)
        return masked

    def filter_by_role(self, records: List[Any]) -> List[dict]:
        result = []
        for record in records:
            record_dict = {c.name: getattr(record, c.name) for c in record.__table__.columns}
            result.append(self.mask_sensitive_fields(record_dict))
        return result


class SampleLabelService:
    def __init__(self, db: Session):
        self.db = db
        self.status_machine = StatusMachine(db)
        self.validator = DataValidator(db)

    def create_sample_label(self, data: schemas.SampleLabelCreate, operator: str) -> models.SampleLabel:
        data_dict = data.model_dump()
        is_valid, error_msg = self.validator.validate_sample_label(data_dict)
        if not is_valid:
            raise DataValidationError(error_msg)

        existing = self.db.query(models.SampleLabel).filter(
            models.SampleLabel.batch_no == data.batch_no
        ).first()
        if existing:
            raise DataValidationError(f"批次号 {data.batch_no} 已存在")

        sample_label = models.SampleLabel(
            **data_dict,
            created_by=operator,
            updated_by=operator,
            status="draft",
            version=1,
            is_active=True
        )
        self.db.add(sample_label)
        self.db.commit()
        self.db.refresh(sample_label)

        self.status_machine._create_audit_log(
            sample_label_id=sample_label.id,
            action_type="sample_label_created",
            old_status=None,
            new_status="draft",
            change_reason="创建留样标签",
            operator=operator,
            operator_role="operator"
        )

        return sample_label

    def get_sample_label(self, label_id: int) -> Optional[models.SampleLabel]:
        return self.db.query(models.SampleLabel).filter(
            and_(models.SampleLabel.id == label_id, models.SampleLabel.is_active == True)
        ).first()

    def get_all_sample_labels(self) -> List[models.SampleLabel]:
        return self.db.query(models.SampleLabel).filter(
            models.SampleLabel.is_active == True
        ).all()

    def update_sample_label(self, label_id: int, data: schemas.SampleLabelUpdate, operator: str) -> models.SampleLabel:
        sample_label = self.get_sample_label(label_id)
        if not sample_label:
            raise RecordNotFoundError(f"留样标签 {label_id} 不存在")

        if sample_label.status != "draft":
            raise StatusTransitionError("只能修改草稿状态的记录")

        update_data = data.model_dump(exclude_unset=True)
        
        sensitive_changed = []
        for field, value in update_data.items():
            if field in SENSITIVE_FIELDS:
                sensitive_changed.append(field)
            setattr(sample_label, field, value)

        sample_label.version += 1
        sample_label.updated_by = operator
        sample_label.updated_at = datetime.now()

        self.status_machine._create_audit_log(
            sample_label_id=sample_label.id,
            action_type="sample_label_updated",
            old_status=sample_label.status,
            new_status=sample_label.status,
            change_reason="更新留样标签信息",
            operator=operator,
            operator_role="operator",
            sensitive_fields_changed=",".join(sensitive_changed) if sensitive_changed else None
        )

        self.db.commit()
        self.db.refresh(sample_label)
        return sample_label


class TemperatureRecordService:
    def __init__(self, db: Session):
        self.db = db
        self.validator = DataValidator(db)

    def create_temperature_record(self, data: schemas.TemperatureRecordCreate, operator: str) -> models.TemperatureRecord:
        data_dict = data.model_dump()
        is_valid, error_msg = self.validator.validate_temperature(data_dict)
        if not is_valid:
            raise DataValidationError(error_msg)

        temp_record = models.TemperatureRecord(
            **data_dict,
            created_by=operator,
            updated_by=operator,
            status="draft",
            version=1,
            is_active=True
        )
        self.db.add(temp_record)
        self.db.commit()
        self.db.refresh(temp_record)
        return temp_record

    def get_temperature_records(self, sample_label_id: Optional[int] = None) -> List[models.TemperatureRecord]:
        query = self.db.query(models.TemperatureRecord).filter(models.TemperatureRecord.is_active == True)
        if sample_label_id:
            query = query.filter(models.TemperatureRecord.sample_label_id == sample_label_id)
        return query.all()


class StoreComplaintService:
    def __init__(self, db: Session):
        self.db = db
        self.validator = DataValidator(db)

    def create_complaint(self, data: schemas.StoreComplaintCreate, operator: str) -> models.StoreComplaint:
        data_dict = data.model_dump()
        is_valid, error_msg = self.validator.validate_complaint(data_dict)
        if not is_valid:
            raise DataValidationError(error_msg)

        complaint = models.StoreComplaint(
            **data_dict,
            created_by=operator,
            updated_by=operator,
            status="draft",
            version=1,
            is_active=True
        )
        self.db.add(complaint)
        self.db.commit()
        self.db.refresh(complaint)
        return complaint

    def get_complaints(self, sample_label_id: Optional[int] = None) -> List[models.StoreComplaint]:
        query = self.db.query(models.StoreComplaint).filter(models.StoreComplaint.is_active == True)
        if sample_label_id:
            query = query.filter(models.StoreComplaint.sample_label_id == sample_label_id)
        return query.all()


class ScanRecordService:
    def __init__(self, db: Session):
        self.db = db
        self.validator = DataValidator(db)

    def create_scan_record(self, data: schemas.ScanRecordCreate, operator: str) -> models.ScanRecord:
        data_dict = data.model_dump()
        is_valid, error_msg = self.validator.validate_scan_record(data_dict)
        if not is_valid:
            raise DataValidationError(error_msg)

        scan_record = models.ScanRecord(
            **data_dict,
            created_by=operator,
            updated_by=operator,
            status="draft",
            version=1,
            is_active=True
        )
        self.db.add(scan_record)
        self.db.commit()
        self.db.refresh(scan_record)
        return scan_record

    def get_scan_records(self, sample_label_id: Optional[int] = None) -> List[models.ScanRecord]:
        query = self.db.query(models.ScanRecord).filter(models.ScanRecord.is_active == True)
        if sample_label_id:
            query = query.filter(models.ScanRecord.sample_label_id == sample_label_id)
        return query.all()


class ReportService:
    def __init__(self, db: Session):
        self.db = db

    def get_summary_report(self) -> schemas.ReportSummary:
        total_samples = self.db.query(models.SampleLabel).filter(models.SampleLabel.is_active == True).count()
        draft_count = self.db.query(models.SampleLabel).filter(
            and_(models.SampleLabel.is_active == True, models.SampleLabel.status == "draft")
        ).count()
        submitted_count = self.db.query(models.SampleLabel).filter(
            and_(models.SampleLabel.is_active == True, models.SampleLabel.status == "submitted")
        ).count()
        confirmed_count = self.db.query(models.SampleLabel).filter(
            and_(models.SampleLabel.is_active == True, models.SampleLabel.status == "confirmed")
        ).count()
        rejected_count = self.db.query(models.SampleLabel).filter(
            and_(models.SampleLabel.is_active == True, models.SampleLabel.status == "rejected")
        ).count()
        
        abnormal_temp_count = self.db.query(models.TemperatureRecord).join(
            models.SampleLabel,
            models.TemperatureRecord.sample_label_id == models.SampleLabel.id
        ).filter(
            and_(
                models.TemperatureRecord.is_active == True,
                models.SampleLabel.is_active == True,
                models.TemperatureRecord.status == "confirmed",
                (models.TemperatureRecord.temperature < 0) | (models.TemperatureRecord.temperature > 10)
            )
        ).count()
        
        complaint_count = self.db.query(models.StoreComplaint).outerjoin(
            models.SampleLabel,
            models.StoreComplaint.sample_label_id == models.SampleLabel.id
        ).filter(
            and_(
                models.StoreComplaint.is_active == True,
                (models.SampleLabel.id.is_(None) | (models.SampleLabel.is_active == True))
            )
        ).count()
        
        total_store_scans = self.db.query(models.ScanRecord).outerjoin(
            models.SampleLabel,
            models.ScanRecord.sample_label_id == models.SampleLabel.id
        ).filter(
            and_(
                models.ScanRecord.is_active == True,
                (models.SampleLabel.id.is_(None) | (models.SampleLabel.is_active == True))
            )
        ).count()

        return schemas.ReportSummary(
            total_samples=total_samples,
            draft_count=draft_count,
            submitted_count=submitted_count,
            confirmed_count=confirmed_count,
            rejected_count=rejected_count,
            abnormal_temp_count=abnormal_temp_count,
            complaint_count=complaint_count,
            total_store_scans=total_store_scans
        )
