from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.config import get_settings
from app.database import get_db
from app import models, schemas
from app.enums import UserRole

settings = get_settings()

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
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def authenticate_user(db: Session, username: str, password: str) -> Optional[models.User]:
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        if username is None or user_id is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username, user_id=user_id)
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.id == token_data.user_id).first()
    if user is None:
        raise credentials_exception
    return user


async def get_current_active_user(
    current_user: models.User = Depends(get_current_user)
) -> models.User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def require_roles(*allowed_roles: UserRole):
    def role_checker(current_user: models.User = Depends(get_current_active_user)) -> models.User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted for role {current_user.role}"
            )
        return current_user
    return role_checker


def create_default_users(db: Session):
    default_users = [
        {
            "username": "admin",
            "password": "admin123",
            "full_name": "系统管理员",
            "email": "admin@example.com",
            "role": UserRole.ADMIN
        },
        {
            "username": "procurement",
            "password": "proc123",
            "full_name": "采购内勤",
            "email": "procurement@example.com",
            "role": UserRole.PROCUREMENT_STAFF
        },
        {
            "username": "warehouse",
            "password": "ware123",
            "full_name": "仓库管理员",
            "email": "warehouse@example.com",
            "role": UserRole.WAREHOUSE_STAFF
        },
        {
            "username": "quality",
            "password": "qual123",
            "full_name": "质检员",
            "email": "quality@example.com",
            "role": UserRole.QUALITY_INSPECTOR
        },
        {
            "username": "supplier",
            "password": "supp123",
            "full_name": "供应商用户",
            "email": "supplier@example.com",
            "role": UserRole.SUPPLIER
        }
    ]

    for user_data in default_users:
        existing = db.query(models.User).filter(models.User.username == user_data["username"]).first()
        if not existing:
            hashed_password = get_password_hash(user_data["password"])
            db_user = models.User(
                username=user_data["username"],
                hashed_password=hashed_password,
                full_name=user_data["full_name"],
                email=user_data["email"],
                role=user_data["role"]
            )
            db.add(db_user)
    db.commit()
