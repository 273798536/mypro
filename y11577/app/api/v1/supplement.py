from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date

from app.database import get_db
from app.core.security import (
    get_current_active_user,
    RoleChecker,
    get_user_role_context,
    apply_field_filter
)
from app.models.auth import User
from app.models.business import TemporarySupplement
from app.schemas.business import (
    TemporarySupplementCreate,
    TemporarySupplementUpdate,
    TemporarySupplement as TemporarySupplementSchema
)
from app.schemas.common import DataResponse, ListResponse
from app.services.idempotent_service import IdempotentService

router = APIRouter()
allow_data_entry = RoleChecker(["data_entry", "reviewer", "supervisor"])
allow_review = RoleChecker(["reviewer", "supervisor"])
allow_supervisor = RoleChecker(["supervisor"])

SUPPLEMENT_FIELD_CONFIG = {
    "supplement_no": "all",
    "supplement_type": "all",
    "supplement_date": "all",
    "supplement_reason": "all",
    "related_order_no": "all",
    "supplement_content": "review",
    "amount": "review",
    "status": "all",
    "remark": "all",
    "metadata_": "supervisor",
    "idempotent_key": "supervisor",
    "created_at": "all",
    "updated_at": "all",
}


@router.post("/", response_model=DataResponse[TemporarySupplementSchema])
async def create_supplement(
    supplement_in: TemporarySupplementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: bool = Depends(allow_data_entry)
) -> Any:
    try:
        role_context = get_user_role_context(current_user, db)
        
        idempotent_key = IdempotentService.generate_supplement_key(
            supplement_type=supplement_in.supplement_type,
            supplement_date=str(supplement_in.supplement_date),
            related_order_no=supplement_in.related_order_no or supplement_in.supplement_no
        )
        
        data_dict = supplement_in.model_dump()
        supplement, is_new = IdempotentService.upsert_with_idempotency(
            db=db,
            model_class=TemporarySupplement,
            idempotent_key=idempotent_key,
            data=data_dict,
            user_id=current_user.id
        )
        
        filtered_data = apply_field_filter(
            supplement, role_context, SUPPLEMENT_FIELD_CONFIG,
            schema_class=TemporarySupplementSchema
        )
        
        db.commit()
        return DataResponse(
            success=True,
            data=filtered_data,
            message=f"临时补录单{'创建' if is_new else '更新'}成功"
        )
    except Exception as e:
        db.rollback()
        try:
            IdempotentService.save_failed_record(
                db=db,
                business_type="supplement",
                idempotent_key=idempotent_key if 'idempotent_key' in locals() else "UNKNOWN",
                raw_data=supplement_in.model_dump(),
                error_type="CREATE_ERROR",
                error_message=str(e)
            )
            db.commit()
        except:
            pass
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=ListResponse[TemporarySupplementSchema])
async def get_supplements(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    supplement_type: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    status: Optional[str] = Query(None),
    related_order_no: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    role_context = get_user_role_context(current_user, db)
    
    query = db.query(TemporarySupplement)
    
    if role_context["is_data_entry"] and not role_context["is_reviewer"] and not role_context["is_supervisor"]:
        query = query.filter(TemporarySupplement.created_by == current_user.id)
    
    if supplement_type:
        query = query.filter(TemporarySupplement.supplement_type == supplement_type)
    if start_date:
        query = query.filter(TemporarySupplement.supplement_date >= start_date)
    if end_date:
        query = query.filter(TemporarySupplement.supplement_date <= end_date)
    if status:
        query = query.filter(TemporarySupplement.status == status)
    if related_order_no:
        query = query.filter(TemporarySupplement.related_order_no == related_order_no)
    
    total = query.count()
    supplements = query.order_by(TemporarySupplement.created_at.desc())\
        .offset((page - 1) * page_size)\
        .limit(page_size)\
        .all()
    
    filtered_data = apply_field_filter(
        supplements, role_context, SUPPLEMENT_FIELD_CONFIG,
        schema_class=TemporarySupplementSchema
    )
    
    return ListResponse(
        success=True,
        data=filtered_data,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/{supplement_id}", response_model=DataResponse[TemporarySupplementSchema])
async def get_supplement(
    supplement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    supplement = db.query(TemporarySupplement).filter(TemporarySupplement.id == supplement_id).first()
    if not supplement:
        raise HTTPException(status_code=404, detail="临时补录单不存在")
    
    role_context = get_user_role_context(current_user, db)
    if role_context["is_data_entry"] and not role_context["is_reviewer"] and not role_context["is_supervisor"]:
        if supplement.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="无权限查看此记录")
    
    filtered_data = apply_field_filter(
        supplement, role_context, SUPPLEMENT_FIELD_CONFIG,
        schema_class=TemporarySupplementSchema
    )
    
    return DataResponse(success=True, data=filtered_data)


@router.put("/{supplement_id}", response_model=DataResponse[TemporarySupplementSchema])
async def update_supplement(
    supplement_id: int,
    supplement_in: TemporarySupplementUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: bool = Depends(allow_data_entry)
) -> Any:
    supplement = db.query(TemporarySupplement).filter(TemporarySupplement.id == supplement_id).first()
    if not supplement:
        raise HTTPException(status_code=404, detail="临时补录单不存在")
    
    role_context = get_user_role_context(current_user, db)
    if role_context["is_data_entry"] and not role_context["is_reviewer"] and not role_context["is_supervisor"]:
        if supplement.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="无权限修改此记录")
    
    update_data = supplement_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(supplement, field, value)
    
    supplement.updated_by = current_user.id
    db.commit()
    db.refresh(supplement)
    
    filtered_data = apply_field_filter(
        supplement, role_context, SUPPLEMENT_FIELD_CONFIG,
        schema_class=TemporarySupplementSchema
    )
    db.commit()
    return DataResponse(success=True, data=filtered_data, message="更新成功")


@router.post("/{supplement_id}/review", response_model=DataResponse)
async def review_supplement(
    supplement_id: int,
    status: str = Query(..., description="审核结果: approved/rejected"),
    remark: Optional[str] = Query(None, description="审核备注"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: bool = Depends(allow_review)
) -> Any:
    supplement = db.query(TemporarySupplement).filter(TemporarySupplement.id == supplement_id).first()
    if not supplement:
        raise HTTPException(status_code=404, detail="临时补录单不存在")
    
    supplement.status = status
    supplement.remark = remark
    supplement.updated_by = current_user.id
    db.commit()
    
    return DataResponse(success=True, message=f"{'审核通过' if status == 'approved' else '审核驳回'}成功")
