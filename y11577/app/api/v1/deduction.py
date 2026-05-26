from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date

from app.database import get_db
from app.core.security import (
    get_current_active_user,
    RoleChecker,
    get_user_role_context,
    DEDUCTION_FIELD_CONFIG,
    apply_field_filter
)
from app.models.auth import User
from app.models.business import DeductionDetail
from app.schemas.business import (
    DeductionDetailCreate,
    DeductionDetailUpdate,
    DeductionDetail as DeductionDetailSchema
)
from app.schemas.common import DataResponse, ListResponse
from app.services.idempotent_service import IdempotentService
from app.services.queue_service import CompensationQueueService
from app.services.change_history_service import ChangeHistoryService

router = APIRouter()
allow_data_entry = RoleChecker(["data_entry", "reviewer", "supervisor"])
allow_review = RoleChecker(["reviewer", "supervisor"])


@router.post("/", response_model=DataResponse[DeductionDetailSchema])
async def create_deduction(
    deduction_in: DeductionDetailCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: bool = Depends(allow_data_entry)
) -> Any:
    try:
        role_context = get_user_role_context(current_user, db)
        
        idempotent_key = IdempotentService.generate_deduction_key(
            delivery_id=deduction_in.delivery_id or 0,
            deduction_type=deduction_in.deduction_type
        )
        
        data_dict = deduction_in.model_dump()
        deduction, is_new = IdempotentService.upsert_with_idempotency(
            db=db,
            model_class=DeductionDetail,
            idempotent_key=idempotent_key,
            data=data_dict,
            user_id=current_user.id
        )
        
        queue_service = CompensationQueueService(db)
        if is_new or deduction.status == "pending":
            queue_service.enqueue(
                business_type="deduction",
                business_key=idempotent_key,
                business_id=deduction.id
            )
        
        filtered_data = apply_field_filter(
            deduction, role_context, DEDUCTION_FIELD_CONFIG,
            schema_class=DeductionDetailSchema
        )
        
        db.commit()
        return DataResponse(
            success=True,
            data=filtered_data,
            message=f"扣款明细{'创建' if is_new else '更新'}成功"
        )
    except Exception as e:
        db.rollback()
        try:
            IdempotentService.save_failed_record(
                db=db,
                business_type="deduction",
                idempotent_key=idempotent_key if 'idempotent_key' in locals() else "UNKNOWN",
                raw_data=deduction_in.model_dump(),
                error_type="CREATE_ERROR",
                error_message=str(e)
            )
            db.commit()
        except:
            pass
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=ListResponse[DeductionDetailSchema])
async def get_deductions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    delivery_id: Optional[int] = Query(None),
    repair_id: Optional[int] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    role_context = get_user_role_context(current_user, db)
    
    query = db.query(DeductionDetail)
    
    if role_context["is_data_entry"] and not role_context["is_reviewer"] and not role_context["is_supervisor"]:
        query = query.filter(DeductionDetail.created_by == current_user.id)
    
    if delivery_id:
        query = query.filter(DeductionDetail.delivery_id == delivery_id)
    if repair_id:
        query = query.filter(DeductionDetail.repair_id == repair_id)
    if start_date:
        query = query.filter(DeductionDetail.deduction_date >= start_date)
    if end_date:
        query = query.filter(DeductionDetail.deduction_date <= end_date)
    if status:
        query = query.filter(DeductionDetail.status == status)
    
    total = query.count()
    deductions = query.order_by(DeductionDetail.created_at.desc())\
        .offset((page - 1) * page_size)\
        .limit(page_size)\
        .all()
    
    filtered_data = apply_field_filter(
        deductions, role_context, DEDUCTION_FIELD_CONFIG,
        schema_class=DeductionDetailSchema
    )
    
    return ListResponse(
        success=True,
        data=filtered_data,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/{deduction_id}", response_model=DataResponse[DeductionDetailSchema])
async def get_deduction(
    deduction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    deduction = db.query(DeductionDetail).filter(DeductionDetail.id == deduction_id).first()
    if not deduction:
        raise HTTPException(status_code=404, detail="扣款明细不存在")
    
    role_context = get_user_role_context(current_user, db)
    filtered_data = apply_field_filter(
        deduction, role_context, DEDUCTION_FIELD_CONFIG,
        schema_class=DeductionDetailSchema
    )
    
    return DataResponse(success=True, data=filtered_data)


@router.put("/{deduction_id}", response_model=DataResponse[DeductionDetailSchema])
async def update_deduction(
    deduction_id: int,
    deduction_in: DeductionDetailUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: bool = Depends(allow_data_entry)
) -> Any:
    deduction = db.query(DeductionDetail).filter(DeductionDetail.id == deduction_id).first()
    if not deduction:
        raise HTTPException(status_code=404, detail="扣款明细不存在")
    
    role_context = get_user_role_context(current_user, db)
    if role_context["is_data_entry"] and not role_context["is_reviewer"] and not role_context["is_supervisor"]:
        if deduction.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="无权限修改此记录")
    
    old_data = {c.name: getattr(deduction, c.name) for c in deduction.__table__.columns}
    
    update_data = deduction_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(deduction, field, value)
    
    deduction.updated_by = current_user.id
    db.flush()
    
    ChangeHistoryService.record_changes(
        db=db,
        business_type="deduction",
        business_id=deduction_id,
        old_obj=old_data,
        new_data=update_data,
        operator=current_user,
        change_reason="修改扣款明细"
    )
    
    if deduction.status == "pending":
        queue_service = CompensationQueueService(db)
        queue_service.enqueue(
            business_type="deduction",
            business_key=deduction.idempotent_key,
            business_id=deduction.id
        )
    
    filtered_data = apply_field_filter(
        deduction, role_context, DEDUCTION_FIELD_CONFIG,
        schema_class=DeductionDetailSchema
    )
    db.commit()
    return DataResponse(success=True, data=filtered_data, message="更新成功")
