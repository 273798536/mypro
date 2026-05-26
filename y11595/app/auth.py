from fastapi import HTTPException, Query, Depends
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models import User, UserRole, Batch, BatchStatus


USERS_DB = {
    "admin": {"password": "admin123", "role": UserRole.ADMIN, "full_name": "系统管理员"},
    "operator": {"password": "oper123", "role": UserRole.OPERATOR, "full_name": "操作员"},
    "reviewer": {"password": "review123", "role": UserRole.REVIEWER, "full_name": "复核员"},
    "settlement": {"password": "settle123", "role": UserRole.SETTLEMENT, "full_name": "结算员"},
}

PERMISSIONS = {
    "create_batch": [UserRole.OPERATOR, UserRole.ADMIN],
    "import_records": [UserRole.OPERATOR, UserRole.ADMIN],
    "review_batch": [UserRole.REVIEWER, UserRole.ADMIN],
    "correct_record": [UserRole.REVIEWER, UserRole.ADMIN],
    "freeze_batch": [UserRole.ADMIN, UserRole.SETTLEMENT],
    "unfreeze_batch": [UserRole.ADMIN, UserRole.SETTLEMENT],
    "settle_batch": [UserRole.SETTLEMENT, UserRole.ADMIN],
    "archive_batch": [UserRole.ADMIN],
    "withdraw_batch": [UserRole.OPERATOR, UserRole.ADMIN],
    "resubmit_batch": [UserRole.OPERATOR, UserRole.ADMIN],
    "upload_attachment": [UserRole.OPERATOR, UserRole.REVIEWER, UserRole.ADMIN],
    "export_summary": [UserRole.SETTLEMENT, UserRole.ADMIN, UserRole.REVIEWER],
    "view_audit_logs": [UserRole.ADMIN, UserRole.REVIEWER, UserRole.SETTLEMENT],
    "view_records": [UserRole.OPERATOR, UserRole.REVIEWER, UserRole.ADMIN, UserRole.SETTLEMENT],
}


def get_user_role(username: str) -> Optional[UserRole]:
    if username in USERS_DB:
        return USERS_DB[username]["role"]
    return UserRole.OPERATOR


def require_permission(permission: str):
    def check_permission(
        operator: str = Query(..., description="操作人用户名"),
        db: Session = Depends(get_db)
    ) -> tuple[str, UserRole]:
        user_role = get_user_role(operator)
        
        allowed_roles = PERMISSIONS.get(permission, [])
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Permission denied: user '{operator}' with role '{user_role.value}' "
                       f"has no permission for operation '{permission}'. "
                       f"Allowed roles: {[r.value for r in allowed_roles]}"
            )
        return operator, user_role
    return check_permission


def require_batch_status_allowed(operation: str, batch: Batch, user_role: UserRole, operator: str):
    from app.state_machine import check_batch_operation_permission
    
    allowed, message = check_batch_operation_permission(batch.status, operation, user_role)
    if not allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Operation '{operation}' not allowed: {message}"
        )
