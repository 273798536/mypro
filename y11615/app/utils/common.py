from datetime import date, datetime
from typing import Optional
import uuid

from app.models.models import AgingBucket


def generate_batch_no() -> str:
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    short_uuid = str(uuid.uuid4())[:8].upper()
    return f"BATCH_{timestamp}_{short_uuid}"


def parse_date(date_val) -> Optional[date]:
    if date_val is None:
        return None
    try:
        import pandas as pd
        if pd.isna(date_val):
            return None
        if isinstance(date_val, pd.Timestamp):
            if pd.isna(date_val):
                return None
            return date_val.date()
    except (ImportError, TypeError):
        pass
    if isinstance(date_val, date):
        return date_val
    if isinstance(date_val, datetime):
        return date_val.date()
    date_str = str(date_val).strip()
    if not date_str or date_str.lower() in ['nan', 'nat', 'none', 'null']:
        return None
    formats = [
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%Y.%m.%d",
        "%d-%m-%Y",
        "%d/%m/%Y",
        "%Y年%m月%d日",
        "%m/%d/%Y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt).date()
        except (ValueError, TypeError):
            continue
    return None


def parse_float(value) -> float:
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    try:
        cleaned = str(value).replace(",", "").replace("¥", "").replace("￥", "").strip()
        return float(cleaned) if cleaned else 0.0
    except (ValueError, TypeError):
        return 0.0


def parse_int(value) -> int:
    if value is None:
        return 0
    if isinstance(value, int):
        return value
    try:
        return int(float(str(value).replace(",", "").strip()))
    except (ValueError, TypeError):
        return 0


def calculate_aging_bucket(due_date: date, report_date: Optional[date] = None) -> tuple[AgingBucket, int]:
    if report_date is None:
        report_date = date.today()
    overdue_days = (report_date - due_date).days
    if overdue_days <= 0:
        return AgingBucket.CURRENT, 0
    if overdue_days <= 30:
        return AgingBucket.DAYS_1_30, overdue_days
    if overdue_days <= 60:
        return AgingBucket.DAYS_31_60, overdue_days
    if overdue_days <= 90:
        return AgingBucket.DAYS_61_90, overdue_days
    if overdue_days <= 180:
        return AgingBucket.DAYS_91_180, overdue_days
    if overdue_days <= 365:
        return AgingBucket.DAYS_181_365, overdue_days
    return AgingBucket.OVER_365, overdue_days


def get_bucket_order() -> list:
    return [
        AgingBucket.CURRENT,
        AgingBucket.DAYS_1_30,
        AgingBucket.DAYS_31_60,
        AgingBucket.DAYS_61_90,
        AgingBucket.DAYS_91_180,
        AgingBucket.DAYS_181_365,
        AgingBucket.OVER_365,
    ]
