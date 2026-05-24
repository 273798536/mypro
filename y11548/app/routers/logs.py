from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..auth import get_current_active_user, require_roles
from ..models import User, UserRole, OperationLog
from ..schemas import OperationLogResponse

router = APIRouter(prefix="/logs", tags=["操作日志"])


@router.get("", response_model=list[OperationLogResponse])
async def list_operation_logs(
    table_name: str = None,
    record_id: int = None,
    operation_type: str = None,
    created_by: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.REVIEWER, UserRole.SUPERVISOR))
):
    query = db.query(OperationLog).order_by(OperationLog.created_at.desc())
    if table_name:
        query = query.filter(OperationLog.table_name == table_name)
    if record_id:
        query = query.filter(OperationLog.record_id == record_id)
    if operation_type:
        query = query.filter(OperationLog.operation_type == operation_type)
    if created_by:
        query = query.filter(OperationLog.created_by == created_by)
    
    return query.offset(skip).limit(limit).all()


@router.get("/record/{table_name}/{record_id}")
async def get_record_history(
    table_name: str,
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    logs = db.query(OperationLog).filter(
        OperationLog.table_name == table_name,
        OperationLog.record_id == record_id
    ).order_by(OperationLog.created_at).all()
    
    return {
        "table_name": table_name,
        "record_id": record_id,
        "change_count": len(logs),
        "history": [
            {
                "operation": log.operation_type,
                "time": log.created_at,
                "operator_id": log.created_by,
                "old_value": log.old_value,
                "new_value": log.new_value
            }
            for log in logs
        ]
    }
