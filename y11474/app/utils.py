import json
from datetime import datetime, date
from decimal import Decimal
from enum import Enum
from typing import Any, List, Dict
from sqlalchemy.orm import class_mapper, ColumnProperty

from app.models import UserRole
from app.security import RolePermission, mask_sensitive_fields


class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj: Any) -> Any:
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, Enum):
            return obj.value
        if hasattr(obj, "__dict__"):
            return obj.__dict__
        return super().default(obj)


def json_serialize(data: Any) -> Any:
    if isinstance(data, dict):
        return {k: json_serialize(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [json_serialize(item) for item in data]
    elif isinstance(data, tuple):
        return tuple(json_serialize(item) for item in data)
    elif isinstance(data, (datetime, date)):
        return data.isoformat()
    elif isinstance(data, Decimal):
        return float(data)
    elif isinstance(data, Enum):
        return data.value
    else:
        return data


def safe_model_dump(data: Any) -> dict:
    if hasattr(data, "model_dump"):
        return json_serialize(data.model_dump())
    return json_serialize(data)


def orm_to_dict(obj: Any, max_depth: int = 2, current_depth: int = 0) -> Dict[str, Any]:
    if obj is None:
        return {}
    
    if current_depth >= max_depth:
        if hasattr(obj, 'id'):
            return {"id": getattr(obj, 'id')}
        return str(obj)
    
    if isinstance(obj, list):
        return [orm_to_dict(item, max_depth, current_depth + 1) for item in obj]
    
    if isinstance(obj, dict):
        return {k: orm_to_dict(v, max_depth, current_depth + 1) for k, v in obj.items()}
    
    if not hasattr(obj, "__table__"):
        return json_serialize(obj)
    
    result = {}
    for prop in class_mapper(obj.__class__).iterate_properties:
        if isinstance(prop, ColumnProperty):
            key = prop.key
            value = getattr(obj, key)
            result[key] = json_serialize(value)
    
    for rel in class_mapper(obj.__class__).relationships:
        rel_key = rel.key
        rel_obj = getattr(obj, rel_key)
        if rel_obj is not None:
            if rel.uselist:
                result[rel_key] = [orm_to_dict(item, max_depth, current_depth + 1) for item in rel_obj]
            else:
                result[rel_key] = orm_to_dict(rel_obj, max_depth, current_depth + 1)
        else:
            result[rel_key] = None if not rel.uselist else []
    
    return result


def apply_role_permissions(data: Any, role: UserRole) -> Any:
    data_dict = orm_to_dict(data, max_depth=2)
    filtered = RolePermission.filter_readable_fields(data_dict, role)
    masked = mask_sensitive_fields(filtered, role)
    return masked
