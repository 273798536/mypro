from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models import User, UserRole

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


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


def get_user(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.username == username).first()


def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    user = get_user(db, username)
    if not user or not verify_password(password, user.hashed_password):
        return None
    if not user.is_active:
        return None
    return user


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
    user = get_user(db, username=username)
    if user is None:
        raise credentials_exception
    return user


class RolePermission:
    @staticmethod
    def get_visible_fields(role: UserRole, table: str) -> List[str]:
        field_permissions = {
            "leader_refunds": {
                UserRole.DATA_ENTRY: ["id", "refund_no", "order_no", "leader_id", "leader_name", 
                                     "city", "refund_amount", "compensation_amount", "issue_type", 
                                     "remark", "submitted_at", "is_verified", "source", "batch_no"],
                UserRole.REVIEWER: ["id", "refund_no", "order_no", "leader_id", "leader_name", 
                                   "city", "refund_amount", "compensation_amount", "issue_type", 
                                   "remark", "submitted_at", "is_verified", "verified_by", 
                                   "verified_at", "source", "batch_no"],
                UserRole.SUPERVISOR: ["*"],
                UserRole.READ_ONLY: ["id", "refund_no", "order_no", "leader_name", "city", 
                                    "refund_amount", "compensation_amount", "issue_type", 
                                    "submitted_at", "is_verified", "source"]
            },
            "warehouse_reviews": {
                UserRole.DATA_ENTRY: ["id", "review_no", "order_no", "sku_code", "sku_name", "city",
                                     "shortage_qty", "damaged_qty", "unit_price", "compensation_amount",
                                     "issue_type", "reviewer_id", "reviewed_at", "is_verified", 
                                     "source", "batch_no"],
                UserRole.REVIEWER: ["*"],
                UserRole.SUPERVISOR: ["*"],
                UserRole.READ_ONLY: ["id", "review_no", "order_no", "sku_name", "city",
                                    "compensation_amount", "issue_type", "reviewed_at", 
                                    "is_verified", "source"]
            },
            "user_remarks": {
                UserRole.DATA_ENTRY: ["id", "remark_no", "order_no", "user_id", "user_name", 
                                     "city", "content", "issue_type", "compensation_amount", 
                                     "submitted_at", "is_verified", "source", "batch_no"],
                UserRole.REVIEWER: ["*"],
                UserRole.SUPERVISOR: ["*"],
                UserRole.READ_ONLY: ["id", "remark_no", "order_no", "user_name", "city",
                                    "content", "issue_type", "compensation_amount", 
                                    "submitted_at", "is_verified", "source"]
            },
            "manual_price_adjusts": {
                UserRole.DATA_ENTRY: ["id", "adjust_no", "order_no", "city", "original_price",
                                     "adjusted_price", "price_diff", "compensation_amount",
                                     "reason", "operator_id", "operated_at", "is_verified",
                                     "source", "batch_no"],
                UserRole.REVIEWER: ["*"],
                UserRole.SUPERVISOR: ["*"],
                UserRole.READ_ONLY: ["id", "adjust_no", "order_no", "city", "price_diff",
                                    "compensation_amount", "reason", "operated_at", 
                                    "is_verified", "source"]
            },
            "compensation_queues": {
                UserRole.DATA_ENTRY: ["id", "queue_no", "order_no", "city", "source_type",
                                     "issue_type", "compensation_amount", "status", "retry_count",
                                     "retry_category", "created_at", "batch_no"],
                UserRole.REVIEWER: ["id", "queue_no", "order_no", "city", "source_type", "source_id",
                                   "source_table", "issue_type", "compensation_amount", "actual_compensation",
                                   "status", "retry_count", "max_retries", "retry_category",
                                   "last_retry_at", "next_retry_at", "assigned_to", "completed_at",
                                   "external_receipt_id", "external_receipt_status", "created_at", "batch_no"],
                UserRole.SUPERVISOR: ["*"],
                UserRole.READ_ONLY: ["id", "queue_no", "order_no", "city", "source_type",
                                    "issue_type", "compensation_amount", "status", "retry_count",
                                    "retry_category", "created_at"]
            }
        }
        
        table_perms = field_permissions.get(table, {})
        return table_perms.get(role, ["id"])

    @staticmethod
    def get_allowed_actions(role: UserRole) -> List[str]:
        action_permissions = {
            UserRole.DATA_ENTRY: ["create", "view"],
            UserRole.REVIEWER: ["create", "view", "update", "verify", "assign"],
            UserRole.SUPERVISOR: ["create", "view", "update", "delete", "verify", "assign", 
                                 "manual_takeover", "close", "retry", "export", "import"],
            UserRole.READ_ONLY: ["view", "export"]
        }
        return action_permissions.get(role, ["view"])

    @staticmethod
    def can_perform_action(role: UserRole, action: str) -> bool:
        return action in RolePermission.get_allowed_actions(role)

    @staticmethod
    def filter_fields_by_role(data: Dict[str, Any], role: UserRole, table: str) -> Dict[str, Any]:
        visible_fields = RolePermission.get_visible_fields(role, table)
        if "*" in visible_fields:
            return data
        return {k: v for k, v in data.items() if k in visible_fields}


def require_role(allowed_roles: List[UserRole]):
    def role_dependency(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="权限不足"
            )
        return current_user
    return role_dependency
