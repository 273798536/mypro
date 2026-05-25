from fastapi import Depends, HTTPException, status, Header
from typing import Optional
from app.utils.security import PermissionService, ConflictLockService

permission_service = PermissionService()
conflict_lock_service = ConflictLockService()

permission_service.assign_role("admin", "admin")
permission_service.assign_role("finance", "finance")
permission_service.assign_role("reception", "reception")
permission_service.assign_role("auditor", "auditor")


def get_current_user(x_user_role: Optional[str] = Header(None), x_user_id: Optional[str] = Header(None)):
    return {
        "user_id": x_user_id or "anonymous",
        "role": x_user_role or "auditor",
    }


def require_permission(permission: str, action: str = "操作"):
    def dependency(current_user: dict = Depends(get_current_user)):
        user_id = current_user["user_id"]
        role = current_user["role"]
        
        permission_service.assign_role(user_id, role)
        
        if not permission_service.check_permission(user_id, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"用户 {user_id} (角色: {role}) 无权执行{action}，需要权限: {permission}",
            )
        return current_user
    return Depends(dependency)


def acquire_lock(record_type: str, record_id_param: str = "record_id"):
    def dependency(
        current_user: dict = Depends(get_current_user),
    ):
        user_id = current_user["user_id"]
        return {
            "lock_service": conflict_lock_service,
            "record_type": record_type,
            "user_id": user_id,
        }
    return Depends(dependency)
