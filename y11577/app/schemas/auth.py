from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class RoleInfo(BaseModel):
    code: str
    name: str


class PermissionInfo(BaseModel):
    code: str
    name: str


class UserInfo(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str] = None
    is_active: bool
    roles: List[RoleInfo]
    permissions: List[PermissionInfo]

    model_config = ConfigDict(from_attributes=True)


class RoleContext(BaseModel):
    user_id: int
    username: str
    full_name: Optional[str] = None
    roles: List[RoleInfo]
    permissions: List[PermissionInfo]
    is_data_entry: bool
    is_reviewer: bool
    is_supervisor: bool
    is_readonly: bool
