from typing import List, Set
from functools import wraps
from fastapi import HTTPException, Depends, Header
from sqlalchemy.orm import Session
from .database import get_db
from .models import User, UserRole, BatchStatus


class Permission:
    VIEW_BATCH = "view_batch"
    CREATE_BATCH = "create_batch"
    EDIT_BATCH = "edit_batch"
    SUBMIT_BATCH = "submit_batch"
    REVIEW_BATCH = "review_batch"
    APPROVE_BATCH = "approve_batch"
    REJECT_BATCH = "reject_batch"
    FREEZE_BATCH = "freeze_batch"
    UNFREEZE_BATCH = "unfreeze_batch"
    ARCHIVE_BATCH = "archive_batch"
    UNARCHIVE_BATCH = "unarchive_batch"
    UPLOAD_ATTACHMENT = "upload_attachment"
    ADD_COMMENT = "add_comment"
    RESOLVE_DIRTY = "resolve_dirty"
    EXPORT_DATA = "export_data"
    MANAGE_USERS = "manage_users"


ROLE_PERMISSIONS = {
    UserRole.DATA_ENTRY: {
        Permission.VIEW_BATCH,
        Permission.CREATE_BATCH,
        Permission.EDIT_BATCH,
        Permission.SUBMIT_BATCH,
        Permission.UPLOAD_ATTACHMENT,
        Permission.ADD_COMMENT,
    },
    UserRole.REVIEWER: {
        Permission.VIEW_BATCH,
        Permission.REVIEW_BATCH,
        Permission.APPROVE_BATCH,
        Permission.REJECT_BATCH,
        Permission.UPLOAD_ATTACHMENT,
        Permission.ADD_COMMENT,
        Permission.RESOLVE_DIRTY,
        Permission.EXPORT_DATA,
    },
    UserRole.SUPERVISOR: {
        Permission.VIEW_BATCH,
        Permission.CREATE_BATCH,
        Permission.EDIT_BATCH,
        Permission.SUBMIT_BATCH,
        Permission.REVIEW_BATCH,
        Permission.APPROVE_BATCH,
        Permission.REJECT_BATCH,
        Permission.FREEZE_BATCH,
        Permission.UNFREEZE_BATCH,
        Permission.ARCHIVE_BATCH,
        Permission.UNARCHIVE_BATCH,
        Permission.UPLOAD_ATTACHMENT,
        Permission.ADD_COMMENT,
        Permission.RESOLVE_DIRTY,
        Permission.EXPORT_DATA,
        Permission.MANAGE_USERS,
    },
    UserRole.READ_ONLY: {
        Permission.VIEW_BATCH,
    },
}


STATUS_ALLOWED_ACTIONS = {
    BatchStatus.DRAFT: {
        Permission.EDIT_BATCH,
        Permission.SUBMIT_BATCH,
        Permission.UPLOAD_ATTACHMENT,
        Permission.ADD_COMMENT,
    },
    BatchStatus.SUBMITTED: {
        Permission.REVIEW_BATCH,
        Permission.REJECT_BATCH,
        Permission.UPLOAD_ATTACHMENT,
        Permission.ADD_COMMENT,
    },
    BatchStatus.UNDER_REVIEW: {
        Permission.APPROVE_BATCH,
        Permission.REJECT_BATCH,
        Permission.RESOLVE_DIRTY,
        Permission.UPLOAD_ATTACHMENT,
        Permission.ADD_COMMENT,
    },
    BatchStatus.APPROVED: {
        Permission.FREEZE_BATCH,
        Permission.ARCHIVE_BATCH,
        Permission.EXPORT_DATA,
        Permission.ADD_COMMENT,
    },
    BatchStatus.FROZEN: {
        Permission.VIEW_BATCH,
        Permission.UNFREEZE_BATCH,
        Permission.EXPORT_DATA,
        Permission.ADD_COMMENT,
    },
    BatchStatus.ARCHIVED: {
        Permission.VIEW_BATCH,
        Permission.UNARCHIVE_BATCH,
        Permission.EXPORT_DATA,
    },
    BatchStatus.REJECTED: {
        Permission.EDIT_BATCH,
        Permission.SUBMIT_BATCH,
        Permission.UPLOAD_ATTACHMENT,
        Permission.ADD_COMMENT,
    },
}


def get_role_permissions(role: UserRole) -> Set[str]:
    return ROLE_PERMISSIONS.get(role, set())


def has_permission(user: User, permission: str) -> bool:
    user_permissions = get_role_permissions(user.role)
    return permission in user_permissions


def can_perform_action_on_batch(user: User, permission: str, batch_status: BatchStatus) -> bool:
    if not has_permission(user, permission):
        return False
    status_actions = STATUS_ALLOWED_ACTIONS.get(batch_status, set())
    return permission in status_actions


def require_permission(permission: str):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            user = kwargs.get('current_user')
            if not user:
                for arg in args:
                    if hasattr(arg, 'role'):
                        user = arg
                        break
            if not user or not has_permission(user, permission):
                raise HTTPException(status_code=403, detail=f"Permission denied: {permission}")
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def get_current_user(x_user_id: int = Header(..., alias="X-User-Id"), db: Session = Depends(get_db)) -> User:
    user = db.query(User).filter(User.id == x_user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def get_current_user_with_permission(required_permission: str):
    def _get_user(x_user_id: int = Header(..., alias="X-User-Id"), db: Session = Depends(get_db)) -> User:
        user = db.query(User).filter(User.id == x_user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        if not has_permission(user, required_permission):
            raise HTTPException(status_code=403, detail=f"Permission denied: {required_permission}")
        return user
    return _get_user
