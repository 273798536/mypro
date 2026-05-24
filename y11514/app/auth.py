from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, UserRole
from app.schemas import TokenData

SECRET_KEY = "your-secret-key-here-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120

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
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
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
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户已被禁用"
        )
    return user


class RoleChecker:
    def __init__(self, allowed_roles: list):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_user)) -> User:
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"权限不足。需要角色: {', '.join([r.value for r in self.allowed_roles])}"
            )
        return user


allow_data_entry = RoleChecker([UserRole.DATA_ENTRY, UserRole.REVIEWER, UserRole.SUPERVISOR])
allow_reviewer = RoleChecker([UserRole.REVIEWER, UserRole.SUPERVISOR])
allow_supervisor = RoleChecker([UserRole.SUPERVISOR])
allow_all_authenticated = RoleChecker([UserRole.DATA_ENTRY, UserRole.REVIEWER, UserRole.SUPERVISOR, UserRole.READ_ONLY])


def get_sensitive_fields_for_role(role: UserRole) -> dict:
    field_permissions = {
        UserRole.DATA_ENTRY: {
            "visible": [
                "id", "application_no", "reader_name", "reader_id", "reader_department",
                "book_title", "book_isbn", "book_author", "lending_library", "borrowing_library",
                "apply_date", "expected_return_date", "actual_return_date", "renew_count",
                "status", "record_status", "created_at", "updated_at"
            ],
            "editable": [
                "reader_name", "reader_id", "reader_department", "book_title", "book_isbn",
                "book_author", "lending_library", "borrowing_library", "apply_date",
                "expected_return_date", "actual_return_date", "renew_count", "processing_notes"
            ]
        },
        UserRole.REVIEWER: {
            "visible": [
                "id", "application_no", "reader_name", "reader_id", "reader_department",
                "book_title", "book_isbn", "book_author", "lending_library", "borrowing_library",
                "apply_date", "expected_return_date", "actual_return_date", "renew_count",
                "status", "record_status", "created_by", "created_at", "updated_by", "updated_at",
                "processing_notes", "rejection_reason", "raw_original_data"
            ],
            "editable": [
                "status", "record_status", "processing_notes", "rejection_reason"
            ]
        },
        UserRole.SUPERVISOR: {
            "visible": "__all__",
            "editable": "__all__"
        },
        UserRole.READ_ONLY: {
            "visible": [
                "id", "application_no", "reader_name", "reader_id", "book_title", "lending_library",
                "borrowing_library", "apply_date", "status", "record_status",
                "created_by", "created_at", "updated_by", "updated_at"
            ],
            "editable": []
        }
    }
    return field_permissions.get(role, field_permissions[UserRole.READ_ONLY])


def mask_sensitive_data(data: dict, role: UserRole) -> dict:
    permissions = get_sensitive_fields_for_role(role)
    
    if permissions["visible"] == "__all__":
        return data
    
    result = {}
    for field in permissions["visible"]:
        if field in data:
            result[field] = data[field]
    
    if "reader_id" in result and role == UserRole.READ_ONLY:
        reader_id = result["reader_id"]
        if len(reader_id) > 4:
            result["reader_id"] = reader_id[:2] + "*" * (len(reader_id) - 4) + reader_id[-2:]
    
    return result
