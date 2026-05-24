import uuid
import json
from datetime import datetime
from sqlalchemy.orm import Session
from . import models, schemas
from .models import BatchStatus, OperationType, ReplayAction


def generate_id():
    return str(uuid.uuid4())


def create_operation_history(db: Session, batch_id: str, operation_type: OperationType,
                              operator: str, from_status: str = None, to_status: str = None,
                              changed_fields: dict = None, remark: str = None):
    history = models.OperationHistory(
        id=generate_id(),
        batch_id=batch_id,
        operation_type=operation_type,
        operator=operator,
        from_status=from_status,
        to_status=to_status,
        changed_fields=json.dumps(changed_fields) if changed_fields else None,
        remark=remark
    )
    db.add(history)
    db.commit()
    return history


def get_batch_by_no(db: Session, batch_no: str):
    return db.query(models.Batch).filter(models.Batch.batch_no == batch_no).first()


def get_batch(db: Session, batch_id: str):
    return db.query(models.Batch).filter(models.Batch.id == batch_id).first()


def get_batches(db: Session, skip: int = 0, limit: int = 100, clinic_code: str = None, status: BatchStatus = None):
    query = db.query(models.Batch)
    if clinic_code:
        query = query.filter(models.Batch.clinic_code == clinic_code)
    if status:
        query = query.filter(models.Batch.status == status)
    return query.offset(skip).limit(limit).all()


def create_batch(db: Session, batch_data: schemas.BatchCreate, operator: str = "system"):
    existing_batch = get_batch_by_no(db, batch_data.batch_no)
    if existing_batch:
        if batch_data.replay_strategy == ReplayAction.IGNORE:
            return existing_batch, "ignore", None
        elif batch_data.replay_strategy == ReplayAction.OVERWRITE:
            old_data = {
                "status": existing_batch.status.value,
                "implants_count": len(existing_batch.implants),
                "appointments_count": len(existing_batch.appointments)
            }
            db.query(models.Implant).filter(models.Implant.batch_id == existing_batch.id).delete()
            db.query(models.Appointment).filter(models.Appointment.batch_id == existing_batch.id).delete()
            db.query(models.Invoice).filter(models.Invoice.batch_id == existing_batch.id).delete()
            db.query(models.HandoverPaper).filter(models.HandoverPaper.batch_id == existing_batch.id).delete()
            
            for implant_data in batch_data.implants:
                implant = models.Implant(
                    id=generate_id(),
                    batch_id=existing_batch.id,
                    **implant_data.model_dump(),
                    original_model=implant_data.implant_model
                )
                db.add(implant)
            
            for apt_data in batch_data.appointments:
                apt = models.Appointment(
                    id=generate_id(),
                    batch_id=existing_batch.id,
                    **apt_data.model_dump()
                )
                db.add(apt)
            
            for inv_data in batch_data.invoices:
                inv = models.Invoice(
                    id=generate_id(),
                    batch_id=existing_batch.id,
                    **inv_data.model_dump()
                )
                db.add(inv)
            
            for hp_data in batch_data.handover_papers:
                hp = models.HandoverPaper(
                    id=generate_id(),
                    batch_id=existing_batch.id,
                    **hp_data.model_dump()
                )
                db.add(hp)
            
            create_operation_history(
                db, existing_batch.id, OperationType.REPLAY, operator,
                from_status=existing_batch.status.value,
                changed_fields={"action": "overwrite", "batch_no": batch_data.batch_no},
                remark=f"批次数据覆写，原{old_data['implants_count']}个种植体，现{len(batch_data.implants)}个"
            )
            db.commit()
            db.refresh(existing_batch)
            return existing_batch, "overwrite", old_data
        elif batch_data.replay_strategy == ReplayAction.APPEND:
            for implant_data in batch_data.implants:
                existing_implant = db.query(models.Implant).filter(
                    models.Implant.batch_id == existing_batch.id,
                    models.Implant.implant_id == implant_data.implant_id
                ).first()
                if not existing_implant:
                    implant = models.Implant(
                        id=generate_id(),
                        batch_id=existing_batch.id,
                        **implant_data.model_dump(),
                        original_model=implant_data.implant_model
                    )
                    db.add(implant)
            
            for apt_data in batch_data.appointments:
                existing_apt = db.query(models.Appointment).filter(
                    models.Appointment.batch_id == existing_batch.id,
                    models.Appointment.appointment_no == apt_data.appointment_no
                ).first()
                if not existing_apt:
                    apt = models.Appointment(
                        id=generate_id(),
                        batch_id=existing_batch.id,
                        **apt_data.model_dump()
                    )
                    db.add(apt)
            
            create_operation_history(
                db, existing_batch.id, OperationType.REPLAY, operator,
                from_status=existing_batch.status.value,
                changed_fields={"action": "append", "batch_no": batch_data.batch_no},
                remark="批次数据追加"
            )
            db.commit()
            db.refresh(existing_batch)
            return existing_batch, "append", None

    batch = models.Batch(
        id=generate_id(),
        batch_no=batch_data.batch_no,
        clinic_code=batch_data.clinic_code,
        remark=batch_data.remark,
        customer_service_note=batch_data.customer_service_note,
        replay_strategy=batch_data.replay_strategy
    )
    db.add(batch)
    db.flush()

    for implant_data in batch_data.implants:
        implant = models.Implant(
            id=generate_id(),
            batch_id=batch.id,
            **implant_data.model_dump(),
            original_model=implant_data.implant_model
        )
        db.add(implant)

    for apt_data in batch_data.appointments:
        apt = models.Appointment(
            id=generate_id(),
            batch_id=batch.id,
            **apt_data.model_dump()
        )
        db.add(apt)

    for inv_data in batch_data.invoices:
        inv = models.Invoice(
            id=generate_id(),
            batch_id=batch.id,
            **inv_data.model_dump()
        )
        db.add(inv)

    for hp_data in batch_data.handover_papers:
        hp = models.HandoverPaper(
            id=generate_id(),
            batch_id=batch.id,
            **hp_data.model_dump()
        )
        db.add(hp)

    create_operation_history(
        db, batch.id, OperationType.CREATE, operator,
        to_status=BatchStatus.DRAFT.value,
        remark=f"创建批次，含{len(batch_data.implants)}个种植体，{len(batch_data.appointments)}条预约"
    )

    db.commit()
    db.refresh(batch)
    return batch, "create", None


