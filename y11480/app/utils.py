import json
from datetime import datetime
from typing import Any


def json_serializer(obj: Any) -> str:
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")


def to_json_serializable(data: Any) -> Any:
    if isinstance(data, dict):
        return {k: to_json_serializable(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [to_json_serializable(item) for item in data]
    elif isinstance(data, datetime):
        return data.isoformat()
    return data


def safe_json_dumps(data: Any) -> str:
    return json.dumps(to_json_serializable(data), ensure_ascii=False)
