import time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.checkin import CheckinCreate, CheckinResponse, CheckinUpdate
from app.schemas.common import BatchResponse
from app.services.records import RecordService

router = APIRouter()


@router.post("/", response_model=CheckinResponse)
def create_checkin(data: CheckinCreate, db: Session = Depends(get_db)):
    service = RecordService(db)
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


@router.post("/batch", response_model=BatchResponse)
def batch_create_checkin(
    items: List[CheckinCreate],
    batch_no: Optional[str] = None,
    db: Session = Depends(get_db),
):
    start_time = time.time()
    service = RecordService(db)

    if not batch_no:
        batch_no = service.generate_batch_no()

    success_count = 0
    failed_count = 0
    failed_details = []

    for idx, item in enumerate(items):
        try:
            item.batch_no = batch_no
            record, is_dup, action = service.create_or_update_checkin(
                data=item.model_dump(),
                duplicate_strategy=item.duplicate_strategy,
                operator=item.operator,
                batch_no=batch_no,
            )
            success_count += 1
        except Exception as e:
            failed_count += 1
            failed_details.append({
                "index": idx,
                "checkin_no": item.checkin_no,
                "error": str(e),
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
    )


@router.get("/{checkin_no}", response_model=CheckinResponse)
def get_checkin(checkin_no: str, db: Session = Depends(get_db)):
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
):
    service = RecordService(db)
    success = service.revoke_record("checkin", checkin_no, operator, reason)
    if not success:
        raise HTTPException(status_code=404, detail="入住单不存在或撤销失败")
    return {"status": "success", "message": "已撤销"}
