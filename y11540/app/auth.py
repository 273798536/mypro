from datetime import datetime, timedelta
from typing import Optional, List
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from functools import wraps

from app.config import settings
from app.database import get_db
from app.models import User, UserRole
from app.schemas import TokenData

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


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


def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无法验证凭据",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    return user


class RoleChecker:
    def __init__(self, allowed_roles: List[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_user)) -> User:
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"权限不足，需要角色: {[r.value for r in self.allowed_roles]}"
            )
        return user


allow_data_entry = RoleChecker([UserRole.DATA_ENTRY, UserRole.REVIEWER, UserRole.SUPERVISOR])
allow_reviewer = RoleChecker([UserRole.REVIEWER, UserRole.SUPERVISOR])
allow_supervisor = RoleChecker([UserRole.SUPERVISOR])
allow_viewer = RoleChecker([UserRole.VIEWER, UserRole.DATA_ENTRY, UserRole.REVIEWER, UserRole.SUPERVISOR])


def get_field_visibility_map(role: UserRole) -> dict:
    base_fields = {
        "id": True,
        "receipt_no": True,
        "material_id": True,
        "status": True,
        "has_dirty": True,
        "created_at": True,
    }
    
    viewer_fields = {
        **base_fields,
        "material_name": True,
        "platform": True,
        "report_date": True,
    }
    
    data_entry_fields = {
        **viewer_fields,
        "daily_cost": True,
        "daily_impressions": True,
        "daily_clicks": True,
        "review_result": True,
        "secondary_confirmation": True,
        "raw_data": False,
    }
    
    reviewer_fields = {
        **data_entry_fields,
        "review_comment": True,
        "review_remark": True,
        "process_opinion": True,
        "raw_data": True,
    }
    
    supervisor_fields = {
        **reviewer_fields,
        "freeze_reason": True,
        "prev_status": True,
        "created_by": True,
        "reviewed_by": True,
        "dirty_types": True,
    }
    
    field_maps = {
        UserRole.VIEWER: viewer_fields,
        UserRole.DATA_ENTRY: data_entry_fields,
        UserRole.REVIEWER: reviewer_fields,
        UserRole.SUPERVISOR: supervisor_fields,
    }
    
    return field_maps.get(role, viewer_fields)


def filter_fields_by_role(data: dict, role: UserRole) -> dict:
    visibility = get_field_visibility_map(role)
    return {k: v for k, v in data.items() if visibility.get(k, False)}
