from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime
import uuid

from app.models import (
    Batch, MaterialItem, LogisticsReceipt, BorrowRecord,
    SupplementRecord, BatchStatus, IdempotentAction,
    MaterialStatus, OperationType, StateRecord
)
from app.schemas import (
    BatchCreate, BatchUpdate, BatchDataImportRequest,
    MaterialItemCreate, LogisticsReceiptCreate,
    BorrowRecordCreate, SupplementRecordCreate
)
from app.services.audit_service import AuditService
from app.services.state_machine import MaterialStateMachine


class BatchService:
    @staticmethod
    def check_idempotent(db: Session, batch_no: str) -> Tuple[bool, Optional[Batch], str]:
        batch = db.query(Batch).filter(Batch.batch_no == batch_no).first()
        if not batch:
            return False, None, "批次不存在"
        return True, batch, f"批次已存在，处理策略: {batch.idempotent_action}"

    @staticmethod
    def create_batch(db: Session, batch_data: BatchCreate) -> Batch:
        exists, existing_batch, msg = BatchService.check_idempotent(db, batch_data.batch_no)
        if exists:
            if existing_batch.idempotent_action == IdempotentAction.IGNORE:
                return existing_batch
            elif existing_batch.idempotent_action == IdempotentAction.OVERWRITE:
                BatchService._clear_batch_data(db, existing_batch)
                existing_batch.updated_by = batch_data.created_by
                db.commit()
                db.refresh(existing_batch)
                return existing_batch
        
        batch = Batch(
            batch_no=batch_data.batch_no,
            exhibition_name=batch_data.exhibition_name,
            idempotent_action=batch_data.idempotent_action,
            created_by=batch_data.created_by,
            remark=batch_data.remark,
            extra_data=batch_data.extra_data
        )
        db.add(batch)
        db.commit()
        db.refresh(batch)
        
        AuditService.log_operation(
            db=db,
            operation_type=OperationType.CREATE,
            operated_by=batch_data.created_by or "system",
            batch_id=batch.id,
            record_type="batch",
            record_id=batch.id,
            after_data={"batch_no": batch.batch_no, "exhibition_name": batch.exhibition_name},
            change_reason="创建批次"
        )
        
        return batch

    @staticmethod
    def _clear_batch_data(db: Session, batch: Batch):
        db.query(MaterialItem).filter(MaterialItem.batch_id == batch.id).delete()
        db.query(LogisticsReceipt).filter(LogisticsReceipt.batch_id == batch.id).delete()
        db.query(BorrowRecord).filter(BorrowRecord.batch_id == batch.id).delete()
        db.query(SupplementRecord).filter(SupplementRecord.batch_id == batch.id).delete()
        db.query(StateRecord).filter(StateRecord.batch_id == batch.id).delete()
        db.commit()

    @staticmethod
    def get_batch(db: Session, batch_id: int) -> Optional[Batch]:
        return db.query(Batch).filter(Batch.id == batch_id).first()

    @staticmethod
    def get_batch_by_no(db: Session, batch_no: str) -> Optional[Batch]:
        return db.query(Batch).filter(Batch.batch_no == batch_no).first()

    @staticmethod
    def update_batch(db: Session, batch: Batch, update_data: BatchUpdate) -> Batch:
        before_data = {
            "exhibition_name": batch.exhibition_name,
            "remark": batch.remark
        }
        
        if update_data.exhibition_name:
            batch.exhibition_name = update_data.exhibition_name
        if update_data.remark:
            batch.remark = update_data.remark
        batch.updated_by = update_data.updated_by
        
        db.commit()
        db.refresh(batch)
        
        after_data = {
            "exhibition_name": batch.exhibition_name,
            "remark": batch.remark
        }
        
        AuditService.log_operation(
            db=db,
            operation_type=OperationType.UPDATE,
            operated_by=update_data.updated_by or "system",
            batch_id=batch.id,
            record_type="batch",
            record_id=batch.id,
            before_data=before_data,
            after_data=after_data,
            change_reason="更新批次信息"
        )
        
        return batch

    @staticmethod
    def freeze_batch(db: Session, batch: Batch, reason: str, operated_by: str) -> Batch:
        if batch.is_frozen:
            return batch
        
        before_data = {"is_frozen": False}
        
        batch.is_frozen = True
        batch.frozen_at = datetime.now()
        batch.frozen_by = operated_by
        batch.frozen_reason = reason
        batch.status = BatchStatus.FROZEN
        
        db.commit()
        db.refresh(batch)
        
        MaterialStateMachine.record_freeze_snapshot(db, batch, operated_by)
        
        after_data = {"is_frozen": True, "frozen_reason": reason}
        
        AuditService.log_operation(
            db=db,
            operation_type=OperationType.FREEZE,
            operated_by=operated_by,
            batch_id=batch.id,
            record_type="batch",
            record_id=batch.id,
            before_data=before_data,
            after_data=after_data,
            change_reason=reason
        )
        
        return batch

    @staticmethod
    def unfreeze_batch(db: Session, batch: Batch, reason: str, operated_by: str) -> Batch:
        if not batch.is_frozen:
            return batch
        
        before_data = {"is_frozen": True}
        
        batch.is_frozen = False
        batch.unfrozen_at = datetime.now()
        batch.unfrozen_by = operated_by
        batch.unfrozen_reason = reason
        batch.status = BatchStatus.PROCESSING
        
        db.commit()
        db.refresh(batch)
        
        after_data = {"is_frozen": False, "unfrozen_reason": reason}
        
        AuditService.log_operation(
            db=db,
            operation_type=OperationType.UNFREEZE,
            operated_by=operated_by,
            batch_id=batch.id,
            record_type="batch",
            record_id=batch.id,
            before_data=before_data,
            after_data=after_data,
            change_reason=reason
        )
        
        return batch

    @staticmethod
    def archive_batch(db: Session, batch: Batch, operated_by: str) -> Batch:
        batch.status = BatchStatus.ARCHIVED
        
        db.commit()
        db.refresh(batch)
        
        AuditService.log_operation(
            db=db,
            operation_type=OperationType.ARCHIVE,
            operated_by=operated_by,
            batch_id=batch.id,
            record_type="batch",
            record_id=batch.id,
            after_data={"status": BatchStatus.ARCHIVED},
            change_reason="撤回归档"
        )
        
        return batch

    @staticmethod
    def import_batch_data(
        db: Session,
        batch: Batch,
        import_data: BatchDataImportRequest
    ) -> Dict[str, Any]:
        if batch.is_frozen:
            raise ValueError("批次已冻结，无法导入数据")
        
        results = {
            "materials_added": 0,
            "materials_skipped": 0,
            "logistics_added": 0,
            "borrow_records_added": 0,
            "supplements_added": 0
        }
        
        material_map = {}
        
        for mat_data in import_data.materials:
            existing = db.query(MaterialItem).filter(
                MaterialItem.batch_id == batch.id,
                MaterialItem.material_code == mat_data.material_code
            ).first()
            
            if existing and batch.idempotent_action == IdempotentAction.IGNORE:
                results["materials_skipped"] += 1
                material_map[mat_data.material_code] = existing
                continue
            
            if existing and batch.idempotent_action == IdempotentAction.OVERWRITE:
                existing.material_name = mat_data.material_name
                existing.category = mat_data.category
                existing.quantity = mat_data.quantity
                existing.unit = mat_data.unit
                existing.warehouse_location = mat_data.warehouse_location
                db.commit()
                db.refresh(existing)
                material_map[mat_data.material_code] = existing
                results["materials_added"] += 1
            elif existing and batch.idempotent_action == IdempotentAction.APPEND:
                results["materials_skipped"] += 1
                material_map[mat_data.material_code] = existing
                continue
            else:
                material = MaterialItem(
                    batch_id=batch.id,
                    material_code=mat_data.material_code,
                    material_name=mat_data.material_name,
                    category=mat_data.category,
                    quantity=mat_data.quantity,
                    unit=mat_data.unit,
                    warehouse_location=mat_data.warehouse_location,
                    status=MaterialStatus.IN_TRANSIT
                )
                db.add(material)
                db.commit()
                db.refresh(material)
                material_map[mat_data.material_code] = material
                results["materials_added"] += 1
                
                AuditService.log_operation(
                    db=db,
                    operation_type=OperationType.CREATE,
                    operated_by=import_data.imported_by or "system",
                    batch_id=batch.id,
                    record_type="material",
                    record_id=material.id,
                    after_data={"material_code": mat_data.material_code, "material_name": mat_data.material_name},
                    change_reason="导入物料清单"
                )
        if batch.idempotent_action == IdempotentAction.OVERWRITE:
            db.query(LogisticsReceipt).filter(LogisticsReceipt.batch_id == batch.id).delete()
            db.query(BorrowRecord).filter(BorrowRecord.batch_id == batch.id).delete()
            db.query(SupplementRecord).filter(SupplementRecord.batch_id == batch.id).delete()
            db.commit()
        
        for log_data in import_data.logistics:
            material = material_map.get(log_data.material_code)
            if not material:
                continue
            
            receipt = LogisticsReceipt(
                batch_id=batch.id,
                material_id=material.id,
                waybill_no=log_data.waybill_no,
                sender=log_data.sender,
                receiver=log_data.receiver,
                send_time=log_data.send_time,
                receive_time=log_data.receive_time,
                is_received=log_data.is_received,
                received_quantity=log_data.received_quantity,
                damaged_quantity=log_data.damaged_quantity,
                receiver_signature=log_data.receiver_signature,
                receipt_remark=log_data.receipt_remark,
                images=log_data.images
            )
            db.add(receipt)
            
            if log_data.is_received and batch.idempotent_action != IdempotentAction.APPEND:
                MaterialStateMachine.transition(
                    db=db,
                    material=material,
                    to_status=MaterialStatus.RECEIVED,
                    changed_by=import_data.imported_by or "system",
                    reason="物流签收",
                    change_source="logistics_import"
                )
            elif log_data.is_received and batch.idempotent_action == IdempotentAction.APPEND:
                if material.status == MaterialStatus.IN_TRANSIT:
                    MaterialStateMachine.transition(
                        db=db,
                        material=material,
                        to_status=MaterialStatus.RECEIVED,
                        changed_by=import_data.imported_by or "system",
                        reason="物流签收",
                        change_source="logistics_import"
                    )
            
            results["logistics_added"] += 1
        
        db.commit()
        
        for borrow_data in import_data.borrow_records:
            material = material_map.get(borrow_data.material_code)
            if not material:
                continue
            
            borrow = BorrowRecord(
                batch_id=batch.id,
                material_id=material.id,
                borrower=borrow_data.borrower,
                borrower_phone=borrow_data.borrower_phone,
                borrower_department=borrow_data.borrower_department,
                borrow_time=borrow_data.borrow_time,
                expected_return_time=borrow_data.expected_return_time,
                borrow_quantity=borrow_data.borrow_quantity,
                borrow_remark=borrow_data.borrow_remark,
                witness=borrow_data.witness,
                approval_by=borrow_data.approval_by
            )
            db.add(borrow)
            
            if material.status not in [MaterialStatus.BORROWED, MaterialStatus.LOST]:
                MaterialStateMachine.transition(
                    db=db,
                    material=material,
                    to_status=MaterialStatus.BORROWED,
                    changed_by=import_data.imported_by or "system",
                    reason=f"现场借用: {borrow_data.borrower}",
                    change_source="borrow_import"
                )
            
            if not material.current_holder:
                material.current_holder = borrow_data.borrower
            results["borrow_records_added"] += 1
        
        db.commit()
        
        for sup_data in import_data.supplements:
            supplement = SupplementRecord(
                batch_id=batch.id,
                record_type=sup_data.record_type,
                content=sup_data.content,
                supplementary_by=sup_data.supplementary_by,
                supplementary_time=sup_data.supplementary_time,
                reason=sup_data.reason,
                related_material_codes=sup_data.related_material_codes
            )
            db.add(supplement)
            results["supplements_added"] += 1
        
        db.commit()
        
        batch.status = BatchStatus.PROCESSING
        db.commit()
        
        return results

    @staticmethod
    def list_batches(db: Session, skip: int = 0, limit: int = 100, status: Optional[BatchStatus] = None):
        query = db.query(Batch)
        if status:
            query = query.filter(Batch.status == status)
        return query.order_by(Batch.created_at.desc()).offset(skip).limit(limit).all()
