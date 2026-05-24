from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.auth import get_current_active_user, require_roles
from app import models, schemas
from app.enums import UserRole, ReturnApplicationStatus, OperationType
from app.services import generate_no, AuditService

router = APIRouter(prefix="/api/return-applications", tags=["退供申请"])


@router.get("/", response_model=List[schemas.ReturnApplication])
def list_applications(
    skip: int = 0,
    limit: int = 100,
    status: Optional[ReturnApplicationStatus] = None,
    supplier_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    query = db.query(models.ReturnApplication)

    if status:
        query = query.filter(models.ReturnApplication.status == status)
    if supplier_id:
        query = query.filter(models.ReturnApplication.supplier_id == supplier_id)

    return query.order_by(desc(models.ReturnApplication.created_at)).offset(skip).limit(limit).all()


@router.post("/", response_model=schemas.ReturnApplication)
def create_application(
    application_data: schemas.ReturnApplicationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.WAREHOUSE_STAFF, UserRole.PROCUREMENT_STAFF, UserRole.ADMIN)),
):
    total_items = len(application_data.items)
    total_amount = sum(item.amount for item in application_data.items)

    application = models.ReturnApplication(
        application_no=generate_no("RA"),
        supplier_id=application_data.supplier_id,
        supplier_name=application_data.supplier_name,
        warehouse_id=application_data.warehouse_id,
        description=application_data.description,
        total_items=total_items,
        total_amount=total_amount,
        created_by=current_user.id,
    )

    for item_data in application_data.items:
        item = models.ReturnItem(
            sku_code=item_data.sku_code,
            sku_name=item_data.sku_name,
            batch_no=item_data.batch_no,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            amount=item_data.amount,
        )
        application.items.append(item)

    db.add(application)
    db.commit()
    db.refresh(application)

    AuditService.log_operation(
        db,
        OperationType.CREATE,
        current_user,
        application_id=application.id,
        new_status=ReturnApplicationStatus.DRAFT.value,
        change_reason="创建退供申请",
        field_changes={"application_no": application.application_no},
    )
    db.commit()

    return application


@router.get("/{application_id}", response_model=schemas.ReturnApplication)
def get_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    application = db.query(models.ReturnApplication).filter(
        models.ReturnApplication.id == application_id
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="申请不存在")
    return application


@router.put("/{application_id}", response_model=schemas.ReturnApplication)
def update_application(
    application_id: int,
    update_data: schemas.ReturnApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.WAREHOUSE_STAFF, UserRole.PROCUREMENT_STAFF, UserRole.ADMIN)),
):
    application = db.query(models.ReturnApplication).filter(
        models.ReturnApplication.id == application_id
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="申请不存在")

    old_status = enum_value(application.status)
    field_changes = {}

    for key, value in update_data.model_dump(exclude_unset=True).items():
        if hasattr(application, key) and value is not None:
            old_value = getattr(application, key)
            setattr(application, key, value)
            field_changes[key] = {"old": old_value, "new": value}

    application.updated_by = current_user.id
    db.commit()
    db.refresh(application)

    AuditService.log_operation(
        db,
        OperationType.UPDATE,
        current_user,
        application_id=application.id,
        old_status=old_status,
        new_status=enum_value(application.status) if update_data.status else old_status,
        change_reason="更新退供申请",
        field_changes=field_changes,
    )
    db.commit()

    return application


@router.post("/{application_id}/submit", response_model=schemas.ReturnApplication)
def submit_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.WAREHOUSE_STAFF, UserRole.PROCUREMENT_STAFF, UserRole.ADMIN)),
):
    application = db.query(models.ReturnApplication).filter(
        models.ReturnApplication.id == application_id
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="申请不存在")

    if application.status != ReturnApplicationStatus.DRAFT:
        raise HTTPException(status_code=400, detail="只能提交草稿状态的申请")

    old_status = enum_value(application.status)
    application.status = ReturnApplicationStatus.SUBMITTED
    application.updated_by = current_user.id
    db.commit()
    db.refresh(application)

    AuditService.log_operation(
        db,
        OperationType.SUBMIT,
        current_user,
        application_id=application.id,
        old_status=old_status,
        new_status=enum_value(ReturnApplicationStatus.SUBMITTED),
        change_reason="提交退供申请",
    )
    db.commit()

    return application


@router.post("/{application_id}/withdraw", response_model=schemas.ReturnApplication)
def withdraw_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.WAREHOUSE_STAFF, UserRole.PROCUREMENT_STAFF, UserRole.ADMIN)),
):
    application = db.query(models.ReturnApplication).filter(
        models.ReturnApplication.id == application_id
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="申请不存在")

    if application.status not in [ReturnApplicationStatus.SUBMITTED, ReturnApplicationStatus.QUALITY_CHECKING]:
        raise HTTPException(status_code=400, detail="当前状态无法撤回")

    old_status = enum_value(application.status)
    application.status = ReturnApplicationStatus.DRAFT
    application.updated_by = current_user.id
    db.commit()
    db.refresh(application)

    AuditService.log_operation(
        db,
        OperationType.WITHDRAW,
        current_user,
        application_id=application.id,
        old_status=old_status,
        new_status=ReturnApplicationStatus.DRAFT.value,
        change_reason="撤回退供申请",
    )
    db.commit()

    return application


@router.post("/{application_id}/resubmit", response_model=schemas.ReturnApplication)
def resubmit_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.WAREHOUSE_STAFF, UserRole.PROCUREMENT_STAFF, UserRole.ADMIN)),
):
    application = db.query(models.ReturnApplication).filter(
        models.ReturnApplication.id == application_id
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="申请不存在")

    if application.status != ReturnApplicationStatus.DRAFT:
        raise HTTPException(status_code=400, detail="只能重新提交草稿状态的申请")

    old_status = enum_value(application.status)
    application.status = ReturnApplicationStatus.SUBMITTED
    application.updated_by = current_user.id
    db.commit()
    db.refresh(application)

    AuditService.log_operation(
        db,
        OperationType.RESUBMIT,
        current_user,
        application_id=application.id,
        old_status=old_status,
        new_status=enum_value(ReturnApplicationStatus.SUBMITTED),
        change_reason="重新提交退供申请",
    )
    db.commit()

    return application
