from datetime import datetime
from typing import Any

from .models import LoanRecord, RecordStatus


FIELD_TYPE_MAP = {
    'book_title': str,
    'borrower_name': str,
    'borrower_id': str,
    'library_from': str,
    'library_to': str,
    'express_fee': float,
    'compensation_fee': float,
    'overdue_fee': float,
    'damage_fee': float,
    'total_fee': float,
    'renew_count': int,
    'is_overdue': bool,
    'is_damaged': bool,
    'customer_notes': str,
}

DATE_FIELDS = ['apply_date', 'receive_date', 'due_date', 'return_date']


def parse_value(field_name: str, value: str) -> Any:
    if field_name in DATE_FIELDS:
        try:
            return datetime.fromisoformat(value)
        except (ValueError, TypeError):
            try:
                from datetime import date
                d = date.fromisoformat(value)
                return datetime.combine(d, datetime.min.time())
            except (ValueError, TypeError):
                raise ValueError(f"日期格式错误，请使用 YYYY-MM-DD 格式")

    if field_name not in FIELD_TYPE_MAP:
        raise ValueError(f"不支持修改字段: {field_name}")

    field_type = FIELD_TYPE_MAP[field_name]

    if field_type == bool:
        return value.lower() in ['true', '1', 'yes', '是']

    try:
        return field_type(value)
    except (ValueError, TypeError):
        raise ValueError(f"无法将值转换为 {field_type.__name__} 类型")


def update_field(record: LoanRecord, field_name: str, value: str) -> LoanRecord:
    parsed_value = parse_value(field_name, value)
    setattr(record, field_name, parsed_value)

    if field_name.endswith('_fee'):
        record.calculate_total_fee()

    record.status = RecordStatus.FIXED
    record.updated_at = datetime.now()

    return record


def merge_records(primary: LoanRecord, duplicates: list) -> LoanRecord:
    for dup in duplicates:
        if not primary.apply_date and dup.apply_date:
            primary.apply_date = dup.apply_date
        if not primary.receive_date and dup.receive_date:
            primary.receive_date = dup.receive_date
        if not primary.due_date and dup.due_date:
            primary.due_date = dup.due_date
        if not primary.return_date and dup.return_date:
            primary.return_date = dup.return_date

        primary.express_fee = max(primary.express_fee, dup.express_fee)
        primary.compensation_fee = max(primary.compensation_fee, dup.compensation_fee)
        primary.overdue_fee = max(primary.overdue_fee, dup.overdue_fee)
        primary.damage_fee = max(primary.damage_fee, dup.damage_fee)

        if dup.customer_notes and dup.customer_notes not in primary.customer_notes:
            if primary.customer_notes:
                primary.customer_notes += f"\n[来自{dup.source.value}] {dup.customer_notes}"
            else:
                primary.customer_notes = f"[来自{dup.source.value}] {dup.customer_notes}"

    primary.calculate_total_fee()
    primary.status = RecordStatus.FIXED
    primary.updated_at = datetime.now()

    return primary


def recalculate_fees(record: LoanRecord) -> LoanRecord:
    if record.due_date:
        today = datetime.now()
        actual_return = record.return_date or today
        if actual_return > record.due_date:
            record.is_overdue = True
            days_overdue = (actual_return - record.due_date).days
            record.overdue_fee = round(days_overdue * 0.5, 2)
        else:
            record.is_overdue = False
            record.overdue_fee = 0.0

    record.calculate_total_fee()
    record.status = RecordStatus.RECALCULATED
    record.updated_at = datetime.now()

    return record
