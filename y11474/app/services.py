import hashlib
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session

from app.models import (
    ReturnApplication, InspectionPhoto, LogisticsReceipt, RefundRecord,
    LedgerRecord, DirtyRecord, DirtyType, RecordStatus, User, AuditLog
)
from app.schemas import ReturnApplicationCreate, ImportResult


class IdempotencyService:
    @staticmethod
    def generate_key(data: Dict[str, Any]) -> str:
        sorted_data = json.dumps(data, sort_keys=True)
        return hashlib.sha256(sorted_data.encode()).hexdigest()

    @staticmethod
    def find_by_key(db: Session, key: str) -> Optional[ReturnApplication]:
        return db.query(ReturnApplication).filter(
            ReturnApplication.idempotency_key == key
        ).first()


class DirtyRecordDetector:
    REQUIRED_FIELDS = {
        "application_no", "batch_no", "sku_code", "sku_name",
        "supplier_id", "supplier_name", "return_quantity",
        "application_date", "applicant", "warehouse_id", "warehouse_name"
    }

    @classmethod
    def detect_all(cls, db: Session, application: ReturnApplication, raw_data: Dict[str, Any]) -> List[DirtyRecord]:
        dirty_records = []
        
        dirty_records.extend(cls._detect_missing_fields(application, raw_data))
        dirty_records.extend(cls._detect_cross_date(application))
        dirty_records.extend(cls._detect_name_changes(db, application))
        dirty_records.extend(cls._detect_quantity_conflicts(application))
        dirty_records.extend(cls._detect_amount_conflicts(application))
        
        for dr in dirty_records:
            dr.application_id = application.id
            dr.raw_source = raw_data
        
        return dirty_records

    @classmethod
    def _detect_missing_fields(cls, application: ReturnApplication, raw_data: Dict[str, Any]) -> List[DirtyRecord]:
        dirty_records = []
        for field in cls.REQUIRED_FIELDS:
            value = getattr(application, field, None)
            if value is None or value == "":
                dirty_records.append(DirtyRecord(
                    dirty_type=DirtyType.MISSING_FIELD,
                    field_name=field,
                    original_value=None,
                    current_value=str(value) if value else None,
                    handling_opinion=f"必填字段缺失: {field}"
                ))
        return dirty_records

    @classmethod
    def _detect_cross_date(cls, application: ReturnApplication) -> List[DirtyRecord]:
        if not application.application_date:
            return []
        
        today = datetime.utcnow().date()
        app_date = application.application_date.date()
        
        if abs((today - app_date).days) > 30:
            return [DirtyRecord(
                dirty_type=DirtyType.CROSS_DATE,
                field_name="application_date",
                original_value=None,
                current_value=application.application_date.isoformat(),
                handling_opinion="申请日期跨度超过30天，需确认"
            )]
        return []

    @classmethod
    def _detect_name_changes(cls, db: Session, application: ReturnApplication) -> List[DirtyRecord]:
        existing = db.query(ReturnApplication).filter(
            ReturnApplication.sku_code == application.sku_code,
            ReturnApplication.sku_name != application.sku_name,
            ReturnApplication.id != application.id
        ).first()
        
        if existing:
            return [DirtyRecord(
                dirty_type=DirtyType.NAME_CHANGED,
                field_name="sku_name",
                original_value=existing.sku_name,
                current_value=application.sku_name,
                handling_opinion=f"SKU {application.sku_code} 商品名称与历史记录不一致"
            )]
        return []

    @classmethod
    def _detect_quantity_conflicts(cls, application: ReturnApplication) -> List[DirtyRecord]:
        conflicts = []
        
        total_logistics_qty = sum(r.actual_quantity for r in application.logistics_receipts)
        
        if application.logistics_receipts and total_logistics_qty != application.return_quantity:
            conflicts.append(DirtyRecord(
                dirty_type=DirtyType.QUANTITY_CONFLICT,
                field_name="return_quantity",
                original_value=str(application.return_quantity),
                current_value=str(total_logistics_qty),
                handling_opinion="申请退供数量与物流实收数量不一致"
            ))
        
        return conflicts

    @classmethod
    def _detect_amount_conflicts(cls, application: ReturnApplication) -> List[DirtyRecord]:
        conflicts = []
        
        for refund in application.refund_records:
            if abs(refund.actual_amount - refund.settlement_amount) > 0.01:
                conflicts.append(DirtyRecord(
                    dirty_type=DirtyType.AMOUNT_CONFLICT,
                    field_name=f"refund_{refund.refund_no}_amount",
                    original_value=str(refund.actual_amount),
                    current_value=str(refund.settlement_amount),
                    handling_opinion=f"退款单 {refund.refund_no} 实退金额与结算金额存在差异"
                ))
        
        return conflicts


