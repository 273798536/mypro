from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime, timedelta
import uuid
from . import models, schemas
from .models import WorkflowStatus, DuplicateStrategy, TaskStatus, UserRole


SENSITIVE_FIELDS = ["store_phone", "receiver_phone", "receiver_id_card", "driver_phone"]


def create_user(db: Session, user: schemas.UserCreate):
    db_user = models.User(**user.model_dump())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()


def create_audit_log(db: Session, audit_log: schemas.AuditLogCreate):
    db_audit = models.AuditLog(**audit_log.model_dump())
    db.add(db_audit)
    db.commit()
    db.refresh(db_audit)
    return db_audit


def create_change_history(db: Session, change: schemas.ChangeHistoryCreate):
    db_change = models.ChangeHistory(**change.model_dump())
    db.add(db_change)
    db.commit()
    db.refresh(db_change)
    return db_change


def desensitize_data(data: dict, role: UserRole) -> dict:
    if role in [UserRole.AREA_MANAGER, UserRole.AUDITOR, UserRole.ADMIN]:
        return data
    
    result = data.copy()
    for field in SENSITIVE_FIELDS:
        if field in result and result[field]:
            value = str(result[field])
            if len(value) > 4:
                result[field] = value[:2] + "*" * (len(value) - 4) + value[-2:]
            else:
                result[field] = "*" * len(value)
    return result


def create_store_order(db: Session, order: schemas.StoreOrderCreate):
    existing = db.query(models.StoreOrder).filter(
        models.StoreOrder.order_no == order.order_no
    ).first()
    
    if existing:
        if order.duplicate_strategy == DuplicateStrategy.IGNORE:
            return existing, "ignored"
        elif order.duplicate_strategy == DuplicateStrategy.OVERWRITE:
            for key, value in order.model_dump(exclude_unset=True).items():
                if key != "created_by" and key != "change_reason" and key != "duplicate_strategy" and key != "order_no":
                    old_value = getattr(existing, key)
                    if old_value != value:
                        setattr(existing, key, value)
                        is_sensitive = key in SENSITIVE_FIELDS
                        create_change_history(db, schemas.ChangeHistoryCreate(
                            order_id=existing.id,
                            batch_no=existing.batch_no,
                            field_name=key,
                            old_value=str(old_value) if old_value else None,
                            new_value=str(value) if value else None,
                            changed_by=order.created_by,
                            change_reason=order.change_reason or "覆盖更新",
                            is_sensitive_field=is_sensitive
                        ))
            db.commit()
            db.refresh(existing)
            create_audit_log(db, schemas.AuditLogCreate(
                operator_id=order.created_by,
                operation_type="overwrite",
                target_type="store_order",
                target_id=existing.id,
                batch_no=existing.batch_no,
                change_reason=order.change_reason or "覆盖更新"
            ))
            return existing, "overwritten"
        elif order.duplicate_strategy == DuplicateStrategy.APPEND:
            append_count = db.query(models.StoreOrder).filter(
                models.StoreOrder.order_no.like(f"{order.order_no}-APPEND-%")
            ).count() + 1
            new_order_no = f"{order.order_no}-APPEND-{append_count}"
            order_data = order.model_dump(exclude={"change_reason", "duplicate_strategy"})
            order_data["order_no"] = new_order_no
            db_order = models.StoreOrder(**order_data)
            db.add(db_order)
            db.commit()
            db.refresh(db_order)
            create_change_history(db, schemas.ChangeHistoryCreate(
                order_id=db_order.id,
                batch_no=db_order.batch_no,
                field_name="order_no",
                old_value=order.order_no,
                new_value=new_order_no,
                changed_by=order.created_by,
                change_reason=order.change_reason or f"追加记录，原单号{order.order_no}",
                is_sensitive_field=False
            ))
            create_audit_log(db, schemas.AuditLogCreate(
                operator_id=order.created_by,
                operation_type="append",
                target_type="store_order",
                target_id=db_order.id,
                batch_no=db_order.batch_no,
                new_value={"order_no": new_order_no, "original_order_no": order.order_no},
                change_reason=order.change_reason or f"追加记录，原单号{order.order_no}"
            ))
            return db_order, "appended"
    
    order_data = order.model_dump(exclude={"change_reason", "duplicate_strategy"})
    db_order = models.StoreOrder(**order_data)
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    
    create_audit_log(db, schemas.AuditLogCreate(
        operator_id=order.created_by,
        operation_type="create",
        target_type="store_order",
        target_id=db_order.id,
        batch_no=db_order.batch_no,
        new_value={"order_no": db_order.order_no, "store_name": db_order.store_name},
        change_reason=order.change_reason or "新建订单"
    ))
    return db_order, "created"


