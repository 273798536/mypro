from sqlalchemy.orm import Session
from typing import Optional, Tuple
from datetime import datetime

from app.models import (
    Batch, MaterialItem, StateRecord, MaterialStatus,
    BatchStatus, OperationType, DeviceTracking
)
from app.services.audit_service import AuditService


class MaterialStateMachine:
    VALID_TRANSITIONS = {
        MaterialStatus.IN_TRANSIT: [
            MaterialStatus.RECEIVED,
            MaterialStatus.LOST,
            MaterialStatus.DAMAGED
        ],
        MaterialStatus.RECEIVED: [
            MaterialStatus.BORROWED,
            MaterialStatus.RETURNED,
            MaterialStatus.LOST,
            MaterialStatus.DAMAGED
        ],
        MaterialStatus.BORROWED: [
            MaterialStatus.RETURNED,
            MaterialStatus.LOST,
            MaterialStatus.DAMAGED
        ],
        MaterialStatus.RETURNED: [
            MaterialStatus.BORROWED,
            MaterialStatus.SETTLED,
            MaterialStatus.LOST
        ],
        MaterialStatus.LOST: [
            MaterialStatus.RETURNED,
            MaterialStatus.SETTLED
        ],
        MaterialStatus.DAMAGED: [
            MaterialStatus.RETURNED,
            MaterialStatus.SETTLED
        ],
        MaterialStatus.SETTLED: []
    }

    @classmethod
    def can_transition(cls, from_status: MaterialStatus, to_status: MaterialStatus) -> bool:
        return to_status in cls.VALID_TRANSITIONS.get(from_status, [])

    @classmethod
    def transition(
        cls,
        db: Session,
        material: MaterialItem,
        to_status: MaterialStatus,
        changed_by: str,
        reason: str,
        change_source: str = "manual",
        is_overrule: bool = False
    ) -> Tuple[bool, str]:
        from_status = material.status
        
        if not is_overrule and not cls.can_transition(from_status, to_status):
            return False, f"无效的状态转换: {from_status} -> {to_status}"
        
        before_data = {"status": from_status}
        
        state_record = StateRecord(
            batch_id=material.batch_id,
            material_id=material.id,
            from_status=from_status,
            to_status=to_status,
            changed_by=changed_by,
            reason=reason,
            change_source=change_source
        )
        db.add(state_record)
        
        material.status = to_status
        db.commit()
        db.refresh(material)
        
        after_data = {"status": to_status}
        AuditService.log_operation(
            db=db,
            operation_type=OperationType.UPDATE,
            operated_by=changed_by,
            batch_id=material.batch_id,
            record_type="material",
            record_id=material.id,
            before_data=before_data,
            after_data=after_data,
            change_reason=reason
        )
        
        return True, "状态转换成功"

    @staticmethod
    def record_freeze_snapshot(db: Session, batch: Batch, operated_by: str):
        for material in batch.materials:
            state_record = StateRecord(
                batch_id=batch.id,
                material_id=material.id,
                from_status=material.status,
                to_status=material.status,
                changed_by=operated_by,
                reason="冻结快照",
                change_source="freeze",
                is_freeze_snapshot=True
            )
            db.add(state_record)
        db.commit()

    @staticmethod
    def get_material_state_history(db: Session, material_id: int):
        return db.query(StateRecord).filter(
            StateRecord.material_id == material_id
        ).order_by(StateRecord.changed_at.desc()).all()


class DeviceTrackingService:
    @staticmethod
    def create_tracking(
        db: Session,
        borrow_record_id: int,
        device_code: str,
        device_name: str,
        last_known_location: Optional[str] = None,
        last_seen_by: Optional[str] = None,
        responsible_person: Optional[str] = None,
        remark: Optional[str] = None
    ) -> DeviceTracking:
        tracking = DeviceTracking(
            borrow_record_id=borrow_record_id,
            device_code=device_code,
            device_name=device_name,
            last_known_location=last_known_location,
            last_seen_time=datetime.now(),
            last_seen_by=last_seen_by,
            responsible_person=responsible_person,
            remark=remark,
            current_status="tracking"
        )
        db.add(tracking)
        db.commit()
        db.refresh(tracking)
        
        AuditService.log_operation(
            db=db,
            operation_type=OperationType.CREATE,
            operated_by=last_seen_by or "system",
            record_type="device_tracking",
            record_id=tracking.id,
            after_data={"device_code": device_code, "device_name": device_name},
            change_reason="创建设备追踪记录"
        )
        
        return tracking

    @staticmethod
    def update_tracking(
        db: Session,
        tracking: DeviceTracking,
        last_known_location: Optional[str] = None,
        last_seen_by: Optional[str] = None,
        current_status: Optional[str] = None,
        responsible_person: Optional[str] = None,
        final_disposition: Optional[str] = None,
        disposition_by: Optional[str] = None,
        remark: Optional[str] = None
    ) -> DeviceTracking:
        before_data = {
            "last_known_location": tracking.last_known_location,
            "current_status": tracking.current_status,
            "responsible_person": tracking.responsible_person,
            "final_disposition": tracking.final_disposition
        }
        
        if last_known_location:
            tracking.last_known_location = last_known_location
            tracking.last_seen_time = datetime.now()
        if last_seen_by:
            tracking.last_seen_by = last_seen_by
        if current_status:
            tracking.current_status = current_status
        if responsible_person:
            tracking.responsible_person = responsible_person
        if final_disposition:
            tracking.final_disposition = final_disposition
            tracking.disposition_time = datetime.now()
            tracking.disposition_by = disposition_by
        if remark:
            tracking.remark = remark
        
        db.commit()
        db.refresh(tracking)
        
        after_data = {
            "last_known_location": tracking.last_known_location,
            "current_status": tracking.current_status,
            "responsible_person": tracking.responsible_person,
            "final_disposition": tracking.final_disposition
        }
        
        AuditService.log_operation(
            db=db,
            operation_type=OperationType.UPDATE,
            operated_by=last_seen_by or disposition_by or "system",
            record_type="device_tracking",
            record_id=tracking.id,
            before_data=before_data,
            after_data=after_data,
            change_reason="更新设备追踪信息"
        )
        
        return tracking
