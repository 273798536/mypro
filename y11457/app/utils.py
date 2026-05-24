import json
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Union
from sqlalchemy.ext.declarative import DeclarativeMeta
from app.models import User, UserRole
from app.auth import RolePermission


def json_serialize(obj: Any) -> Any:
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, Enum):
        return obj.value
    if isinstance(obj, DeclarativeMeta):
        return {c.name: getattr(obj, c.name) for c in obj.__table__.columns}
    if hasattr(obj, 'model_dump'):
        return obj.model_dump()
    if hasattr(obj, '__dict__'):
        return str(obj)
    return str(obj)


def make_json_serializable(data: Any) -> Any:
    if data is None:
        return None
    if isinstance(data, dict):
        return {k: make_json_serializable(v) for k, v in data.items()}
    if isinstance(data, list):
        return [make_json_serializable(item) for item in data]
    if isinstance(data, tuple):
        return tuple(make_json_serializable(item) for item in data)
    if isinstance(data, (datetime, Enum)):
        return json_serialize(data)
    try:
        json.dumps(data)
        return data
    except (TypeError, ValueError):
        return json_serialize(data)


def safe_json_dump(data: Any) -> str:
    return json.dumps(make_json_serializable(data))


def model_to_dict_safe(obj: Any, exclude_none: bool = False) -> Dict[str, Any]:
    if hasattr(obj, 'model_dump'):
        data = obj.model_dump()
    elif isinstance(obj, dict):
        data = obj
    elif hasattr(obj, '__table__'):
        data = {c.name: getattr(obj, c.name) for c in obj.__table__.columns}
    else:
        data = {}
    
    result = make_json_serializable(data)
    
    if exclude_none:
        result = {k: v for k, v in result.items() if v is not None}
    
    return result


def filter_by_role(data: Union[Dict, List[Dict]], role: UserRole, table: str) -> Union[Dict, List[Dict]]:
    if isinstance(data, list):
        return [RolePermission.filter_fields_by_role(item, role, table) for item in data]
    return RolePermission.filter_fields_by_role(data, role, table)


def filter_response_by_role(obj, user: User, table: str) -> Dict[str, Any]:
    data = model_to_dict_safe(obj)
    return RolePermission.filter_fields_by_role(data, user.role, table)


def filter_list_response_by_role(objs, user: User, table: str) -> List[Dict[str, Any]]:
    return [filter_response_by_role(obj, user, table) for obj in objs]


def check_city_permission(user: User, record_city: str) -> bool:
    if user.role == UserRole.SUPERVISOR or not user.city:
        return True
    return user.city == record_city


def apply_city_filter(query, user: User, city_column):
    if user.role != UserRole.SUPERVISOR and user.city:
        return query.filter(city_column == user.city)
    return query
