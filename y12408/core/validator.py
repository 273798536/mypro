import pandas as pd
from datetime import datetime, date
from typing import Any, Optional, Tuple, List
import re
import json

from .exceptions import DataQualityException


class DataCleaner:
    DATE_FORMATS = [
        '%Y-%m-%d', '%Y/%m/%d', '%Y.%m.%d',
        '%Y年%m月%d日',
        '%Y-%m-%d %H:%M:%S', '%Y/%m/%d %H:%M:%S',
        '%d-%m-%Y', '%d/%m/%Y',
        '%m/%d/%Y', '%m-%d-%Y'
    ]

    REMARK_PATTERNS = {
        'no_show': [r'晚到', r'noshow', r'no-show', r'未入住', r'未到'],
        'self_booked': [r'自营', r'补房', r'散客', r'自行'],
        'dispute': [r'争议', r'异议', r'不符', r'核对', r'问题'],
        'reschedule': [r'改期', r'变更', r'调整日期', r'改到'],
        'cancel': [r'取消', r'退订', r'作废']
    }

    @classmethod
    def clean_string(cls, value: Any, field_name: str = None) -> Optional[str]:
        if value is None:
            return None
        if pd.isna(value):
            return None
        s = str(value).strip()
        if s == '' or s.lower() in ['nan', 'none', 'null', 'undefined']:
            return None
        s = re.sub(r'\s+', ' ', s)
        s = re.sub(r'[\ufeff\xa0]', '', s)
        return s

    @classmethod
    def clean_date(cls, value: Any, field_name: str = None,
                   row_idx: int = None) -> Optional[date]:
        if value is None:
            return None
        if pd.isna(value):
            return None
        if isinstance(value, datetime):
            return value.date()
        if isinstance(value, date):
            return value
        s = str(value).strip()
        if s == '':
            return None
        for fmt in cls.DATE_FORMATS:
            try:
                return datetime.strptime(s, fmt).date()
            except ValueError:
                continue
        raise DataQualityException(
            f'无法解析日期格式: {value}',
            field=field_name,
            row=row_idx
        )

    @classmethod
    def clean_datetime(cls, value: Any, field_name: str = None,
                       row_idx: int = None) -> Optional[datetime]:
        if value is None:
            return None
        if pd.isna(value):
            return None
        if isinstance(value, datetime):
            return value
        if isinstance(value, date):
            return datetime(value.year, value.month, value.day)
        s = str(value).strip()
        if s == '':
            return None
        for fmt in cls.DATE_FORMATS:
            try:
                return datetime.strptime(s, fmt)
            except ValueError:
                continue
        raise DataQualityException(
            f'无法解析时间格式: {value}',
            field=field_name,
            row=row_idx
        )

    @classmethod
    def clean_integer(cls, value: Any, field_name: str = None,
                      row_idx: int = None, default: int = 0) -> int:
        if value is None:
            return default
        if pd.isna(value):
            return default
        if isinstance(value, int):
            return value
        if isinstance(value, float):
            if value.is_integer():
                return int(value)
            raise DataQualityException(
                f'整数字段包含小数: {value}',
                field=field_name,
                row=row_idx
            )
        s = str(value).strip()
        if s == '':
            return default
        try:
            return int(float(s))
        except ValueError:
            raise DataQualityException(
                f'无法解析整数: {value}',
                field=field_name,
                row=row_idx
            )

    @classmethod
    def clean_float(cls, value: Any, field_name: str = None,
                    row_idx: int = None, default: float = 0.0) -> float:
        if value is None:
            return default
        if pd.isna(value):
            return default
        if isinstance(value, (int, float)):
            return float(value)
        s = str(value).strip()
        if s == '':
            return default
        s = s.replace(',', '').replace('¥', '').replace('￥', '').replace('元', '')
        try:
            return float(s)
        except ValueError:
            raise DataQualityException(
                f'无法解析金额: {value}',
                field=field_name,
                row=row_idx
            )

    @classmethod
    def clean_boolean(cls, value: Any, field_name: str = None,
                      row_idx: int = None, default: bool = False) -> bool:
        if value is None:
            return default
        if pd.isna(value):
            return default
        if isinstance(value, bool):
            return value
        s = str(value).strip().lower()
        if s in ['是', 'true', '1', 'yes', 'y', '有']:
            return True
        if s in ['否', 'false', '0', 'no', 'n', '无', '']:
            return False
        raise DataQualityException(
            f'无法解析布尔值: {value}',
            field=field_name,
            row=row_idx
        )

    @classmethod
    def parse_remark(cls, remark: str) -> dict:
        result = {
            'is_no_show': False,
            'is_self_booked': False,
            'has_dispute': False,
            'is_reschedule': False,
            'is_cancel': False,
            'extracted_info': {}
        }
        if not remark:
            return result
        remark_lower = remark.lower()
        for flag, patterns in cls.REMARK_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, remark_lower) or re.search(pattern, remark):
                    result[flag] = True
                    break
        date_match = re.search(r'(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?)', remark)
        if date_match:
            try:
                result['extracted_info']['date'] = cls.clean_date(date_match.group(1))
            except:
                pass
        nights_match = re.search(r'(\d+)\s*晚', remark)
        if nights_match:
            result['extracted_info']['nights'] = int(nights_match.group(1))
        amount_match = re.search(r'(\d+(?:\.\d+)?)\s*元', remark)
        if amount_match:
            result['extracted_info']['amount'] = float(amount_match.group(1))
        return result

    @classmethod
    def merge_remarks(cls, old_remark: str, new_remark: str) -> str:
        parts = []
        if old_remark:
            parts.append(f'[历史]{old_remark}')
        if new_remark:
            parts.append(new_remark)
        return '; '.join(parts) if parts else None

    @classmethod
    def serialize_raw(cls, data: dict) -> str:
        def convert(obj):
            if isinstance(obj, (datetime, date)):
                return obj.isoformat()
            if pd.isna(obj):
                return None
            return obj
        return json.dumps(data, ensure_ascii=False, default=convert)


