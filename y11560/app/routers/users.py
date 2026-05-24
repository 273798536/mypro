from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import User, UserRole
from ..schemas import UserCreate, User as UserSchema
from ..permissions import get_current_user_with_permission, Permission, get_current_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=List[UserSchema])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_permission(Permission.VIEW_BATCH))
):
    return db.query(User).all()


@router.get("/me", response_model=UserSchema)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("", response_model=UserSchema)
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_permission(Permission.MANAGE_USERS))
):
    existing = db.query(User).filter(User.username == user_data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user = User(
        username=user_data.username,
        role=user_data.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserSchema)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_permission(Permission.MANAGE_USERS))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
