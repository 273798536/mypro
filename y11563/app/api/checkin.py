import time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.checkin import CheckinCreate, CheckinResponse, CheckinUpdate
from app.schemas.common import BatchResponse
from app.services.records import RecordService
from app.api.deps import require_permission, acquire_lock

router = APIRouter()


@router.post("/", response_model=CheckinResponse)
def create_checkin(
    data: CheckinCreate,
    db: Session = Depends(get_db),
    lock_ctx: dict = acquire_lock("checkin"),
    current_user: dict = require_permission("checkin:write", "创建入住单"),
):
    service = RecordService(db)
    lock_service = lock_ctx["lock_service"]
    user_id = lock_ctx["user_id"]

    if not lock_service.acquire_lock("checkin", data.checkin_no, user_id):
        holder = lock_service.is_locked("checkin", data.checkin_no)
        raise HTTPException(status_code=409, detail=f"入住单 {data.checkin_no} 正在被 {holder} 处理，请稍后重试")

    try:
        record, is_duplicate, action = service.create_or_update_checkin(
            data=data.model_dump(),
            duplicate_strategy=data.duplicate_strategy,
            operator=data.operator,
            batch_no=data.batch_no,
        )
        result = CheckinResponse.model_validate(record)
        result.is_duplicate = is_duplicate
        result.duplicate_action = action
        return result
    finally:
        lock_service.release_lock("checkin", data.checkin_no)


@router.post("/batch", response_model=BatchResponse)
def batch_create_checkin(
    items: List[CheckinCreate],
    batch_no: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = require_permission("checkin:write", "批量导入入住单"),
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
        record_type="checkin",
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


@router.get("/{checkin_no}", response_model=CheckinResponse)
def get_checkin(
    checkin_no: str,
    db: Session = Depends(get_db),
    current_user: dict = require_permission("checkin:read", "查看入住单"),
):
    service = RecordService(db)
    record = service.get_checkin(checkin_no)
    if not record:
        raise HTTPException(status_code=404, detail="入住单不存在")
    return record


@router.put("/{checkin_no}/revoke")
def revoke_checkin(
    checkin_no: str,
    operator: str = Query(...),
    reason: str = Query(...),
    db: Session = Depends(get_db),
    lock_ctx: dict = acquire_lock("checkin"),
    current_user: dict = require_permission("checkin:write", "撤回入住单"),
):
    service = RecordService(db)
    lock_service = lock_ctx["lock_service"]
    user_id = lock_ctx["user_id"]

    if not lock_service.acquire_lock("checkin", checkin_no, user_id):
        holder = lock_service.is_locked("checkin", checkin_no)
        raise HTTPException(status_code=409, detail=f"入住单 {checkin_no} 正在被 {holder} 处理，请稍后重试")

    try:
        success = service.revoke_record("checkin", checkin_no, operator, reason)
        if not success:
            raise HTTPException(status_code=404, detail="入住单不存在或撤销失败")
        return {"status": "success", "message": "已撤销", "locked_by": user_id}
    finally:
        lock_service.release_lock("checkin", checkin_no)
