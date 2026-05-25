import time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.deposit import DepositCreate, DepositResponse
from app.schemas.common import BatchResponse
from app.services.records import RecordService
from app.api.deps import require_permission, acquire_lock

router = APIRouter()


@router.post("/", response_model=DepositResponse)
def create_deposit(
    data: DepositCreate,
    db: Session = Depends(get_db),
    lock_ctx: dict = acquire_lock("deposit"),
    current_user: dict = require_permission("deposit:write", "创建押金流水"),
):
    service = RecordService(db)
    lock_service = lock_ctx["lock_service"]
    user_id = lock_ctx["user_id"]

    if not lock_service.acquire_lock("deposit", data.deposit_no, user_id):
        holder = lock_service.is_locked("deposit", data.deposit_no)
        raise HTTPException(status_code=409, detail=f"押金流水 {data.deposit_no} 正在被 {holder} 处理，请稍后重试")

    try:
        record, is_duplicate, action = service.create_or_update_deposit(
            data=data.model_dump(),
            duplicate_strategy=data.duplicate_strategy,
            operator=data.operator or "system",
            batch_no=data.batch_no,
        )
        result = DepositResponse.model_validate(record)
        result.is_duplicate = is_duplicate
        result.duplicate_action = action
        return result
    finally:
        lock_service.release_lock("deposit", data.deposit_no)


@router.post("/batch", response_model=BatchResponse)
def batch_create_deposit(
    items: List[DepositCreate],
    batch_no: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = require_permission("deposit:write", "批量导入押金流水"),
):
    start_time = time.time()
    service = RecordService(db)

    if not batch_no:
        batch_no = service.generate_batch_no()

    items_data = []
    for item in items:
        item.batch_no = batch_no
        items_data.append(item.model_dump())

    retry_result = service.batch_process_with_retry(
        items=items_data,
        record_type="deposit",
        max_retries=3,
        batch_no=batch_no,
        operator=items[0].operator if items else "system",
    )

    success_count = retry_result["success"]
    failed_count = retry_result["failed"]
    failed_details = []

    for r in retry_result["results"]:
        if r["status"] in ["failed", "dead_letter"]:
            failed_details.append({
                "error": r.get("error", "未知错误"),
                "status": r["status"],
                "dlq_id": r.get("dlq_id"),
                "task_id": r.get("task_id"),
            })

    process_time = time.time() - start_time

    return BatchResponse(
        batch_no=batch_no,
        total_records=len(items),
        success_count=success_count,
        failed_count=failed_count,
        failed_details=failed_details,
        process_time=process_time,
        idempotency_strategy=items[0].duplicate_strategy if items else "update",
        retry_stats=retry_result["retry_stats"],
        dlq_stats=retry_result["dlq_stats"],
    )


@router.get("/{deposit_no}", response_model=DepositResponse)
def get_deposit(
    deposit_no: str,
    db: Session = Depends(get_db),
    current_user: dict = require_permission("deposit:read", "查看押金流水"),
):
    service = RecordService(db)
    record = service.get_deposit(deposit_no)
    if not record:
        raise HTTPException(status_code=404, detail="押金流水不存在")
    return record


@router.put("/{deposit_no}/revoke")
def revoke_deposit(
    deposit_no: str,
    operator: str = Query(...),
    reason: str = Query(...),
    db: Session = Depends(get_db),
    lock_ctx: dict = acquire_lock("deposit"),
    current_user: dict = require_permission("deposit:write", "撤回押金流水"),
):
    service = RecordService(db)
    lock_service = lock_ctx["lock_service"]
    user_id = lock_ctx["user_id"]

    if not lock_service.acquire_lock("deposit", deposit_no, user_id):
        holder = lock_service.is_locked("deposit", deposit_no)
        raise HTTPException(status_code=409, detail=f"押金流水 {deposit_no} 正在被 {holder} 处理，请稍后重试")

    try:
        success = service.revoke_record("deposit", deposit_no, operator, reason)
        if not success:
            raise HTTPException(status_code=404, detail="押金流水不存在或撤销失败")
        return {"status": "success", "message": "已撤销", "locked_by": user_id}
    finally:
        lock_service.release_lock("deposit", deposit_no)