def desensitize_order(order: models.StoreOrder, role: UserRole):
    if role in [UserRole.AREA_MANAGER, UserRole.AUDITOR, UserRole.ADMIN]:
        return order
    
    for field in SENSITIVE_FIELDS:
        if hasattr(order, field):
            value = getattr(order, field)
            if value:
                value_str = str(value)
                if len(value_str) > 4:
                    masked = value_str[:2] + "*" * (len(value_str) - 4) + value_str[-2:]
                else:
                    masked = "*" * len(value_str)
                setattr(order, field, masked)
    return order


def get_store_order(db: Session, order_id: int, role: UserRole = UserRole.ADMIN):
    order = db.query(models.StoreOrder).filter(models.StoreOrder.id == order_id).first()
    if order:
        order = desensitize_order(order, role)
    return order


def get_store_orders_by_batch(db: Session, batch_no: str, role: UserRole = UserRole.ADMIN):
    orders = db.query(models.StoreOrder).filter(models.StoreOrder.batch_no == batch_no).all()
    for i in range(len(orders)):
        orders[i] = desensitize_order(orders[i], role)
    return orders


def update_store_order(db: Session, order_id: int, order_update: schemas.StoreOrderUpdate, operator_id: int):
    db_order = db.query(models.StoreOrder).filter(models.StoreOrder.id == order_id).first()
    if not db_order:
        return None
    
    update_data = order_update.model_dump(exclude_unset=True, exclude={"change_reason"})
    
    for key, value in update_data.items():
        old_value = getattr(db_order, key)
        if old_value != value:
            is_sensitive = key in SENSITIVE_FIELDS
            create_change_history(db, schemas.ChangeHistoryCreate(
                order_id=db_order.id,
                batch_no=db_order.batch_no,
                field_name=key,
                old_value=str(old_value) if old_value else None,
                new_value=str(value) if value else None,
                changed_by=operator_id,
                change_reason=order_update.change_reason,
                is_sensitive_field=is_sensitive
            ))
            setattr(db_order, key, value)
    
    db.commit()
    db.refresh(db_order)
    
    create_audit_log(db, schemas.AuditLogCreate(
        operator_id=operator_id,
        operation_type="update",
        target_type="store_order",
        target_id=db_order.id,
        batch_no=db_order.batch_no,
        new_value=update_data,
        change_reason=order_update.change_reason
    ))
    return db_order


def update_workflow_status(db: Session, target_type: str, target_id: int, action: str, operator_id: int, change_reason: str = None):
    status_map = {
        "submit": WorkflowStatus.SUBMITTED,
        "reject": WorkflowStatus.REJECTED,
        "second_confirm": WorkflowStatus.SECOND_CONFIRMED,
        "audit_only": WorkflowStatus.AUDIT_ONLY,
        "back_to_draft": WorkflowStatus.DRAFT
    }
    
    new_status = status_map.get(action)
    if not new_status:
        return None
    
    model_map = {
        "store_order": (models.StoreOrder, "status"),
        "trajectory": (models.DriverTrajectory, "workflow_status"),
        "receipt": (models.ReceiptIOU, "workflow_status"),
        "handover": (models.StoreHandover, "workflow_status"),
        "remark": (models.ServiceRemark, "workflow_status")
    }
    
    model_class, status_field = model_map.get(target_type, (None, None))
    if not model_class:
        return None
    
    db_obj = db.query(model_class).filter(model_class.id == target_id).first()
    if not db_obj:
        return None
    
    old_status = getattr(db_obj, status_field)
    setattr(db_obj, status_field, new_status)
    db.commit()
    db.refresh(db_obj)
    
    batch_no = getattr(db_obj, "batch_no", None)
    create_audit_log(db, schemas.AuditLogCreate(
        operator_id=operator_id,
        operation_type=f"workflow_{action}",
        target_type=target_type,
        target_id=target_id,
        batch_no=batch_no,
        old_value={"status": str(old_status)},
        new_value={"status": str(new_status)},
        change_reason=change_reason or f"工作流变更: {action}"
    ))
    
    return db_obj


def create_driver_trajectory(db: Session, trajectory: schemas.DriverTrajectoryCreate):
    existing = db.query(models.DriverTrajectory).filter(
        models.DriverTrajectory.trajectory_no == trajectory.trajectory_no
    ).first()
    if existing:
        return existing, "ignored"
    
    db_traj = models.DriverTrajectory(**trajectory.model_dump())
    db.add(db_traj)
    db.commit()
    db.refresh(db_traj)
    
    create_audit_log(db, schemas.AuditLogCreate(
        operator_id=trajectory.created_by,
        operation_type="create",
        target_type="trajectory",
        target_id=db_traj.id,
        batch_no=db_traj.batch_no,
        new_value={"trajectory_no": db_traj.trajectory_no}
    ))
    return db_traj, "created"


