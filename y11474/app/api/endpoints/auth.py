from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User
from app.schemas import Token, UserCreate, User as UserSchema
from app.security import (
    verify_password, get_password_hash, create_access_token,
    get_current_user
)

router = APIRouter()


@router.post("/login", response_model=Token)
async def login(
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
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role.value},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/register", response_model=UserSchema)
async def register(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models import UserRole
    if current_user.role != UserRole.SUPERVISOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只有主管可以创建用户"
        )
    
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名已存在"
        )
    
    user = User(
        username=user_data.username,
        full_name=user_data.full_name,
        role=user_data.role,
        hashed_password=get_password_hash(user_data.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=UserSchema)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/init")
async def init_test_users(db: Session = Depends(get_db)):
    from app.models import UserRole
    
    test_users = [
        {"username": "entry", "role": UserRole.DATA_ENTRY, "name": "录入员小张"},
        {"username": "reviewer", "role": UserRole.REVIEWER, "name": "复核员小李"},
        {"username": "supervisor", "role": UserRole.SUPERVISOR, "name": "主管老王"},
        {"username": "readonly", "role": UserRole.READ_ONLY, "name": "查看员小赵"},
    ]
    
    created = []
    for user_data in test_users:
        existing = db.query(User).filter(User.username == user_data["username"]).first()
        if not existing:
            user = User(
                username=user_data["username"],
                full_name=user_data["name"],
                role=user_data["role"],
                hashed_password=get_password_hash("123456")
            )
            db.add(user)
            created.append(user_data["username"])
    
    db.commit()
    
    return {
        "message": "测试用户初始化完成",
        "created_users": created,
        "default_password": "123456"
    }
