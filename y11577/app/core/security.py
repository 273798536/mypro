from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.auth import User, Role, Permission

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无法验证凭据",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user


async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="用户已禁用")
    return current_user


class RoleChecker:
    def __init__(self, allowed_roles: list):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_active_user)) -> bool:
        user_role_codes = [role.code for role in user.roles]
        if not any(role in user_role_codes for role in self.allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="权限不足"
            )
        return True


class PermissionChecker:
    def __init__(self, required_permissions: list):
        self.required_permissions = required_permissions

    def __call__(self, user: User = Depends(get_current_active_user), db: Session = Depends(get_db)) -> bool:
        user_permissions = set()
        for role in user.roles:
            for perm in role.permissions:
                user_permissions.add(perm.code)
        
        if not all(perm in user_permissions for perm in self.required_permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="权限不足"
            )
        return True


def get_user_role_context(user: User, db: Session) -> dict:
    roles = [{"code": r.code, "name": r.name} for r in user.roles]
    permissions = []
    for role in user.roles:
        for perm in role.permissions:
            permissions.append({"code": perm.code, "name": perm.name})
    
    return {
        "user_id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "roles": roles,
        "permissions": permissions,
        "is_data_entry": any(r["code"] == "data_entry" for r in roles),
        "is_reviewer": any(r["code"] == "reviewer" for r in roles),
        "is_supervisor": any(r["code"] == "supervisor" for r in roles),
        "is_readonly": any(r["code"] == "readonly" for r in roles),
    }


def filter_fields_by_role(data: dict, role_context: dict, field_config: dict) -> dict:
    if role_context["is_supervisor"]:
        return data
    
    result = {}
    for field, value in data.items():
        if field not in field_config:
            result[field] = value
            continue
        
        visibility = field_config[field]
        if role_context["is_readonly"] and visibility not in ["readonly", "all"]:
            continue
        if role_context["is_data_entry"] and visibility not in ["entry", "readonly", "all"]:
            continue
        if role_context["is_reviewer"] and visibility not in ["review", "entry", "readonly", "all"]:
            continue
        result[field] = value
    
    return result
