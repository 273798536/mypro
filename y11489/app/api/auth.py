from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, Token, User as UserSchema
from app.services.auth import AuthService

router = APIRouter()


@router.post("/register", response_model=UserSchema)
def register(
    user_data: UserCreate,
    db: Session = Depends(get_db),
):
    return AuthService.create_user(db, user_data)


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = AuthService.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = AuthService.create_access_token(
        data={
            "sub": user.username,
            "user_id": user.id,
            "role": user.role.value if hasattr(user.role, 'value') else str(user.role),
        }
    )
    
    return Token(access_token=access_token, user=user)


@router.get("/me", response_model=UserSchema)
def get_current_user_info(
    current_user: User = Depends(AuthService.get_current_user),
):
    return current_user
