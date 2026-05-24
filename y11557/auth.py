from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db, User
from pydantic import BaseModel

SECRET_KEY = "agri_delivery_2024_secret_key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    username: str
    full_name: str
    role: str
    region: str

    class Config:
        from_attributes = True


ROLE_PERMISSIONS = {
    "entry": {
        "visible_fields": [
            "order_no", "store_name", "product_name", "quantity", "amount",
            "driver_name", "receipt_no", "signatory", "actual_quantity", "actual_amount"
        ],
        "actions": ["create_order", "submit_receipt", "view_orders", "view_receipts", "add_supplementary"]
    },
    "reviewer": {
        "visible_fields": [
            "order_no", "store_name", "product_name", "quantity", "amount",
            "driver_name", "receipt_no", "signatory", "actual_quantity", "actual_amount",
            "payment_status", "review_comment", "verified_status"
        ],
        "actions": ["view_orders", "view_receipts", "verify_receipt", "view_failures", "retry_task"]
    },
    "supervisor": {
        "visible_fields": [
            "order_no", "store_name", "region", "product_name", "quantity", "amount",
            "driver_name", "receipt_no", "signatory", "actual_quantity", "actual_amount",
            "payment_status", "review_comment", "verified_status", "compensation_amount",
            "error_message", "retry_count", "is_dead_letter"
        ],
        "actions": ["view_orders", "view_receipts", "verify_receipt", "manual_override",
                    "compensation_post", "close_order", "view_failures", "view_audit",
                    "view_reports", "export_data", "manage_dead_letter"]
    },
    "readonly": {
        "visible_fields": [
            "order_no", "store_name", "product_name", "quantity", "amount",
            "status", "payment_status"
        ],
        "actions": ["view_orders", "view_receipts", "view_reports"]
    }
}


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
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_user(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.username == username).first()


def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    user = get_user(db, username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无法验证凭据",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = get_user(db, username=token_data.username)
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=400, detail="用户已禁用")
    return user


def has_permission(user: User, action: str) -> bool:
    role_perms = ROLE_PERMISSIONS.get(user.role, {})
    allowed_actions = role_perms.get("actions", [])
    return action in allowed_actions or user.role == "supervisor"


def require_permission(action: str):
    def permission_checker(current_user: User = Depends(get_current_user)):
        if not has_permission(current_user, action):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"权限不足: 需要 {action} 权限"
            )
        return current_user
    return permission_checker


def filter_fields_by_role(data: dict, role: str) -> dict:
    role_perms = ROLE_PERMISSIONS.get(role, {})
    visible_fields = role_perms.get("visible_fields", [])
    if role == "supervisor":
        return data
    return {k: v for k, v in data.items() if k in visible_fields}


def init_users(db: Session):
    users = [
        {"username": "entry_user", "password": "entry123", "role": "entry", "full_name": "录入员小王", "region": "华东区"},
        {"username": "reviewer_user", "password": "review123", "role": "reviewer", "full_name": "复核员小李", "region": "华东区"},
        {"username": "supervisor_user", "password": "super123", "role": "supervisor", "full_name": "主管老张", "region": "华东区"},
        {"username": "readonly_user", "password": "read123", "role": "readonly", "full_name": "只读用户", "region": "华东区"},
    ]

    for user_data in users:
        existing = db.query(User).filter(User.username == user_data["username"]).first()
        if not existing:
            db_user = User(
                username=user_data["username"],
                hashed_password=get_password_hash(user_data["password"]),
                role=user_data["role"],
                full_name=user_data["full_name"],
                region=user_data["region"]
            )
            db.add(db_user)
    db.commit()
