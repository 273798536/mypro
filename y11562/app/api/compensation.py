from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.schemas import (
    CompensationQueue,
    CompensationQueueDetail,
    CompensationQueueCreate,
    CompensationActionResponse,
    RetryRequest,
    ManualTakeoverRequest,
    CompensateRequest,
    CloseRequest,
    StateTransition,
    OperationLog,
    PaginatedResponse
)
from app.models.models import CompensationStatus, DataSourceType
from app.services.compensation_service import (
    create_compensation,
    get_compensation_by_no,
    list_compensations,
    get_state_transitions,
    get_operation_logs,
    retry_compensation,
    manual_takeover,
    manual_compensate,
    close_compensation,
    process_compensation,
    handle_processing_success
)
from app.tasks.compensation_tasks import process_compensation_task

router = APIRouter()


@router.post("/", response_model=CompensationQueue)
def create_compensation_api(
    compensation_data: CompensationQueueCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    compensation = create_compensation(db, compensation_data)
    
    background_tasks.add_task(
        process_compensation_task.delay,
        compensation.compensation_no
    )
    
    return compensation


@router.get("/{compensation_no}", response_model=CompensationQueueDetail)
def get_compensation(
    compensation_no: str,
    db: Session = Depends(get_db)
):
    compensation = get_compensation_by_no(db, compensation_no)
    if not compensation:
        raise HTTPException(status_code=404, detail="补偿记录不存在")
    return compensation


@router.get("/", response_model=PaginatedResponse)
def list_compensations_api(
    status: Optional[CompensationStatus] = None,
    source_type: Optional[DataSourceType] = None,
    check_in_no: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db)
):
    items, total = list_compensations(
        db=db,
        status=status,
        source_type=source_type,
        check_in_no=check_in_no,
        page=page,
        page_size=page_size
    )
    
    items_dict = [
        {
            "id": item.id,
            "compensation_no": item.compensation_no,
            "source_type": item.source_type.value,
            "check_in_no": item.check_in_no,
            "room_no": item.room_no,
            "guest_name": item.guest_name,
            "amount": item.amount,
            "deposit_amount": item.deposit_amount,
            "invoice_amount": item.invoice_amount,
            "status": item.status.value,
            "retry_count": item.retry_count,
            "max_retry_times": item.max_retry_times,
            "last_failure_type": item.last_failure_type.value if item.last_failure_type else None,
            "last_error_message": item.last_error_message,
            "last_processed_at": item.last_processed_at,
            "next_retry_at": item.next_retry_at,
            "created_at": item.created_at,
            "updated_at": item.updated_at
        }
        for item in items
    ]
    
    return PaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=items_dict
    )


@router.get("/{compensation_no}/transitions", response_model=list[StateTransition])
def get_compensation_transitions(
    compensation_no: str,
    db: Session = Depends(get_db)
):
    compensation = get_compensation_by_no(db, compensation_no)
    if not compensation:
        raise HTTPException(status_code=404, detail="补偿记录不存在")
    
    transitions = get_state_transitions(db, compensation.id)
    return transitions


@router.get("/{compensation_no}/logs", response_model=list[OperationLog])
def get_compensation_logs(
    compensation_no: str,
    db: Session = Depends(get_db)
):
    compensation = get_compensation_by_no(db, compensation_no)
    if not compensation:
        raise HTTPException(status_code=404, detail="补偿记录不存在")
    
    logs = get_operation_logs(db, compensation.id)
    return logs


@router.post("/{compensation_no}/retry", response_model=CompensationActionResponse)
def retry_compensation_api(
    compensation_no: str,
    request: RetryRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    success, message, new_status = retry_compensation(
        db=db,
        compensation_no=compensation_no,
        operator=request.operator,
        remark=request.remark
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    if new_status == CompensationStatus.PENDING:
        background_tasks.add_task(
            process_compensation_task.delay,
            compensation_no
        )
    
    return CompensationActionResponse(
        success=success,
        compensation_no=compensation_no,
        new_status=new_status,
        message=message
    )


@router.post("/{compensation_no}/manual-takeover", response_model=CompensationActionResponse)
def manual_takeover_api(
    compensation_no: str,
    request: ManualTakeoverRequest,
    db: Session = Depends(get_db)
):
    success, message, new_status = manual_takeover(
        db=db,
        compensation_no=compensation_no,
        operator=request.operator,
        judgment_remark=request.judgment_remark
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return CompensationActionResponse(
        success=success,
        compensation_no=compensation_no,
        new_status=new_status,
        message=message
    )


@router.post("/{compensation_no}/compensate", response_model=CompensationActionResponse)
def compensate_api(
    compensation_no: str,
    request: CompensateRequest,
    db: Session = Depends(get_db)
):
    compensation = get_compensation_by_no(db, compensation_no)
    if not compensation:
        raise HTTPException(status_code=404, detail="补偿记录不存在")
    
    if compensation.status == CompensationStatus.MANUAL_TAKEOVER:
        success, message, new_status = manual_compensate(
            db=db,
            compensation_no=compensation_no,
            operator=request.operator,
            compensation_remark=request.compensation_remark
        )
    else:
        success, message, new_status = process_compensation(
            db=db,
            compensation_no=compensation_no,
            operator=request.operator
        )
        if success:
            success, message, new_status = handle_processing_success(
                db=db,
                compensation_no=compensation_no,
                operator=request.operator
            )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return CompensationActionResponse(
        success=success,
        compensation_no=compensation_no,
        new_status=new_status,
        message=message
    )


@router.post("/{compensation_no}/close", response_model=CompensationActionResponse)
def close_compensation_api(
    compensation_no: str,
    request: CloseRequest,
    db: Session = Depends(get_db)
):
    success, message, new_status = close_compensation(
        db=db,
        compensation_no=compensation_no,
        operator=request.operator,
        close_remark=request.close_remark
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return CompensationActionResponse(
        success=success,
        compensation_no=compensation_no,
        new_status=new_status,
        message=message
    )


@router.post("/{compensation_no}/process", response_model=CompensationActionResponse)
def trigger_process(
    compensation_no: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    compensation = get_compensation_by_no(db, compensation_no)
    if not compensation:
        raise HTTPException(status_code=404, detail="补偿记录不存在")
    
    background_tasks.add_task(
        process_compensation_task.delay,
        compensation_no
    )
    
    return CompensationActionResponse(
        success=True,
        compensation_no=compensation_no,
        new_status=compensation.status,
        message="已触发异步处理"
    )
