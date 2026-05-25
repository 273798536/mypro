import jwt
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_settings
from database import get_db
from models import Role
from services import UserRoleService

settings = get_settings()

security = HTTPBearer(auto_error=False)


def create_token(username: str, role: str, site_name: Optional[str] = None) -> str:
    payload = {
        "sub": username,
        "role": role,
        "site_name": site_name,
        "exp": datetime.utcnow() + timedelta(hours=24)
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token已过期"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的Token"
        )


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> dict:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="缺少认证凭证"
        )

    token = credentials.credentials
    payload = decode_token(token)

    username = payload.get("sub")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的用户凭证"
        )

    user_role = await UserRoleService.get_user_role(db, username)
    if not user_role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户不存在或无权限"
        )

    return {
        "username": username,
        "role": user_role.role,
        "site_name": user_role.site_name,
        "permissions": user_role.permissions
    }


def require_roles(*allowed_roles: Role):
    async def role_checker(current_user: dict = Depends(get_current_user)) -> dict:
        user_role_str = current_user.get("role")
        allowed_role_values = [r.value for r in allowed_roles]

        if user_role_str not in allowed_role_values and user_role_str != Role.ADMIN.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"需要角色: {', '.join(allowed_role_values)}"
            )
        return current_user
    return role_checker


def require_permissions(*required_permissions: str):
    async def permission_checker(current_user: dict = Depends(get_current_user)) -> dict:
        user_permissions = current_user.get("permissions", [])
        if "all" in user_permissions:
            return current_user

        for perm in required_permissions:
            if perm in user_permissions:
                return current_user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"需要权限之一: {', '.join(required_permissions)}"
        )
    return permission_checker
