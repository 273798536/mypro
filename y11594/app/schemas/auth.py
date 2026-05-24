from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: Optional[str] = None


class UserLogin(BaseModel):
    username: str
    password: str


class UserBase(BaseModel):
    username: str
    full_name: str
    email: Optional[str] = None
    role: str
    department: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: int
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserInfo(BaseModel):
    id: int
    username: str
    full_name: str
    role: str
    department: Optional[str] = None
    permissions: dict

    class Config:
        from_attributes = True
