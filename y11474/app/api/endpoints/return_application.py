from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, ReturnApplication, RecordStatus, RefundRecord
from app.schemas import (
    ReturnApplication as ReturnApplicationSchema,
    ReturnApplicationCreate, ReturnApplicationUpdate,
    StatusTransitionRequest, RefundRecordCreate, RefundRecord as RefundRecordSchema
)
from app.security import get_current_user, RolePermission, require_action
from app.workflow import WorkflowEngine
from app.services import ImportService, LedgerService
from app.utils import safe_model_dump, apply_role_permissions

router = APIRouter()


@router.get("/")
async def list_applications(
    skip: int = 0,
    limit: int = 100,
    status: Optional[RecordStatus] = None,
    supplier_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[Any]:
    query = db.query(ReturnApplication)
    
    if status:
        query = query.filter(ReturnApplication.status == status)
    if supplier_id:
        query = query.filter(ReturnApplication.supplier_id == supplier_id)
    
    applications = query.order_by(ReturnApplication.created_at.desc()).offset(skip).limit(limit).all()
    return [apply_role_permissions(app, current_user.role) for app in applications]


@router.post("/")
async def create_application(
    application_data: ReturnApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_action("create"))
) -> Any:
    data_dict = safe_model_dump(application_data)
    result = ImportService.import_applications(db, [data_dict], current_user)
    
    if result.errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.errors[0]
        )
    
    application = db.query(ReturnApplication).filter(
        ReturnApplication.application_no == application_data.application_no
    ).first()
    return apply_role_permissions(application, current_user.role)


@router.get("/{application_id}")
async def get_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    application = db.query(ReturnApplication).filter(ReturnApplication.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="退供申请不存在")
    return apply_role_permissions(application, current_user.role)


@router.put("/{application_id}")
async def update_application(
    application_id: int,
    update_data: ReturnApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    application = db.query(ReturnApplication).filter(ReturnApplication.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="退供申请不存在")
    
    if not WorkflowEngine.is_editable(application.status, current_user.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"当前状态 {application.status.value} 不允许编辑"
        )
    
    changed_fields = {}
    for field, value in update_data.model_dump(exclude_unset=True).items():
        if not RolePermission.can_edit_field(current_user.role, field):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"无权编辑字段: {field}"
            )
        old_value = getattr(application, field)
        if old_value != value:
            setattr(application, field, value)
            changed_fields[field] = {"old": old_value, "new": value}
    
    if changed_fields:
        from app.models import AuditLog
        audit_log = AuditLog(
            application_id=application.id,
            user_id=current_user.id,
            action="update",
            changed_fields=changed_fields
        )
        db.add(audit_log)
    
    application.updated_by = current_user.id
    db.commit()
    db.refresh(application)
    
    LedgerService.create_or_update_ledger(db, application)
    db.commit()
    db.refresh(application)
    
    return apply_role_permissions(application, current_user.role)


@router.post("/{application_id}/transition")
async def transition_status(
    application_id: int,
    transition_request: StatusTransitionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    application = db.query(ReturnApplication).filter(ReturnApplication.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="退供申请不存在")
    
    try:
        application = WorkflowEngine.transition(
            db, application, transition_request.new_status,
            current_user, transition_request.change_reason
        )
        db.commit()
        db.refresh(application)
        return apply_role_permissions(application, current_user.role)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{application_id}/refund", response_model=RefundRecordSchema)
async def add_refund_record(
    application_id: int,
    refund_data: RefundRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_action("review"))
):
    application = db.query(ReturnApplication).filter(ReturnApplication.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="退供申请不存在")
    
    existing = db.query(RefundRecord).filter(RefundRecord.refund_no == refund_data.refund_no).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"退款单号已存在: {refund_data.refund_no}"
        )
    
    refund = RefundRecord(
        application_id=application_id,
        **refund_data.model_dump()
    )
    db.add(refund)
    db.commit()
    db.refresh(refund)
    
    LedgerService.create_or_update_ledger(db, application)
    db.commit()
    
    return refund


@router.get("/{application_id}/allowed-transitions")
async def get_allowed_transitions(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    application = db.query(ReturnApplication).filter(ReturnApplication.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="退供申请不存在")
    
    allowed = WorkflowEngine.get_allowed_transitions(application.status, current_user.role)
    return {
        "current_status": application.status,
        "allowed_transitions": list(allowed)
    }
