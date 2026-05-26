from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date

from app.database import get_db
from app.core.security import (
    get_current_active_user,
    RoleChecker,
    get_user_role_context,
    DELIVERY_FIELD_CONFIG,
    apply_field_filter
)
from app.models.auth import User
from app.models.business import OutsourceDelivery
from app.schemas.business import (
    OutsourceDeliveryCreate,
    OutsourceDeliveryUpdate,
    OutsourceDelivery as OutsourceDeliverySchema
)
from app.schemas.common import DataResponse, ListResponse
from app.services.idempotent_service import IdempotentService
from app.services.queue_service import CompensationQueueService

router = APIRouter()
allow_data_entry = RoleChecker(["data_entry", "reviewer", "supervisor"])
allow_review = RoleChecker(["reviewer", "supervisor"])
allow_supervisor = RoleChecker(["supervisor"])


@router.post("/", response_model=DataResponse[OutsourceDeliverySchema])
async def create_delivery(
    delivery_in: OutsourceDeliveryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: bool = Depends(allow_data_entry)
) -> Any:
    try:
        role_context = get_user_role_context(current_user, db)
        
        idempotent_key = IdempotentService.generate_delivery_key(
            supplier_code=delivery_in.supplier_code,
            delivery_no=delivery_in.delivery_no,
            delivery_date=str(delivery_in.delivery_date)
        )
        
        data_dict = delivery_in.model_dump()
        delivery, is_new = IdempotentService.upsert_with_idempotency(
            db=db,
            model_class=OutsourceDelivery,
            idempotent_key=idempotent_key,
            data=data_dict,
            user_id=current_user.id
        )
        
        queue_service = CompensationQueueService(db)
        if is_new or delivery.status == "pending":
            queue_service.enqueue(
                business_type="delivery",
                business_key=idempotent_key,
                business_id=delivery.id
            )
        
        filtered_data = apply_field_filter(
            delivery, role_context, DELIVERY_FIELD_CONFIG, 
            schema_class=OutsourceDeliverySchema
        )
        
        db.commit()
        return DataResponse(
            success=True,
            data=filtered_data,
            message=f"外协送货单{'创建' if is_new else '更新'}成功"
        )
    except Exception as e:
        db.rollback()
        try:
            IdempotentService.save_failed_record(
                db=db,
                business_type="delivery",
                idempotent_key=idempotent_key if 'idempotent_key' in locals() else "UNKNOWN",
                raw_data=delivery_in.model_dump(),
                error_type="CREATE_ERROR",
                error_message=str(e)
            )
            db.commit()
        except:
            pass
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=ListResponse[OutsourceDeliverySchema])
async def get_deliveries(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    supplier_code: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    role_context = get_user_role_context(current_user, db)
    
    query = db.query(OutsourceDelivery)
    
    if role_context["is_data_entry"] and not role_context["is_reviewer"] and not role_context["is_supervisor"]:
        query = query.filter(OutsourceDelivery.created_by == current_user.id)
    
    if supplier_code:
        query = query.filter(OutsourceDelivery.supplier_code == supplier_code)
    if start_date:
        query = query.filter(OutsourceDelivery.delivery_date >= start_date)
    if end_date:
        query = query.filter(OutsourceDelivery.delivery_date <= end_date)
    if status:
        query = query.filter(OutsourceDelivery.status == status)
    
    total = query.count()
    deliveries = query.order_by(OutsourceDelivery.created_at.desc())\
        .offset((page - 1) * page_size)\
        .limit(page_size)\
        .all()
    
    filtered_data = apply_field_filter(
        deliveries, role_context, DELIVERY_FIELD_CONFIG,
        schema_class=OutsourceDeliverySchema
    )
    
    return ListResponse(
        success=True,
        data=filtered_data,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/{delivery_id}", response_model=DataResponse[OutsourceDeliverySchema])
async def get_delivery(
    delivery_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    delivery = db.query(OutsourceDelivery).filter(OutsourceDelivery.id == delivery_id).first()
    if not delivery:
        raise HTTPException(status_code=404, detail="外协送货单不存在")
    
    role_context = get_user_role_context(current_user, db)
    if role_context["is_data_entry"] and not role_context["is_reviewer"] and not role_context["is_supervisor"]:
        if delivery.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="无权限查看此记录")
    
    filtered_data = apply_field_filter(
        delivery, role_context, DELIVERY_FIELD_CONFIG,
        schema_class=OutsourceDeliverySchema
    )
    return DataResponse(success=True, data=filtered_data)


@router.put("/{delivery_id}", response_model=DataResponse[OutsourceDeliverySchema])
async def update_delivery(
    delivery_id: int,
    delivery_in: OutsourceDeliveryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: bool = Depends(allow_data_entry)
) -> Any:
    delivery = db.query(OutsourceDelivery).filter(OutsourceDelivery.id == delivery_id).first()
    if not delivery:
        raise HTTPException(status_code=404, detail="外协送货单不存在")
    
    role_context = get_user_role_context(current_user, db)
    if role_context["is_data_entry"] and not role_context["is_reviewer"] and not role_context["is_supervisor"]:
        if delivery.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="无权限修改此记录")
    
    update_data = delivery_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(delivery, field, value)
    
    delivery.updated_by = current_user.id
    db.commit()
    db.refresh(delivery)
    
    if delivery.status == "pending":
        queue_service = CompensationQueueService(db)
        queue_service.enqueue(
            business_type="delivery",
            business_key=delivery.idempotent_key,
            business_id=delivery.id
        )
    
    filtered_data = apply_field_filter(
        delivery, role_context, DELIVERY_FIELD_CONFIG,
        schema_class=OutsourceDeliverySchema
    )
    db.commit()
    return DataResponse(success=True, data=filtered_data, message="更新成功")


@router.post("/{delivery_id}/review", response_model=DataResponse)
async def review_delivery(
    delivery_id: int,
    status: str = Query(..., description="审核结果: approved/rejected"),
    remark: Optional[str] = Query(None, description="审核备注"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: bool = Depends(allow_review)
) -> Any:
    delivery = db.query(OutsourceDelivery).filter(OutsourceDelivery.id == delivery_id).first()
    if not delivery:
        raise HTTPException(status_code=404, detail="外协送货单不存在")
    
    delivery.status = status
    delivery.remark = remark
    delivery.updated_by = current_user.id
    db.commit()
    
    if status == "approved":
        queue_service = CompensationQueueService(db)
        queue_service.enqueue(
            business_type="delivery",
            business_key=delivery.idempotent_key,
            business_id=delivery.id
        )
    
    return DataResponse(success=True, message=f"{'审核通过' if status == 'approved' else '审核驳回'}成功")
