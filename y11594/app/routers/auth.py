from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.core.security import (
    create_access_token,
    verify_password,
    get_password_hash,
    get_current_user,
    check_permission,
    require_permission
)
from app.models.user import User, ROLE_PERMISSIONS
from app.schemas.auth import (
    Token,
    UserCreate,
    UserResponse,
    UserInfo
)
from app.schemas.common import ResponseModel

router = APIRouter(prefix="/auth", tags=["认证"])


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="用户已被禁用"
        )
    
    user.last_login = datetime.utcnow()
    db.commit()
    
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/register", response_model=ResponseModel)
def register(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名已存在"
        )
    
    if user_data.role not in ROLE_PERMISSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"无效的角色，可选角色: {list(ROLE_PERMISSIONS.keys())}"
        )
    
    user = User(
        username=user_data.username,
        full_name=user_data.full_name,
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        role=user_data.role,
        department=user_data.department
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return ResponseModel(data={"user_id": user.id, "username": user.username})


@router.get("/me", response_model=ResponseModel)
def get_me(
    current_user: User = Depends(get_current_user)
):
    user_info = {
        "id": current_user.id,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "role_name": ROLE_PERMISSIONS.get(current_user.role, {}).get("name", ""),
        "department": current_user.department,
        "permissions": ROLE_PERMISSIONS.get(current_user.role, {})
    }
    return ResponseModel(data=user_info)


@router.get("/roles", response_model=ResponseModel)
def get_roles(
    current_user: User = Depends(get_current_user)
):
    return ResponseModel(data=ROLE_PERMISSIONS)
