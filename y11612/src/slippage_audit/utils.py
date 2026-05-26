"""通用工具函数"""

import json
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Any


class NumpyEncoder(json.JSONEncoder):
    """自定义JSON编码器，支持numpy和pandas类型"""

    def default(self, obj: Any) -> Any:
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, pd.Timestamp):
            return obj.isoformat()
        elif isinstance(obj, datetime):
            return obj.isoformat()
        elif isinstance(obj, pd.Series):
            return obj.to_dict()
        elif isinstance(obj, pd.DataFrame):
            return obj.to_dict('records')
        return super().default(obj)


def json_dump(obj: Any, fp, **kwargs):
    """安全地序列化对象到JSON文件"""
    return json.dump(obj, fp, cls=NumpyEncoder, **kwargs)


def json_dumps(obj: Any, **kwargs) -> str:
    """安全地序列化对象到JSON字符串"""
    return json.dumps(obj, cls=NumpyEncoder, **kwargs)