def update_batch(db: Session, batch_id: str, batch_update: schemas.BatchUpdate, operator: str):
    batch = get_batch(db, batch_id)
    if not batch:
        return None
    
    if batch.is_frozen:
        raise ValueError("批次已冻结，无法修改")

    changed_fields = {}
    update_data = batch_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        old_value = getattr(batch, field)
        if old_value != value:
            changed_fields[field] = {"old": str(old_value), "new": str(value)}
            setattr(batch, field, value)

    if changed_fields:
        create_operation_history(
            db, batch.id, OperationType.MODIFY, operator,
            changed_fields=changed_fields,
            remark="批次信息更新"
        )
        db.commit()
        db.refresh(batch)

    return batch


def submit_batch(db: Session, batch_id: str, operator: str):
    batch = get_batch(db, batch_id)
    if not batch:
        return None
    
    if batch.is_frozen:
        raise ValueError("批次已冻结，无法提交")

    allowed_statuses = [BatchStatus.DRAFT, BatchStatus.WITHDRAWN, BatchStatus.REJECTED]
    if batch.status not in allowed_statuses:
        raise ValueError(f"当前状态{batch.status.value}不允许提交")

    old_status = batch.status.value
    batch.status = BatchStatus.SUBMITTED
    batch.submitter = operator
    batch.submit_time = datetime.now()

    create_operation_history(
        db, batch.id, OperationType.SUBMIT, operator,
        from_status=old_status,
        to_status=BatchStatus.SUBMITTED.value,
        remark="批次提交审核"
    )

    db.commit()
    db.refresh(batch)
    return batch


def withdraw_batch(db: Session, batch_id: str, operator: str, reason: str):
    batch = get_batch(db, batch_id)
    if not batch:
        return None
    
    if batch.is_frozen:
        raise ValueError("批次已冻结，无法撤回")

    if batch.status not in [BatchStatus.SUBMITTED, BatchStatus.PARTIAL_FAILED]:
        raise ValueError(f"当前状态{batch.status.value}不允许撤回")

    old_status = batch.status.value
    batch.status = BatchStatus.WITHDRAWN

    create_operation_history(
        db, batch.id, OperationType.WITHDRAW, operator,
        from_status=old_status,
        to_status=BatchStatus.WITHDRAWN.value,
        remark=f"撤回批次，原因：{reason}"
    )

    db.commit()
    db.refresh(batch)
    return batch


def verify_batch(db: Session, batch_id: str, operator: str, is_pass: bool, reject_reason: str = None):
    batch = get_batch(db, batch_id)
    if not batch:
        return None
    
    if batch.is_frozen:
        raise ValueError("批次已冻结，无法审核")

    if batch.status != BatchStatus.SUBMITTED:
        raise ValueError(f"当前状态{batch.status.value}不允许审核")

    old_status = batch.status.value
    
    if is_pass:
        batch.status = BatchStatus.VERIFIED
        batch.verifier = operator
        batch.verify_time = datetime.now()
        remark = "审核通过"
        op_type = OperationType.VERIFY
    else:
        batch.status = BatchStatus.REJECTED
        remark = f"审核驳回，原因：{reject_reason or '未说明'}"
        op_type = OperationType.REJECT

    create_operation_history(
        db, batch.id, op_type, operator,
        from_status=old_status,
        to_status=batch.status.value,
        remark=remark
    )

    db.commit()
    db.refresh(batch)
    return batch


def manual_judge(db: Session, batch_id: str, operator: str, new_status: BatchStatus, judge_reason: str):
    batch = get_batch(db, batch_id)
    if not batch:
        return None
    
    if batch.is_frozen:
        raise ValueError("批次已冻结，无法改判")

    old_status = batch.status.value
    batch.status = new_status

    create_operation_history(
        db, batch.id, OperationType.JUDGE, operator,
        from_status=old_status,
        to_status=new_status.value,
        changed_fields={"judge_reason": judge_reason},
        remark=f"人工改判，原因：{judge_reason}"
    )

    db.commit()
    db.refresh(batch)
    return batch