def create_receipt_iou(db: Session, receipt: schemas.ReceiptIOUCreate):
    existing = db.query(models.ReceiptIOU).filter(
        models.ReceiptIOU.receipt_no == receipt.receipt_no
    ).first()
    if existing:
        return existing, "ignored"
    
    db_receipt = models.ReceiptIOU(**receipt.model_dump())
    db.add(db_receipt)
    db.commit()
    db.refresh(db_receipt)
    
    create_audit_log(db, schemas.AuditLogCreate(
        operator_id=receipt.created_by,
        operation_type="create",
        target_type="receipt",
        target_id=db_receipt.id,
        batch_no=db_receipt.batch_no,
        new_value={"receipt_no": db_receipt.receipt_no}
    ))
    return db_receipt, "created"


def create_store_handover(db: Session, handover: schemas.StoreHandoverCreate):
    existing = db.query(models.StoreHandover).filter(
        models.StoreHandover.handover_no == handover.handover_no
    ).first()
    if existing:
        return existing, "ignored"
    
    db_handover = models.StoreHandover(**handover.model_dump())
    db.add(db_handover)
    db.commit()
    db.refresh(db_handover)
    
    create_audit_log(db, schemas.AuditLogCreate(
        operator_id=handover.created_by,
        operation_type="create",
        target_type="handover",
        target_id=db_handover.id,
        batch_no=db_handover.batch_no,
        new_value={"handover_no": db_handover.handover_no}
    ))
    return db_handover, "created"


def create_service_remark(db: Session, remark: schemas.ServiceRemarkCreate):
    existing = db.query(models.ServiceRemark).filter(
        models.ServiceRemark.remark_no == remark.remark_no
    ).first()
    if existing:
        return existing, "ignored"
    
    db_remark = models.ServiceRemark(**remark.model_dump())
    db.add(db_remark)
    db.commit()
    db.refresh(db_remark)
    
    create_audit_log(db, schemas.AuditLogCreate(
        operator_id=remark.created_by,
        operation_type="create",
        target_type="remark",
        target_id=db_remark.id,
        batch_no=db_remark.batch_no,
        new_value={"remark_no": db_remark.remark_no}
    ))
    return db_remark, "created"


def create_async_task(db: Session, task: schemas.AsyncTaskCreate):
    db_task = models.AsyncTask(**task.model_dump())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


def update_async_task_status(db: Session, task_id: str, status: TaskStatus, error_message: str = None, result: dict = None):
    db_task = db.query(models.AsyncTask).filter(models.AsyncTask.task_id == task_id).first()
    if not db_task:
        return None
    
    db_task.status = status
    if error_message:
        db_task.error_message = error_message
    if result:
        db_task.result = result
    
    if status == TaskStatus.WAIT_RETRY:
        db_task.retry_count += 1
        db_task.next_retry_time = datetime.now() + timedelta(minutes=5 * db_task.retry_count)
    elif status == TaskStatus.SUCCESS or status == TaskStatus.PERMANENT_FAILED:
        db_task.completed_at = datetime.now()
    
    db.commit()
    db.refresh(db_task)
    return db_task


def get_failed_tasks(db: Session):
    return db.query(models.AsyncTask).filter(
        models.AsyncTask.status.in_([TaskStatus.WAIT_RETRY, TaskStatus.WAIT_MANUAL, TaskStatus.PERMANENT_FAILED])
    ).all()


def get_audit_logs(db: Session, batch_no: str = None, target_type: str = None, operator_id: int = None):
    query = db.query(models.AuditLog)
    if batch_no:
        query = query.filter(models.AuditLog.batch_no == batch_no)
    if target_type:
        query = query.filter(models.AuditLog.target_type == target_type)
    if operator_id:
        query = query.filter(models.AuditLog.operator_id == operator_id)
    return query.order_by(models.AuditLog.created_at.desc()).all()


def get_change_histories(db: Session, order_id: int = None, batch_no: str = None):
    query = db.query(models.ChangeHistory)
    if order_id:
        query = query.filter(models.ChangeHistory.order_id == order_id)
    if batch_no:
        query = query.filter(models.ChangeHistory.batch_no == batch_no)
    return query.order_by(models.ChangeHistory.created_at.desc()).all()


def get_role_based_view(db: Session, role: UserRole, area: str = None, batch_no: str = None):
    if role == UserRole.AREA_MANAGER:
        orders = db.query(models.StoreOrder).filter(models.StoreOrder.batch_no == batch_no).all() if batch_no else db.query(models.StoreOrder).all()
        audit_logs = get_audit_logs(db, batch_no=batch_no)
        changes = get_change_histories(db, batch_no=batch_no)
        
        sensitive_changes = [c for c in changes if c.is_sensitive_field]
        
        return {
            "summary": {
                "total_orders": len(orders),
                "credit_orders": len([o for o in orders if o.is_credit]),
                "out_of_stock_orders": len([o for o in orders if o.is_out_of_stock]),
                "total_changes": len(changes),
                "sensitive_changes": len(sensitive_changes)
            },
            "orders": orders,
            "audit_logs": audit_logs[:50],
            "change_highlights": sensitive_changes[:20]
        }
    
    return {"message": "View not implemented for this role"}
