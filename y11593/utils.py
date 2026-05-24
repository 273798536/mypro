import hashlib
import json
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import logging
from config import LOG_DIR
import os

def setup_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    
    if not logger.handlers:
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        
        file_handler = logging.FileHandler(os.path.join(LOG_DIR, f"{name}.log"))
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
        
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)
    
    return logger

def generate_unique_hash(data: Dict[str, Any], exclude_keys: List[str] = None) -> str:
    exclude_keys = exclude_keys or []
    filtered_data = {k: v for k, v in sorted(data.items()) if k not in exclude_keys}
    json_str = json.dumps(filtered_data, ensure_ascii=False, sort_keys=True, default=str)
    return hashlib.md5(json_str.encode('utf-8')).hexdigest()

def generate_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:16].upper()}"

def parse_datetime(value: Any) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        for fmt in ['%Y-%m-%d %H:%M:%S', '%Y-%m-%d %H:%M', '%Y-%m-%d', '%Y/%m/%d %H:%M:%S', '%Y/%m/%d']:
            try:
                return datetime.strptime(value, fmt)
            except ValueError:
                continue
    return None

def calculate_diff(before: Dict, after: Dict) -> Dict:
    diff = {}
    all_keys = set(before.keys()) | set(after.keys())
    for key in all_keys:
        b = before.get(key)
        a = after.get(key)
        if b != a:
            diff[key] = {"before": b, "after": a}
    return diff

def calculate_wave_diff(before: List[Dict], after: List[Dict]) -> Dict:
    before_map = {f"{item.get('wave_no')}_{item.get('sku_code')}": item for item in before}
    after_map = {f"{item.get('wave_no')}_{item.get('sku_code')}": item for item in after}
    
    all_keys = set(before_map.keys()) | set(after_map.keys())
    added = []
    removed = []
    modified = []
    
    for key in all_keys:
        b = before_map.get(key)
        a = after_map.get(key)
        if b and not a:
            removed.append(key)
        elif a and not b:
            added.append(key)
        elif b and a and b != a:
            modified.append({
                "key": key,
                "diff": calculate_diff(b, a)
            })
    
    return {
        "added_count": len(added),
        "removed_count": len(removed),
        "modified_count": len(modified),
        "added": added,
        "removed": removed,
        "modified": modified
    }

def safe_int(value: Any, default: int = 0) -> int:
    try:
        if value is None or value == '':
            return default
        return int(value)
    except (ValueError, TypeError):
        return default

def safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None or value == '':
            return default
        return float(value)
    except (ValueError, TypeError):
        return default

def safe_str(value: Any, default: str = "") -> str:
    if value is None:
        return default
    return str(value).strip()

def get_fail_type(error_message: str, retry_count: int, max_retries: int) -> str:
    if not error_message:
        return "pending"
    
    permanent_errors = [
        "数据格式错误", "字段缺失", "主键冲突", "外键约束", 
        "数据不存在", "权限不足", "配置错误", "唯一约束"
    ]
    
    for err in permanent_errors:
        if err in error_message:
            return "permanent"
    
    transient_errors = [
        "超时", "连接失败", "网络错误", "服务不可用", "锁等待", "死锁"
    ]
    
    for err in transient_errors:
        if err in error_message:
            if retry_count >= max_retries:
                return "manual"
            return "retry"
    
    if retry_count >= max_retries:
        return "manual"
    
    return "retry"

def calculate_next_retry_time(retry_count: int) -> datetime:
    backoff_minutes = min(5 * (2 ** retry_count), 60)
    return datetime.utcnow() + timedelta(minutes=backoff_minutes)

def model_to_dict(model) -> Dict:
    result = {}
    for column in model.__table__.columns:
        value = getattr(model, column.name)
        if isinstance(value, datetime):
            result[column.name] = value.isoformat() if value else None
        else:
            result[column.name] = value
    return result
