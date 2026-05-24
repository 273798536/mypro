import json
from datetime import date, datetime
from typing import Any


class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj: Any) -> Any:
        if isinstance(obj, (date, datetime)):
            return obj.isoformat()
        return super().default(obj)


def to_json_serializable(data: Any) -> Any:
    if isinstance(data, dict):
        return {k: to_json_serializable(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [to_json_serializable(item) for item in data]
    elif isinstance(data, (date, datetime)):
        return data.isoformat()
    else:
        return data