class LedgerService:
    @staticmethod
    def create_or_update_ledger(db: Session, application: ReturnApplication) -> LedgerRecord:
        if application.ledger:
            ledger = application.ledger
        else:
            ledger = LedgerRecord(application_id=application.id)
            db.add(ledger)
        
        total_logistics_qty = sum(r.actual_quantity for r in application.logistics_receipts)
        total_refund_qty = sum(
            len(refund.supplier_approved_batches or []) 
            for refund in application.refund_records
        )
        
        ledger.inventory_diff_quantity = total_logistics_qty - total_refund_qty
        ledger.remaining_goods_quantity = max(0, application.return_quantity - total_refund_qty)
        
        if ledger.remaining_goods_quantity > 0:
            ledger.remaining_goods_status = "待处理"
        elif ledger.inventory_diff_quantity != 0:
            ledger.remaining_goods_status = "有差异"
        else:
            ledger.remaining_goods_status = "已完成"
        
        ledger.summary = {
            "application_quantity": application.return_quantity,
            "logistics_received_quantity": total_logistics_qty,
            "supplier_approved_quantity": total_refund_qty,
            "disputed_batches": [
                batch for refund in application.refund_records 
                for batch in (refund.disputed_batches or [])
            ]
        }
        ledger.last_synced_at = datetime.utcnow()
        
        return ledger


class ImportService:
    @staticmethod
    def import_applications(
        db: Session,
        applications_data: List[Dict[str, Any]],
        current_user: User
    ) -> ImportResult:
        created = 0
        updated = 0
        skipped = 0
        errors: List[str] = []
        duplicate_keys: List[str] = []

        for idx, data in enumerate(applications_data):
            try:
                idempotency_key = data.get("idempotency_key") or IdempotencyService.generate_key(data)
                existing = IdempotencyService.find_by_key(db, idempotency_key)
                
                if existing:
                    duplicate_keys.append(idempotency_key)
                    if existing.status in {RecordStatus.DRAFT, RecordStatus.REJECTED}:
                        ImportService._update_application(db, existing, data, current_user)
                        updated += 1
                    else:
                        skipped += 1
                    continue
                
                application = ImportService._create_application(db, data, idempotency_key, current_user)
                created += 1
                
            except Exception as e:
                errors.append(f"第{idx+1}条数据: {str(e)}")
                continue

        db.commit()
        
        return ImportResult(
            total=len(applications_data),
            created=created,
            updated=updated,
            skipped=skipped,
            errors=errors,
            duplicate_keys=duplicate_keys
        )

    @staticmethod
    def _create_application(
        db: Session,
        data: Dict[str, Any],
        idempotency_key: str,
        current_user: User
    ) -> ReturnApplication:
        application = ReturnApplication(
            application_no=data["application_no"],
            batch_no=data["batch_no"],
            sku_code=data["sku_code"],
            sku_name=data["sku_name"],
            supplier_id=data["supplier_id"],
            supplier_name=data["supplier_name"],
            supplier_contact=data.get("supplier_contact"),
            supplier_phone=data.get("supplier_phone"),
            return_quantity=data["return_quantity"],
            return_reason=data.get("return_reason"),
            application_date=datetime.fromisoformat(data["application_date"].replace("Z", "+00:00"))
            if isinstance(data["application_date"], str) else data["application_date"],
            applicant=data["applicant"],
            warehouse_id=data["warehouse_id"],
            warehouse_name=data["warehouse_name"],
            idempotency_key=idempotency_key,
            created_by=current_user.id,
            raw_data=data
        )
        db.add(application)
        db.flush()

        for photo_data in data.get("inspection_photos", []):
            photo = InspectionPhoto(
                application_id=application.id,
                **photo_data
            )
            db.add(photo)

        for receipt_data in data.get("logistics_receipts", []):
            receipt = LogisticsReceipt(
                application_id=application.id,
                **receipt_data
            )
            db.add(receipt)

        db.flush()
        
        dirty_records = DirtyRecordDetector.detect_all(db, application, data)
        for dr in dirty_records:
            db.add(dr)

        LedgerService.create_or_update_ledger(db, application)

        audit_log = AuditLog(
            application_id=application.id,
            user_id=current_user.id,
            action="create",
            changed_fields={"application_no": application.application_no}
        )
        db.add(audit_log)

        return application

    @staticmethod
    def _update_application(
        db: Session,
        application: ReturnApplication,
        data: Dict[str, Any],
        current_user: User
    ):
        changed_fields = {}
        
        for field in ["batch_no", "sku_code", "sku_name", "supplier_id", "supplier_name",
                      "supplier_contact", "supplier_phone", "return_quantity", "return_reason",
                      "applicant", "warehouse_id", "warehouse_name"]:
            old_value = getattr(application, field)
            new_value = data.get(field)
            if new_value is not None and old_value != new_value:
                setattr(application, field, new_value)
                changed_fields[field] = {"old": old_value, "new": new_value}

        application.updated_by = current_user.id
        application.raw_data = data

        if changed_fields:
            audit_log = AuditLog(
                application_id=application.id,
                user_id=current_user.id,
                action="update",
                changed_fields=changed_fields
            )
            db.add(audit_log)
        
        for dr in application.dirty_records:
            db.delete(dr)
        db.flush()
        
        dirty_records = DirtyRecordDetector.detect_all(db, application, data)
        for dr in dirty_records:
            db.add(dr)
        
        LedgerService.create_or_update_ledger(db, application)
