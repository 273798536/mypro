from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date

from app.database import get_db
from app.core.security import (
    get_current_active_user,
    RoleChecker,
    get_user_role_context,
    SHIFT_FIELD_CONFIG,
    apply_field_filter
)
from app.models.auth import User
from app.models.business import ShiftRecord
from app.schemas.business import (
    ShiftRecordCreate,
    ShiftRecord as ShiftRecordSchema
)
from app.schemas.common import DataResponse, ListResponse
from app.services.idempotent_service import IdempotentService

router = APIRouter()
allow_data_entry = RoleChecker(["data_entry", "reviewer", "supervisor"])
allow_review = RoleChecker(["reviewer", "supervisor"])


@router.post("/", response_model=DataResponse[ShiftRecordSchema])
async def create_shift(
    shift_in: ShiftRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: bool = Depends(allow_data_entry)
) -> Any:
    try:
        role_context = get_user_role_context(current_user, db)
        
        idempotent_key = IdempotentService.generate_shift_key(
            shift_date=str(shift_in.shift_date),
            shift_type=shift_in.shift_type,
            team_code=shift_in.team_code
        )
        
        data_dict = shift_in.model_dump()
        shift, is_new = IdempotentService.upsert_with_idempotency(
            db=db,
            model_class=ShiftRecord,
            idempotent_key=idempotent_key,
            data=data_dict,
            user_id=current_user.id
        )
        
        filtered_data = apply_field_filter(shift, role_context, SHIFT_FIELD_CONFIG)
        
        return DataResponse(
            success=True,
            data=filtered_data,
            message=f"班次记录{'创建' if is_new else '更新'}成功"
        )
    except Exception as e:
        IdempotentService.save_failed_record(
            db=db,
            business_type="shift",
            idempotent_key=idempotent_key if 'idempotent_key' in locals() else "UNKNOWN",
            raw_data=shift_in.model_dump(),
            error_type="CREATE_ERROR",
            error_message=str(e)
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=ListResponse[ShiftRecordSchema])
async def get_shifts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    team_code: Optional[str] = Query(None),
    shift_type: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    role_context = get_user_role_context(current_user, db)
    
    query = db.query(ShiftRecord)
    
    if role_context["is_data_entry"] and not role_context["is_reviewer"] and not role_context["is_supervisor"]:
        query = query.filter(ShiftRecord.created_by == current_user.id)
    
    if team_code:
        query = query.filter(ShiftRecord.team_code == team_code)
    if shift_type:
        query = query.filter(ShiftRecord.shift_type == shift_type)
    if start_date:
        query = query.filter(ShiftRecord.shift_date >= start_date)
    if end_date:
        query = query.filter(ShiftRecord.shift_date <= end_date)
    if status:
        query = query.filter(ShiftRecord.status == status)
    
    total = query.count()
    shifts = query.order_by(ShiftRecord.shift_date.desc())\
        .offset((page - 1) * page_size)\
        .limit(page_size)\
        .all()
    
    filtered_data = apply_field_filter(shifts, role_context, SHIFT_FIELD_CONFIG)
    
    return ListResponse(
        success=True,
        data=filtered_data,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/{shift_id}", response_model=DataResponse[ShiftRecordSchema])
async def get_shift(
    shift_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    shift = db.query(ShiftRecord).filter(ShiftRecord.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="班次记录不存在")
    
    role_context = get_user_role_context(current_user, db)
    filtered_data = apply_field_filter(shift, role_context, SHIFT_FIELD_CONFIG)
    
    return DataResponse(success=True, data=filtered_data)
