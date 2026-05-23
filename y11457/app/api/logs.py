from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user
from app.models import User, UserRole
from app.schemas import OperationLogResponse
from app.services import OperationLogService
from app.models import OperationLog

router = APIRouter(prefix="/logs", tags=["操作日志"])


@router.get("/", response_model=List[OperationLogResponse])
async def list_operation_logs(
    user_id: Optional[int] = None,
    table_name: Optional[str] = None,
    action: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == UserRole.DATA_ENTRY:
        raise HTTPException(status_code=403, detail="权限不足")
    
    query = db.query(OperationLog)
    
    if user_id:
        query = query.filter(OperationLog.user_id == user_id)
    if table_name:
        query = query.filter(OperationLog.table_name == table_name)
    if action:
        query = query.filter(OperationLog.action == action)
    
    logs = query.order_by(OperationLog.created_at.desc()).offset(skip).limit(limit).all()
    return logs


@router.get("/record/{table_name}/{record_id}", response_model=List[OperationLogResponse])
async def get_record_history(
    table_name: str,
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == UserRole.DATA_ENTRY:
        raise HTTPException(status_code=403, detail="权限不足")
    
    logs = OperationLogService.get_record_history(db, table_name, record_id)
    return logs


@router.get("/diff/{table_name}/{record_id}")
async def get_record_diff_history(
    table_name: str,
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == UserRole.DATA_ENTRY:
        raise HTTPException(status_code=403, detail="权限不足")
    
    logs = OperationLogService.get_record_history(db, table_name, record_id)
    
    diff_history = []
    for log in logs:
        diff_entry = {
            "timestamp": log.created_at,
            "operator": log.user_name,
            "action": log.action,
            "field": log.field_name,
            "diff": {
                "old_value": log.old_value,
                "new_value": log.new_value
            },
            "full_diff": log.diff_data
        }
        diff_history.append(diff_entry)
    
    return {
        "table_name": table_name,
        "record_id": record_id,
        "change_count": len(diff_history),
        "diff_history": diff_history
    }
