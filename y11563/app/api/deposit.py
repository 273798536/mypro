import time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.deposit import DepositCreate, DepositResponse
from app.schemas.common import BatchResponse
from app.services.records import RecordService

router = APIRouter()


@router.post("/", response_model=DepositResponse)
def create_deposit(data: DepositCreate, db: Session = Depends(get_db)):
    service = RecordService(db)
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


@router.post("/batch", response_model=BatchResponse)
def batch_create_deposit(
    items: List[DepositCreate],
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
            record, is_dup, action = service.create_or_update_deposit(
                data=item.model_dump(),
                duplicate_strategy=item.duplicate_strategy,
                operator=item.operator or "system",
                batch_no=batch_no,
            )
            success_count += 1
        except Exception as e:
            failed_count += 1
            failed_details.append({
                "index": idx,
                "deposit_no": item.deposit_no,
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


@router.get("/{deposit_no}", response_model=DepositResponse)
def get_deposit(deposit_no: str, db: Session = Depends(get_db)):
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
):
    service = RecordService(db)
    success = service.revoke_record("deposit", deposit_no, operator, reason)
    if not success:
        raise HTTPException(status_code=404, detail="押金流水不存在或撤销失败")
    return {"status": "success", "message": "已撤销"}