def freeze_batch(db: Session, batch_id: str, operator: str, freeze_reason: str):
    batch = get_batch(db, batch_id)
    if not batch:
        return None

    if batch.is_frozen:
        raise ValueError("批次已冻结")

    batch.is_frozen = True
    batch.freeze_time = datetime.now()
    batch.frozen_by = operator

    create_operation_history(
        db, batch.id, OperationType.FREEZE, operator,
        from_status=batch.status.value,
        changed_fields={"is_frozen": True, "freeze_reason": freeze_reason},
        remark=f"冻结批次，原因：{freeze_reason}"
    )

    db.commit()
    db.refresh(batch)
    return batch


def unfreeze_batch(db: Session, batch_id: str, operator: str):
    batch = get_batch(db, batch_id)
    if not batch:
        return None

    if not batch.is_frozen:
        raise ValueError("批次未冻结")

    batch.is_frozen = False

    create_operation_history(
        db, batch.id, OperationType.MODIFY, operator,
        from_status=batch.status.value,
        changed_fields={"is_frozen": False},
        remark="解冻批次"
    )

    db.commit()
    db.refresh(batch)
    return batch


def mark_exported(db: Session, batch_id: str, operator: str):
    batch = get_batch(db, batch_id)
    if not batch:
        return None

    if not batch.is_frozen:
        raise ValueError("批次未冻结，导出前请先冻结")

    old_status = batch.status.value
    batch.status = BatchStatus.EXPORTED
    batch.export_time = datetime.now()
    batch.exported_by = operator

    create_operation_history(
        db, batch.id, OperationType.EXPORT, operator,
        from_status=old_status,
        to_status=BatchStatus.EXPORTED.value,
        remark="批次已导出"
    )

    db.commit()
    db.refresh(batch)
    return batch


def reconcile_batch(db: Session, batch_id: str, operator: str):
    batch = get_batch(db, batch_id)
    if not batch:
        return None

    unmatched = []
    implants_map = {i.implant_id: i for i in batch.implants}
    appointments_map = {a.appointment_no: a for a in batch.appointments}

    for apt in batch.appointments:
        if apt.implant_used and apt.implant_used not in implants_map:
            unmatched.append({
                "type": "appointment",
                "no": apt.appointment_no,
                "issue": f"使用的种植体{apt.implant_used}不在批次中"
            })

    for implant in batch.implants:
        used = any(a.implant_used == implant.implant_id for a in batch.appointments)
        if not used:
            unmatched.append({
                "type": "implant",
                "id": implant.implant_id,
                "issue": "种植体未关联到任何预约"
            })
        
        if implant.is_model_changed:
            related_apt = next((a for a in batch.appointments if a.implant_used == implant.implant_id), None)
            if related_apt and not related_apt.medical_record_updated:
                unmatched.append({
                    "type": "consistency",
                    "id": implant.implant_id,
                    "issue": "型号变更后病历未更新"
                })
            if not implant.inventory_deducted:
                unmatched.append({
                    "type": "consistency",
                    "id": implant.implant_id,
                    "issue": "型号变更后库存未扣减"
                })

    old_status = batch.status.value
    if unmatched:
        batch.status = BatchStatus.PARTIAL_FAILED
        remark = f"对账发现{len(unmatched)}个异常"
    else:
        batch.status = BatchStatus.RECONCILED
        remark = "对账完成，全部匹配"

    create_operation_history(
        db, batch.id, OperationType.VERIFY, operator,
        from_status=old_status,
        to_status=batch.status.value,
        changed_fields={"unmatched_count": len(unmatched)},
        remark=remark
    )

    db.commit()
    db.refresh(batch)

    return {
        "batch_no": batch.batch_no,
        "total_implants": len(batch.implants),
        "total_appointments": len(batch.appointments),
        "total_invoices": len(batch.invoices),
        "matched_implants": len(batch.implants) - len([u for u in unmatched if u["type"] == "implant"]),
        "matched_appointments": len(batch.appointments) - len([u for u in unmatched if u["type"] == "appointment"]),
        "unmatched_items": unmatched,
        "is_success": len(unmatched) == 0
    }


def get_operation_history(db: Session, batch_id: str):
    return db.query(models.OperationHistory).filter(
        models.OperationHistory.batch_id == batch_id
    ).order_by(models.OperationHistory.operation_time.desc()).all()


def deducted_inventory(db: Session, implant_id: str, operator: str):
    implant = db.query(models.Implant).filter(models.Implant.id == implant_id).first()
    if not implant:
        return None
    
    implant.inventory_deducted = True
    implant.deduction_time = datetime.now()
    implant.deduction_operator = operator
    
    db.commit()
    db.refresh(implant)
    return implant


def update_medical_record(db: Session, appointment_id: str, operator: str):
    apt = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not apt:
        return None
    
    apt.medical_record_updated = True
    apt.record_update_time = datetime.now()
    
    db.commit()
    db.refresh(apt)
    return apt
