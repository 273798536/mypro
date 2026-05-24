from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy.orm import Session
import uuid
import hashlib
from datetime import datetime

from app.core.constants import (
    BatchStatus,
    RecordStatus,
    OperationType,
    DuplicateStrategy,
)
from app.models import (
    Batch,
    InspectionRecord,
    CalibrationCertificate,
    RepairQuote,
    PriceAdjustment,
    Device,
)
from app.schemas import BatchCreate, BatchUpdate
from app.services.audit_service import AuditService
from app.services.state_machine import StateMachineService


class BatchService:
    def __init__(self, db: Session):
        self.db = db
        self.audit_service = AuditService(db)
        self.state_machine = StateMachineService(db)
    
    def create_batch(self, batch_data: BatchCreate) -> Batch:
        batch = Batch(
            id=str(uuid.uuid4()),
            batch_no=batch_data.batch_no,
            name=batch_data.name,
            description=batch_data.description,
            department=batch_data.department,
            operator=batch_data.operator,
            status=BatchStatus.DRAFT,
            duplicate_strategy=batch_data.duplicate_strategy,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        self.db.add(batch)
        
        self.audit_service.log_operation(
            batch_id=batch.id,
            operation_type=OperationType.BATCH_CREATE,
            operator=batch.operator,
            before_data=None,
            after_data={
                "batch_no": batch.batch_no,
                "name": batch.name,
                "department": batch.department,
            },
            change_reason="创建批次",
        )
        
        self.db.commit()
        self.db.refresh(batch)
        return batch
    
    def get_batch(self, batch_id: str) -> Optional[Batch]:
        return (
            self.db.query(Batch)
            .filter(Batch.id == batch_id, Batch.is_deleted == False)
            .first()
        )
    
    def get_batch_by_no(self, batch_no: str) -> Optional[Batch]:
        return (
            self.db.query(Batch)
            .filter(Batch.batch_no == batch_no, Batch.is_deleted == False)
            .first()
        )
    
    def list_batches(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[BatchStatus] = None,
        department: Optional[str] = None,
    ) -> Tuple[List[Batch], int]:
        query = self.db.query(Batch).filter(Batch.is_deleted == False)
        
        if status:
            query = query.filter(Batch.status == status)
        if department:
            query = query.filter(Batch.department == department)
        
        total = query.count()
        batches = query.order_by(Batch.created_at.desc()).offset(skip).limit(limit).all()
        
        return batches, total
    
    def update_batch(self, batch: Batch, update_data: BatchUpdate, operator: str) -> Batch:
        before_data = {
            "name": batch.name,
            "description": batch.description,
            "department": batch.department,
            "duplicate_strategy": batch.duplicate_strategy,
        }
        
        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(batch, field, value)
        
        batch.updated_at = datetime.now()
        
        after_data = {
            "name": batch.name,
            "description": batch.description,
            "department": batch.department,
            "duplicate_strategy": batch.duplicate_strategy,
        }
        
        self.audit_service.log_operation(
            batch_id=batch.id,
            operation_type=OperationType.BATCH_UPDATE,
            operator=operator,
            before_data=before_data,
            after_data=after_data,
            change_reason="更新批次信息",
        )
        
        self.db.commit()
        self.db.refresh(batch)
        return batch
    
    def submit_for_review(self, batch: Batch, operator: str) -> Tuple[bool, str]:
        return self.state_machine.transition_batch(
            batch=batch,
            target_status=BatchStatus.PENDING_REVIEW,
            operator=operator,
            reason="提交审核",
        )
    
    def start_review(self, batch: Batch, operator: str) -> Tuple[bool, str]:
        return self.state_machine.transition_batch(
            batch=batch,
            target_status=BatchStatus.REVIEWING,
            operator=operator,
            reason="开始复核",
        )
    
    def approve_batch(self, batch: Batch, operator: str, reason: Optional[str] = None) -> Tuple[bool, str]:
        batch.review_operator = operator
        batch.review_time = datetime.now()
        batch.review_reason = reason or "审核通过"
        
        return self.state_machine.transition_batch(
            batch=batch,
            target_status=BatchStatus.APPROVED,
            operator=operator,
            reason=reason or "审核通过",
        )
    
    def reject_batch(self, batch: Batch, operator: str, reason: str) -> Tuple[bool, str]:
        batch.review_operator = operator
        batch.review_time = datetime.now()
        batch.review_reason = reason
        
        return self.state_machine.transition_batch(
            batch=batch,
            target_status=BatchStatus.REJECTED,
            operator=operator,
            reason=reason,
        )
    
    def freeze_batch(self, batch: Batch, operator: str, reason: str) -> Tuple[bool, str]:
        return self.state_machine.transition_batch(
            batch=batch,
            target_status=BatchStatus.FROZEN,
            operator=operator,
            reason=reason,
        )
    
    def settle_batch(self, batch: Batch, operator: str, reason: Optional[str] = None) -> Tuple[bool, str]:
        return self.state_machine.transition_batch(
            batch=batch,
            target_status=BatchStatus.SETTLED,
            operator=operator,
            reason=reason or "结算完成",
        )
    
    def archive_batch(self, batch: Batch, operator: str) -> Tuple[bool, str]:
        return self.state_machine.transition_batch(
            batch=batch,
            target_status=BatchStatus.ARCHIVED,
            operator=operator,
            reason="归档",
        )
    
    def cancel_batch(self, batch: Batch, operator: str, reason: str) -> Tuple[bool, str]:
        return self.state_machine.transition_batch(
            batch=batch,
            target_status=BatchStatus.CANCELLED,
            operator=operator,
            reason=reason,
        )
    
    def unfreeze_batch(self, batch: Batch, operator: str, reason: str) -> Tuple[bool, str]:
        return self.state_machine.transition_batch(
            batch=batch,
            target_status=BatchStatus.DRAFT,
            operator=operator,
            reason=reason,
        )
    
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
    
    def update_batch_stats(self, batch: Batch) -> None:
        record_count = (
            self.db.query(InspectionRecord)
            .filter(InspectionRecord.batch_id == batch.id, InspectionRecord.is_deleted == False)
            .count()
        )
        abnormal_count = (
            self.db.query(InspectionRecord)
            .filter(
                InspectionRecord.batch_id == batch.id,
                InspectionRecord.is_deleted == False,
                InspectionRecord.status != RecordStatus.NORMAL,
            )
            .count()
        )
        batch.record_count = record_count
        batch.abnormal_count = abnormal_count
        batch.updated_at = datetime.now()
        self.db.flush()