class DataValidator:
    @classmethod
    def validate_nights(cls, checkin: date, checkout: date,
                        nights: int, context: dict = None) -> Tuple[bool, str]:
        if not checkin or not checkout:
            return True, ''
        if checkout <= checkin:
            return False, f'离店日期{checkout}必须晚于入住日期{checkin}'
        actual_nights = (checkout - checkin).days
        if nights and nights != actual_nights:
            return False, f'房晚数不一致：计算{actual_nights}晚，记录{nights}晚'
        return True, ''

    @classmethod
    def validate_guest_info(cls, name: str, id_card: str = None,
                            context: dict = None) -> Tuple[bool, str]:
        if not name:
            return False, '客人姓名不能为空'
        if len(name) < 2:
            return False, f'客人姓名过短: {name}'
        if id_card:
            if not re.match(r'^[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$', id_card):
                return False, f'身份证号格式不正确: {id_card}'
        return True, ''

    @classmethod
    def check_duplicate_nights(cls, records: List[dict]) -> List[dict]:
        night_map = {}
        duplicates = []
        for rec in records:
            guest = rec.get('guest_name', '')
            checkin = rec.get('checkin_date')
            if not guest or not checkin:
                continue
            key = (guest, checkin)
            if key in night_map:
                dup_info = {
                    'guest_name': guest,
                    'checkin_date': checkin,
                    'records': [night_map[key], rec]
                }
                duplicates.append(dup_info)
            else:
                night_map[key] = rec
        return duplicates

    @classmethod
    def detect_cross_week(cls, original_date: date, new_date: date) -> Tuple[bool, int]:
        if not original_date or not new_date:
            return False, 0
        orig_week = original_date.isocalendar()[1]
        orig_year = original_date.isocalendar()[0]
        new_week = new_date.isocalendar()[1]
        new_year = new_date.isocalendar()[0]
        if orig_year != new_year:
            return True, (new_year - orig_year) * 52 + (new_week - orig_week)
        weeks_diff = new_week - orig_week
        return abs(weeks_diff) > 0, weeks_diff

    @classmethod
    def generate_sheet_no(cls, prefix: str = 'HX') -> str:
        now = datetime.now()
        return f'{prefix}{now.strftime("%Y%m%d%H%M%S")}{now.microsecond // 1000:03d}'

    @classmethod
    def generate_trace_id(cls, *args) -> str:
        import hashlib
        content = '|'.join([str(a) if a else '' for a in args])
        return hashlib.md5(content.encode('utf-8')).hexdigest()[:16]
