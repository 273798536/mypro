from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any
import pandas as pd

from .models import LoanRecord, RecordSource, RecordStatus


SOURCE_COLUMN_MAPPINGS = {
    RecordSource.BORROW_APPLICATION: {
        'book_title': ['书名', '图书名称', 'title', 'book_title'],
        'borrower_name': ['借阅人', '读者姓名', 'borrower', 'name'],
        'borrower_id': ['借阅人ID', '读者证号', 'borrower_id', 'card_no'],
        'library_from': ['借出馆', '来源馆', 'library_from', 'from'],
        'library_to': ['借入馆', '申请馆', 'library_to', 'to'],
        'apply_date': ['申请日期', '申请时间', 'apply_date', 'date'],
        'due_date': ['应还日期', '到期日期', 'due_date', 'return_date'],
        'express_fee': ['快递费', '邮寄费', 'express_fee', 'shipping'],
        'renew_count': ['续借次数', '续借数', 'renew_count', 'renew'],
    },
    RecordSource.EXPRESS_ORDER: {
        'book_title': ['书名', '图书名称', 'title', 'book_title'],
        'borrower_name': ['收件人', '借阅人', 'receiver', 'borrower'],
        'borrower_id': ['借阅人ID', '读者证号', 'borrower_id', 'card_no'],
        'library_from': ['寄出馆', '发货馆', 'library_from', 'from'],
        'library_to': ['收件馆', '收货馆', 'library_to', 'to'],
        'receive_date': ['签收日期', '收到日期', 'receive_date', 'delivered'],
        'express_fee': ['快递费', '运费', 'express_fee', 'cost'],
    },
    RecordSource.COMPENSATION: {
        'book_title': ['书名', '图书名称', 'title', 'book_title'],
        'borrower_name': ['赔偿人', '读者姓名', 'borrower', 'name'],
        'borrower_id': ['借阅人ID', '读者证号', 'borrower_id', 'card_no'],
        'library_from': ['所属馆', '图书馆', 'library_from', 'library'],
        'library_to': ['赔偿处理馆', '处理馆', 'library_to', 'handler'],
        'compensation_fee': ['赔偿金额', '赔偿金', 'compensation_fee', 'amount'],
        'damage_fee': ['污损费', '损坏费', 'damage_fee', 'damage'],
        'customer_notes': ['备注', '说明', 'notes', 'remark'],
    },
    RecordSource.CUSTOMER_NOTE: {
        'book_title': ['书名', '图书名称', 'title', 'book_title'],
        'borrower_name': ['读者', '借阅人', 'borrower', 'name'],
        'borrower_id': ['借阅人ID', '读者证号', 'borrower_id', 'card_no'],
        'library_from': ['相关馆', '图书馆', 'library_from', 'library'],
        'library_to': ['处理馆', '客服馆', 'library_to', 'handler'],
        'customer_notes': ['备注内容', '客服备注', 'notes', 'content'],
        'overdue_fee': ['逾期费', 'overdue_fee', 'overdue'],
        'damage_fee': ['污损费', 'damage_fee', 'damage'],
    }
}


def find_column(row: Dict[str, Any], possible_names: List[str]) -> Any:
    for name in possible_names:
        if name in row and pd.notna(row[name]):
            return row[name]
    return None


def parse_date(value: Any) -> datetime:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, pd.Timestamp):
        return value.to_pydatetime()
    try:
        return datetime.fromisoformat(str(value))
    except (ValueError, TypeError):
        pass
    try:
        return pd.to_datetime(value).to_pydatetime()
    except (ValueError, TypeError):
        return None


def parse_float(value: Any) -> float:
    if value is None or pd.isna(value):
        return 0.0
    try:
        return float(value)
    except (ValueError, TypeError):
        return 0.0


def parse_int(value: Any) -> int:
    if value is None or pd.isna(value):
        return 0
    try:
        return int(value)
    except (ValueError, TypeError):
        return 0


def import_file(file_path: Path, source: RecordSource, operator: str,
                sheet_name: Any = 0) -> List[LoanRecord]:
    file_path = Path(file_path)
    suffix = file_path.suffix.lower()

    if suffix in ['.xlsx', '.xls']:
        df = pd.read_excel(file_path, sheet_name=sheet_name)
    elif suffix == '.csv':
        df = pd.read_csv(file_path)
    else:
        raise ValueError(f"不支持的文件格式: {suffix}")

    mapping = SOURCE_COLUMN_MAPPINGS.get(source, {})
    records = []

    for idx, row in df.iterrows():
        row_dict = row.to_dict()

        record_data = {
            'source': source,
            'original_row': idx + 2,
            'original_file': file_path.name,
            'book_title': str(find_column(row_dict, mapping.get('book_title', [])) or '未知书名'),
            'borrower_name': str(find_column(row_dict, mapping.get('borrower_name', [])) or '未知'),
            'borrower_id': str(find_column(row_dict, mapping.get('borrower_id', [])) or ''),
            'library_from': str(find_column(row_dict, mapping.get('library_from', [])) or '未知馆'),
            'library_to': str(find_column(row_dict, mapping.get('library_to', [])) or '未知馆'),
            'status': RecordStatus.IMPORTED,
        }

        date_fields = ['apply_date', 'receive_date', 'due_date', 'return_date']
        for field in date_fields:
            if field in mapping:
                val = find_column(row_dict, mapping[field])
                if val:
                    record_data[field] = parse_date(val)

        fee_fields = ['express_fee', 'compensation_fee', 'overdue_fee', 'damage_fee']
        for field in fee_fields:
            if field in mapping:
                record_data[field] = parse_float(find_column(row_dict, mapping[field]))

        if 'renew_count' in mapping:
            record_data['renew_count'] = parse_int(find_column(row_dict, mapping['renew_count']))

        if 'customer_notes' in mapping:
            notes_val = find_column(row_dict, mapping['customer_notes'])
            if notes_val:
                record_data['customer_notes'] = str(notes_val)

        record = LoanRecord.create(**record_data)
        record.calculate_total_fee()
        records.append(record)

    return records
