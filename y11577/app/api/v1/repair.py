from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date

from app.database import get_db
from app.core.security import (
    get_current_active_user,
    RoleChecker,
    get_user_role_context
)
from app.models.auth import User
from app.models.business import RepairRecord
from app.schemas.business import (
    RepairRecordCreate,
    RepairRecordUpdate,
    RepairRecord as RepairRecordSchema
)
from app.schemas.common import DataResponse, ListResponse
from app.services.idempotent_service import IdempotentService
from app.services.queue_service import CompensationQueueService

router = APIRouter()
allow_data_entry = RoleChecker(["data_entry", "reviewer", "supervisor"])
allow_review = RoleChecker(["reviewer", "supervisor"])


@router.post("/", response_model=DataResponse[RepairRecordSchema])
async def create_repair(
    repair_in: RepairRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: bool = Depends(allow_data_entry)
) -> Any:
    try:
        idempotent_key = IdempotentService.generate_repair_key(
            delivery_id=repair_in.delivery_id,
            batch_no=repair_in.batch_no or str(repair_in.repair_no)
        )
        
        data_dict = repair_in.model_dump()
        repair, is_new = IdempotentService.upsert_with_idempotency(
            db=db,
            model_class=RepairRecord,
            idempotent_key=idempotent_key,
            data=data_dict,
            user_id=current_user.id
        )
        
        queue_service = CompensationQueueService(db)
        if is_new or repair.status == "pending":
            queue_service.enqueue(
                business_type="repair",
                business_key=idempotent_key,
                business_id=repair.id
            )
        
        return DataResponse(
            success=True,
            data=repair,
            message=f"返修记录{'创建' if is_new else '更新'}成功"
        )
    except Exception as e:
        IdempotentService.save_failed_record(
            db=db,
            business_type="repair",
            idempotent_key=idempotent_key if 'idempotent_key' in locals() else "UNKNOWN",
            raw_data=repair_in.model_dump(),
            error_type="CREATE_ERROR",
            error_message=str(e)
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=ListResponse[RepairRecordSchema])
async def get_repairs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    delivery_id: Optional[int] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    role_context = get_user_role_context(current_user, db)
    
    query = db.query(RepairRecord)
    
    if role_context["is_data_entry"] and not role_context["is_reviewer"] and not role_context["is_supervisor"]:
        query = query.filter(RepairRecord.created_by == current_user.id)
    
    if delivery_id:
        query = query.filter(RepairRecord.delivery_id == delivery_id)
    if start_date:
        query = query.filter(RepairRecord.repair_date >= start_date)
    if end_date:
        query = query.filter(RepairRecord.repair_date <= end_date)
    if status:
        query = query.filter(RepairRecord.status == status)
    
    total = query.count()
    repairs = query.order_by(RepairRecord.created_at.desc())\
        .offset((page - 1) * page_size)\
        .limit(page_size)\
        .all()
    
    return ListResponse(
        success=True,
        data=repairs,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/{repair_id}", response_model=DataResponse[RepairRecordSchema])
async def get_repair(
    repair_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    repair = db.query(RepairRecord).filter(RepairRecord.id == repair_id).first()
    if not repair:
        raise HTTPException(status_code=404, detail="返修记录不存在")
    return DataResponse(success=True, data=repair)


@router.put("/{repair_id}", response_model=DataResponse[RepairRecordSchema])
async def update_repair(
    repair_id: int,
    repair_in: RepairRecordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: bool = Depends(allow_data_entry)
) -> Any:
    repair = db.query(RepairRecord).filter(RepairRecord.id == repair_id).first()
    if not repair:
        raise HTTPException(status_code=404, detail="返修记录不存在")
    
    update_data = repair_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(repair, field, value)
    
    repair.updated_by = current_user.id
    db.commit()
    db.refresh(repair)
    
    if repair.status == "pending":
        queue_service = CompensationQueueService(db)
        queue_service.enqueue(
            business_type="repair",
            business_key=repair.idempotent_key,
            business_id=repair.id
        )
    
    return DataResponse(success=True, data=repair, message="更新成功")
