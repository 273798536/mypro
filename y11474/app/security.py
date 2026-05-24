from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Set
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User, UserRole

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
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
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
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户已被禁用"
        )
    return user


class RolePermission:
    READABLE_FIELDS: Dict[UserRole, Set[str]] = {
        UserRole.DATA_ENTRY: {
            "id", "application_no", "batch_no", "sku_code", "sku_name",
            "supplier_id", "supplier_name", "return_quantity", "return_reason",
            "application_date", "applicant", "warehouse_id", "warehouse_name",
            "status", "created_at", "updated_at",
            "inspection_photos", "logistics_receipts"
        },
        UserRole.REVIEWER: {
            "id", "application_no", "batch_no", "sku_code", "sku_name",
            "supplier_id", "supplier_name", "supplier_contact", "supplier_phone",
            "return_quantity", "return_reason", "application_date", "applicant",
            "warehouse_id", "warehouse_name", "status", "created_at", "updated_at",
            "inspection_photos", "logistics_receipts", "refund_records", "ledger",
            "dirty_records"
        },
        UserRole.SUPERVISOR: {
            "id", "application_no", "batch_no", "sku_code", "sku_name",
            "supplier_id", "supplier_name", "supplier_contact", "supplier_phone",
            "return_quantity", "return_reason", "application_date", "applicant",
            "warehouse_id", "warehouse_name", "status", "created_at", "updated_at",
            "inspection_photos", "logistics_receipts", "refund_records", "ledger",
            "dirty_records", "audit_logs", "created_by", "updated_by", "raw_data"
        },
        UserRole.READ_ONLY: {
            "id", "application_no", "batch_no", "sku_code", "sku_name",
            "supplier_id", "supplier_name", "return_quantity",
            "application_date", "warehouse_name", "status", "created_at"
        }
    }

    WRITABLE_FIELDS: Dict[UserRole, Set[str]] = {
        UserRole.DATA_ENTRY: {
            "application_no", "batch_no", "sku_code", "sku_name",
            "supplier_id", "supplier_name", "return_quantity", "return_reason",
            "application_date", "applicant", "warehouse_id", "warehouse_name",
            "inspection_photos", "logistics_receipts"
        },
        UserRole.REVIEWER: {
            "return_quantity", "return_reason", "supplier_contact", "supplier_phone",
            "inspection_photos", "logistics_receipts", "refund_records", "ledger"
        },
        UserRole.SUPERVISOR: {
            "return_quantity", "return_reason", "supplier_contact", "supplier_phone",
            "inspection_photos", "logistics_receipts", "refund_records", "ledger",
            "dirty_records", "status"
        },
        UserRole.READ_ONLY: set()
    }

    ALLOWED_ACTIONS: Dict[UserRole, Set[str]] = {
        UserRole.DATA_ENTRY: {"create", "update_draft", "submit", "view"},
        UserRole.REVIEWER: {"view", "review", "reject", "second_confirm"},
        UserRole.SUPERVISOR: {"view", "review", "reject", "second_confirm", "approve", "close", "export", "audit"},
        UserRole.READ_ONLY: {"view"}
    }

    @classmethod
    def filter_readable_fields(cls, data: Dict[str, Any], role: UserRole) -> Dict[str, Any]:
        readable = cls.READABLE_FIELDS.get(role, cls.READABLE_FIELDS[UserRole.READ_ONLY])
        return {k: v for k, v in data.items() if k in readable}

    @classmethod
    def filter_writable_fields(cls, data: Dict[str, Any], role: UserRole) -> Dict[str, Any]:
        writable = cls.WRITABLE_FIELDS.get(role, set())
        return {k: v for k, v in data.items() if k in writable}

    @classmethod
    def can_perform_action(cls, role: UserRole, action: str) -> bool:
        return action in cls.ALLOWED_ACTIONS.get(role, set())

    @classmethod
    def can_edit_field(cls, role: UserRole, field: str) -> bool:
        return field in cls.WRITABLE_FIELDS.get(role, set())


def require_roles(*allowed_roles: UserRole):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"需要以下角色之一: {[r.value for r in allowed_roles]}"
            )
        return current_user
    return role_checker


def require_action(action: str):
    def action_checker(current_user: User = Depends(get_current_user)) -> User:
        if not RolePermission.can_perform_action(current_user.role, action):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"角色 {current_user.role.value} 无权限执行: {action}"
            )
        return current_user
    return action_checker
