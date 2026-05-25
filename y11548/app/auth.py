from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .config import get_settings
from .database import get_db
from .models import User, UserRole
from .schemas import TokenData

settings = get_settings()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
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
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = get_user(db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def require_roles(*allowed_roles: UserRole):
    def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required roles: {[r.value for r in allowed_roles]}"
            )
        return current_user
    return role_checker


def can_create(current_user: User) -> bool:
    return current_user.role in [UserRole.DATA_ENTRY, UserRole.REVIEWER, UserRole.SUPERVISOR]


def can_review(current_user: User) -> bool:
    return current_user.role in [UserRole.REVIEWER, UserRole.SUPERVISOR]


def can_freeze(current_user: User) -> bool:
    return current_user.role == UserRole.SUPERVISOR


def can_export(current_user: User) -> bool:
    return current_user.role in [UserRole.REVIEWER, UserRole.SUPERVISOR]


def get_visible_fields_for_role(role: UserRole, resource_type: str = "material") -> list:
    base_material_fields = ["id", "batch_id", "material_code", "material_name", "quantity", "status", "created_at"]
    base_batch_fields = ["id", "batch_no", "exhibition_name", "location", "start_date", "end_date", "status", "created_at"]
    base_borrow_fields = ["id", "batch_id", "borrow_no", "material_code", "material_name", "quantity", "status", "borrow_date", "created_at"]
    base_common_fields = ["id", "status", "created_at"]
    
    field_configs = {
        "material": {
            UserRole.READ_ONLY: base_material_fields,
            UserRole.DATA_ENTRY: base_material_fields + ["category", "specification", "unit", "warehouse_location", "remark"],
            UserRole.REVIEWER: base_material_fields + ["category", "specification", "unit", "warehouse_location", "remark", "created_by", "updated_at"],
            UserRole.SUPERVISOR: ["*"]
        },
        "logistics": {
            UserRole.READ_ONLY: base_common_fields + ["batch_id", "material_code", "material_name", "quantity", "receive_date"],
            UserRole.DATA_ENTRY: base_common_fields + ["batch_id", "material_code", "material_name", "quantity", "receive_date", "waybill_no", "logistics_company", "sender", "receiver", "package_condition", "is_damaged", "remark"],
            UserRole.REVIEWER: base_common_fields + ["batch_id", "material_code", "material_name", "quantity", "receive_date", "waybill_no", "logistics_company", "sender", "receiver", "package_condition", "is_damaged", "damage_description", "remark", "created_by", "updated_at"],
            UserRole.SUPERVISOR: ["*"]
        },
        "borrow": {
            UserRole.READ_ONLY: base_borrow_fields + ["borrower_name", "is_returned", "return_quantity"],
            UserRole.DATA_ENTRY: base_borrow_fields + ["borrower_name", "borrower_phone", "borrower_department", "expected_return_date", "actual_return_date", "is_returned", "return_quantity", "remark"],
            UserRole.REVIEWER: base_borrow_fields + ["borrower_name", "borrower_phone", "borrower_department", "expected_return_date", "actual_return_date", "is_returned", "return_quantity", "remark", "created_by", "updated_at"],
            UserRole.SUPERVISOR: ["*"]
        },
        "scan": {
            UserRole.READ_ONLY: base_common_fields + ["batch_id", "material_code", "material_name", "scan_type", "quantity", "scan_time"],
            UserRole.DATA_ENTRY: base_common_fields + ["batch_id", "material_code", "material_name", "scan_type", "quantity", "scan_time", "scanner", "location", "scan_no", "remark"],
            UserRole.REVIEWER: base_common_fields + ["batch_id", "material_code", "material_name", "scan_type", "quantity", "scan_time", "scanner", "location", "scan_no", "remark", "created_by", "updated_at"],
            UserRole.SUPERVISOR: ["*"]
        },
        "batch": {
            UserRole.READ_ONLY: base_batch_fields,
            UserRole.DATA_ENTRY: base_batch_fields + ["description", "updated_at"],
            UserRole.REVIEWER: base_batch_fields + ["description", "created_by", "updated_at", "frozen_at", "frozen_by"],
            UserRole.SUPERVISOR: ["*"]
        },
        "import": {
            UserRole.READ_ONLY: ["id", "task_no", "batch_id", "import_type", "status", "total_count", "success_count", "failed_count", "created_at"],
            UserRole.DATA_ENTRY: ["id", "task_no", "batch_id", "import_type", "file_name", "status", "total_count", "success_count", "failed_count", "created_at", "completed_at"],
            UserRole.REVIEWER: ["id", "task_no", "batch_id", "import_type", "file_name", "status", "total_count", "success_count", "failed_count", "created_at", "completed_at", "created_by"],
            UserRole.SUPERVISOR: ["*"]
        },
        "reconciliation": {
            UserRole.READ_ONLY: ["id", "batch_id", "material_code", "material_name", "is_anomaly", "created_at"],
            UserRole.DATA_ENTRY: ["id", "batch_id", "material_code", "material_name", "expected_quantity", "actual_quantity", "difference", "is_anomaly", "anomaly_description", "created_at"],
            UserRole.REVIEWER: ["id", "batch_id", "material_code", "material_name", "expected_quantity", "actual_quantity", "difference", "is_anomaly", "anomaly_description", "created_at", "created_by"],
            UserRole.SUPERVISOR: ["*"]
        }
    }
    
    resource_config = field_configs.get(resource_type, {})
    return resource_config.get(role, base_common_fields)
