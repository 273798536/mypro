import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.models import (
    CompensationQueue,
    CompensationStatus,
    FailureType,
    OperationType,
    StateTransition,
    OperationLog,
    ImportRecord
)
from app.schemas.schemas import (
    CompensationQueueCreate,
    CompensationQueueUpdate
)
from app.config import get_settings

settings = get_settings()


def generate_compensation_no() -> str:
    return f"COMP{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:6].upper()}"


def record_state_transition(
    db: Session,
    compensation_id: int,
    from_status: Optional[CompensationStatus],
    to_status: CompensationStatus,
    transition_reason: str,
    operated_by: str = "system",
    extra_info: Optional[dict] = None
) -> StateTransition:
    transition = StateTransition(
        compensation_id=compensation_id,
        from_status=from_status,
        to_status=to_status,
        transition_reason=transition_reason,
        operated_by=operated_by,
        extra_info=extra_info or {}
    )
    db.add(transition)
    db.flush()
    return transition


def record_operation_log(
    db: Session,
    operation_type: OperationType,
    operator: str = "system",
    compensation_id: Optional[int] = None,
    operation_detail: Optional[dict] = None,
    original_data_snapshot: Optional[dict] = None,
    new_data_snapshot: Optional[dict] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> OperationLog:
    log = OperationLog(
        compensation_id=compensation_id,
        operation_type=operation_type,
        operator=operator,
        operation_detail=operation_detail or {},
        original_data_snapshot=original_data_snapshot,
        new_data_snapshot=new_data_snapshot,
        ip_address=ip_address,
        user_agent=user_agent
    )
    db.add(log)
    db.flush()
    return log


def create_compensation(
    db: Session,
    compensation_data: CompensationQueueCreate
) -> CompensationQueue:
    compensation_no = generate_compensation_no()
    
    compensation = CompensationQueue(
        compensation_no=compensation_no,
        import_record_id=compensation_data.import_record_id,
        source_type=compensation_data.source_type,
        check_in_no=compensation_data.check_in_no,
        room_no=compensation_data.room_no,
        guest_name=compensation_data.guest_name,
        amount=compensation_data.amount,
        deposit_amount=compensation_data.deposit_amount or 0,
        invoice_amount=compensation_data.invoice_amount or 0,
        status=CompensationStatus.PENDING,
        retry_count=0,
        max_retry_times=compensation_data.max_retry_times or settings.MAX_RETRY_TIMES,
        extra_data=compensation_data.extra_data or {}
    )
    
    db.add(compensation)
    db.flush()
    
    record_state_transition(
        db,
        compensation_id=compensation.id,
        from_status=None,
        to_status=CompensationStatus.PENDING,
        transition_reason="创建补偿记录",
        operated_by="system"
    )
    
    record_operation_log(
        db,
        operation_type=OperationType.SUBMIT,
        compensation_id=compensation.id,
        operator="system",
        operation_detail={"action": "create", "compensation_no": compensation_no},
        new_data_snapshot={
            "compensation_no": compensation_no,
            "source_type": compensation_data.source_type.value,
            "amount": compensation_data.amount
        }
    )
    
    if compensation_data.import_record_id:
        import_record = db.query(ImportRecord).filter(
            ImportRecord.id == compensation_data.import_record_id
        ).first()
        if import_record:
            import_record.is_used = True
    
    db.commit()
    db.refresh(compensation)
    return compensation


def get_compensation_by_no(db: Session, compensation_no: str) -> Optional[CompensationQueue]:
    return db.query(CompensationQueue).filter(
        CompensationQueue.compensation_no == compensation_no
    ).first()


def process_compensation(
    db: Session,
    compensation_no: str,
    operator: str = "system"
) -> Tuple[bool, str, CompensationStatus]:
    compensation = get_compensation_by_no(db, compensation_no)
    if not compensation:
        return False, "补偿记录不存在", CompensationStatus.PENDING
    
    if compensation.status not in [CompensationStatus.PENDING, CompensationStatus.WAITING_RETRY]:
        return False, f"当前状态{compensation.status.value}不允许处理", compensation.status
    
    original_status = compensation.status
    compensation.status = CompensationStatus.PROCESSING
    compensation.last_processed_at = datetime.utcnow()
    
    record_state_transition(
        db,
        compensation_id=compensation.id,
        from_status=original_status,
        to_status=CompensationStatus.PROCESSING,
        transition_reason="开始处理补偿",
        operated_by=operator
    )
    
    db.commit()
    db.refresh(compensation)
    return True, "开始处理", CompensationStatus.PROCESSING


def handle_processing_success(
    db: Session,
    compensation_no: str,
    operator: str = "system"
) -> Tuple[bool, str, CompensationStatus]:
    compensation = get_compensation_by_no(db, compensation_no)
    if not compensation:
        return False, "补偿记录不存在", CompensationStatus.PENDING
    
    original_status = compensation.status
    compensation.status = CompensationStatus.COMPENSATED
    compensation.compensated_at = datetime.utcnow()
    compensation.compensated_by = operator
    compensation.last_error_message = None
    compensation.last_failure_type = None
    
    record_state_transition(
        db,
        compensation_id=compensation.id,
        from_status=original_status,
        to_status=CompensationStatus.COMPENSATED,
        transition_reason="补偿处理成功",
        operated_by=operator
    )
    
    record_operation_log(
        db,
        operation_type=OperationType.COMPENSATE,
        compensation_id=compensation.id,
        operator=operator,
        operation_detail={"result": "success"}
    )
    
    db.commit()
    db.refresh(compensation)
    return True, "补偿成功", CompensationStatus.COMPENSATED


def handle_processing_failure(
    db: Session,
    compensation_no: str,
    error_message: str,
    failure_type: FailureType,
    operator: str = "system"
) -> Tuple[bool, str, CompensationStatus]:
    compensation = get_compensation_by_no(db, compensation_no)
    if not compensation:
        return False, "补偿记录不存在", CompensationStatus.PENDING
    
    original_status = compensation.status
    compensation.last_error_message = error_message
    compensation.last_failure_type = failure_type
    compensation.retry_count += 1
    
    if failure_type == FailureType.PERMANENT:
        compensation.status = CompensationStatus.PERMANENT_FAILED
        transition_reason = f"永久失败: {error_message}"
    elif failure_type == FailureType.NEED_MANUAL:
        compensation.status = CompensationStatus.WAITING_MANUAL
        transition_reason = f"需要人工介入: {error_message}"
    elif compensation.retry_count >= compensation.max_retry_times:
        compensation.status = CompensationStatus.PERMANENT_FAILED
        transition_reason = f"重试次数超限({compensation.retry_count}/{compensation.max_retry_times}): {error_message}"
        compensation.last_failure_type = FailureType.PERMANENT
    else:
        compensation.status = CompensationStatus.WAITING_RETRY
        compensation.next_retry_at = datetime.utcnow() + timedelta(minutes=settings.RETRY_INTERVAL_MINUTES)
        transition_reason = f"处理失败，等待重试({compensation.retry_count}/{compensation.max_retry_times}): {error_message}"
    
    record_state_transition(
        db,
        compensation_id=compensation.id,
        from_status=original_status,
        to_status=compensation.status,
        transition_reason=transition_reason,
        operated_by=operator,
        extra_info={
            "retry_count": compensation.retry_count,
            "max_retry_times": compensation.max_retry_times,
            "error_message": error_message
        }
    )
    
    db.commit()
    db.refresh(compensation)
    return True, transition_reason, compensation.status


def manual_takeover(
    db: Session,
    compensation_no: str,
    operator: str,
    judgment_remark: str
) -> Tuple[bool, str, CompensationStatus]:
    compensation = get_compensation_by_no(db, compensation_no)
    if not compensation:
        return False, "补偿记录不存在", CompensationStatus.PENDING
    
    if compensation.status not in [
        CompensationStatus.WAITING_MANUAL,
        CompensationStatus.WAITING_RETRY,
        CompensationStatus.PERMANENT_FAILED
    ]:
        return False, f"当前状态{compensation.status.value}不允许人工接管", compensation.status
    
    original_status = compensation.status
    original_snapshot = {
        "status": original_status.value,
        "judged_by": compensation.judged_by,
        "judgment_remark": compensation.judgment_remark
    }
    
    compensation.status = CompensationStatus.MANUAL_TAKEOVER
    compensation.judged_by = operator
    compensation.judged_at = datetime.utcnow()
    compensation.judgment_remark = judgment_remark
    
    record_state_transition(
        db,
        compensation_id=compensation.id,
        from_status=original_status,
        to_status=CompensationStatus.MANUAL_TAKEOVER,
        transition_reason=f"人工接管: {judgment_remark}",
        operated_by=operator
    )
    
    record_operation_log(
        db,
        operation_type=OperationType.MANUAL_TAKEOVER,
        compensation_id=compensation.id,
        operator=operator,
        operation_detail={"judgment_remark": judgment_remark},
        original_data_snapshot=original_snapshot,
        new_data_snapshot={
            "status": CompensationStatus.MANUAL_TAKEOVER.value,
            "judged_by": operator,
            "judgment_remark": judgment_remark
        }
    )
    
    db.commit()
    db.refresh(compensation)
    return True, "人工接管成功", CompensationStatus.MANUAL_TAKEOVER


def manual_compensate(
    db: Session,
    compensation_no: str,
    operator: str,
    compensation_remark: Optional[str] = None
) -> Tuple[bool, str, CompensationStatus]:
    compensation = get_compensation_by_no(db, compensation_no)
    if not compensation:
        return False, "补偿记录不存在", CompensationStatus.PENDING
    
    if compensation.status != CompensationStatus.MANUAL_TAKEOVER:
        return False, f"当前状态{compensation.status.value}不允许人工补偿", compensation.status
    
    original_status = compensation.status
    compensation.status = CompensationStatus.COMPENSATED
    compensation.compensated_at = datetime.utcnow()
    compensation.compensated_by = operator
    compensation.compensation_remark = compensation_remark
    
    record_state_transition(
        db,
        compensation_id=compensation.id,
        from_status=original_status,
        to_status=CompensationStatus.COMPENSATED,
        transition_reason=f"人工补偿完成: {compensation_remark or ''}",
        operated_by=operator
    )
    
    record_operation_log(
        db,
        operation_type=OperationType.COMPENSATE,
        compensation_id=compensation.id,
        operator=operator,
        operation_detail={
            "type": "manual",
            "compensation_remark": compensation_remark
        }
    )
    
    db.commit()
    db.refresh(compensation)
    return True, "人工补偿成功", CompensationStatus.COMPENSATED


def close_compensation(
    db: Session,
    compensation_no: str,
    operator: str,
    close_remark: str
) -> Tuple[bool, str, CompensationStatus]:
    compensation = get_compensation_by_no(db, compensation_no)
    if not compensation:
        return False, "补偿记录不存在", CompensationStatus.PENDING
    
    if compensation.status in [CompensationStatus.CLOSED, CompensationStatus.COMPENSATED]:
        return False, f"当前状态{compensation.status.value}不允许关闭", compensation.status
    
    original_status = compensation.status
    original_snapshot = {
        "status": original_status.value,
        "closed_by": compensation.closed_by,
        "close_remark": compensation.close_remark
    }
    
    compensation.status = CompensationStatus.CLOSED
    compensation.closed_at = datetime.utcnow()
    compensation.closed_by = operator
    compensation.close_remark = close_remark
    
    record_state_transition(
        db,
        compensation_id=compensation.id,
        from_status=original_status,
        to_status=CompensationStatus.CLOSED,
        transition_reason=f"关闭: {close_remark}",
        operated_by=operator
    )
    
    record_operation_log(
        db,
        operation_type=OperationType.CLOSE,
        compensation_id=compensation.id,
        operator=operator,
        operation_detail={"close_remark": close_remark},
        original_data_snapshot=original_snapshot,
        new_data_snapshot={
            "status": CompensationStatus.CLOSED.value,
            "closed_by": operator,
            "close_remark": close_remark
        }
    )
    
    db.commit()
    db.refresh(compensation)
    return True, "关闭成功", CompensationStatus.CLOSED


def retry_compensation(
    db: Session,
    compensation_no: str,
    operator: str = "system",
    remark: Optional[str] = None
) -> Tuple[bool, str, CompensationStatus]:
    compensation = get_compensation_by_no(db, compensation_no)
    if not compensation:
        return False, "补偿记录不存在", CompensationStatus.PENDING
    
    if compensation.status not in [
        CompensationStatus.WAITING_RETRY,
        CompensationStatus.WAITING_MANUAL,
        CompensationStatus.PERMANENT_FAILED
    ]:
        return False, f"当前状态{compensation.status.value}不允许重试", compensation.status
    
    original_status = compensation.status
    compensation.status = CompensationStatus.PENDING
    compensation.next_retry_at = None
    compensation.last_failure_type = None
    compensation.last_error_message = None
    
    record_state_transition(
        db,
        compensation_id=compensation.id,
        from_status=original_status,
        to_status=CompensationStatus.PENDING,
        transition_reason=f"触发重试: {remark or '系统自动重试'}",
        operated_by=operator
    )
    
    record_operation_log(
        db,
        operation_type=OperationType.RETRY,
        compensation_id=compensation.id,
        operator=operator,
        operation_detail={"remark": remark}
    )
    
    db.commit()
    db.refresh(compensation)
    return True, "重试已触发", CompensationStatus.PENDING


def list_compensations(
    db: Session,
    status: Optional[CompensationStatus] = None,
    source_type: Optional[str] = None,
    check_in_no: Optional[str] = None,
    page: int = 1,
    page_size: int = 20
) -> Tuple[List[CompensationQueue], int]:
    query = db.query(CompensationQueue)
    
    if status:
        query = query.filter(CompensationQueue.status == status)
    if source_type:
        query = query.filter(CompensationQueue.source_type == source_type)
    if check_in_no:
        query = query.filter(CompensationQueue.check_in_no.like(f"%{check_in_no}%"))
    
    total = query.count()
    items = query.order_by(CompensationQueue.created_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size).all()
    
    return items, total


def get_state_transitions(db: Session, compensation_id: int) -> List[StateTransition]:
    return db.query(StateTransition).filter(
        StateTransition.compensation_id == compensation_id
    ).order_by(StateTransition.created_at.asc()).all()


def get_operation_logs(db: Session, compensation_id: int) -> List[OperationLog]:
    return db.query(OperationLog).filter(
        OperationLog.compensation_id == compensation_id
    ).order_by(OperationLog.created_at.desc()).all()


def get_pending_retry_compensations(db: Session) -> List[CompensationQueue]:
    now = datetime.utcnow()
    return db.query(CompensationQueue).filter(
        CompensationQueue.status == CompensationStatus.WAITING_RETRY,
        CompensationQueue.next_retry_at <= now
    ).all()


def get_processing_compensations(db: Session) -> List[CompensationQueue]:
    return db.query(CompensationQueue).filter(
        CompensationQueue.status == CompensationStatus.PROCESSING
    ).all()


def update_compensation_celery_task_id(
    db: Session,
    compensation_id: int,
    celery_task_id: str
) -> None:
    compensation = db.query(CompensationQueue).filter(
        CompensationQueue.id == compensation_id
    ).first()
    if compensation:
        compensation.celery_task_id = celery_task_id
        db.commit()
