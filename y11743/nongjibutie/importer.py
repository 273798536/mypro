import csv
import io
import os
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from .models import Database


IMPORT_MODES = ['ignore', 'overwrite', 'append']

ENTITY_CONFIG = {
    'farmer_profiles': {
        'unique_key': ['id_card'],
        'required': ['farmer_name', 'id_card', 'qualification_type', 'qualification_start', 'qualification_end'],
        'display': '农户档案'
    },
    'purchase_invoices': {
        'unique_key': ['invoice_number'],
        'required': ['invoice_number', 'invoice_date', 'machine_model', 'machine_name', 'amount', 'farmer_id'],
        'display': '购机发票'
    },
    'inspection_photos': {
        'unique_key': ['photo_hash'],
        'required': ['photo_hash', 'farmer_id', 'machine_model', 'photo_date'],
        'display': '验机照片'
    },
    'subsidy_standards': {
        'unique_key': ['machine_model', 'effective_date'],
        'required': ['machine_model', 'standard_amount', 'effective_date'],
        'display': '补贴标准'
    },
    'disbursement_batches': {
        'unique_key': ['batch_name'],
        'required': ['batch_name', 'batch_date'],
        'display': '兑付批次'
    },
    'disbursement_records': {
        'unique_key': ['batch_id', 'invoice_id'],
        'required': ['batch_id', 'farmer_id', 'invoice_id', 'subsidy_amount'],
        'display': '兑付记录'
    },
    'audit_reports': {
        'unique_key': ['batch_id', 'report_date'],
        'required': ['batch_id', 'report_date', 'auditor'],
        'display': '审核报告'
    }
}


class ImportResult:
    def __init__(self, entity_type: str, mode: str):
        self.entity_type = entity_type
        self.mode = mode
        self.inserted: int = 0
        self.updated: int = 0
        self.skipped: int = 0
        self.errors: List[str] = []
        self.source_file: str = ''

    def summary(self) -> str:
        parts = [f'{self.source_file} [{self.mode}]']
        if self.inserted:
            parts.append(f'新增 {self.inserted}')
        if self.updated:
            parts.append(f'更新 {self.updated}')
        if self.skipped:
            parts.append(f'跳过 {self.skipped}')
        if self.errors:
            parts.append(f'错误 {len(self.errors)}')
        return '  '.join(parts)


class Importer:
    def __init__(self, db: Database):
        self.db = db

    def parse_csv(self, file_path: str) -> List[Dict]:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f'文件不存在: {file_path}')
        with open(file_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            return [dict(row) for row in reader]

    def _find_existing(self, table: str, unique_key: List[str], row: Dict) -> Optional[Dict]:
        conditions = []
        values = []
        for key in unique_key:
            conditions.append(f'{key} = ?')
            values.append(row.get(key, ''))
        conditions.append('is_active = 1')
        sql = f'SELECT * FROM {table} WHERE {" AND ".join(conditions)}'
        return self.db.query_one(sql, tuple(values))

    def _clean_row(self, row: Dict, required: List[str]) -> Dict:
        cleaned = {}
        for k, v in row.items():
            if v is not None and v != '':
                cleaned[k] = v
        missing = [f for f in required if f not in cleaned or cleaned[f] == '']
        if missing:
            raise ValueError(f'缺少必填字段: {", ".join(missing)}')
        return cleaned

    def import_entity(self, entity_type: str, data: List[Dict], source_file: str, mode: str = 'ignore') -> ImportResult:
        if entity_type not in ENTITY_CONFIG:
            raise ValueError(f'未知实体类型: {entity_type}')
        if mode not in IMPORT_MODES:
            raise ValueError(f'未知导入模式: {mode}，可选: {", ".join(IMPORT_MODES)}')

        config = ENTITY_CONFIG[entity_type]
        result = ImportResult(entity_type, mode)
        result.source_file = source_file

        for idx, raw_row in enumerate(data):
            try:
                row = self._clean_row(raw_row, config['required'])
            except ValueError as e:
                result.errors.append(f'第{idx + 1}行: {e}')
                continue

            row['source_file'] = source_file

            existing = self._find_existing(entity_type, config['unique_key'], row)

            if existing is not None:
                if mode == 'ignore':
                    result.skipped += 1
                    continue
                elif mode == 'overwrite':
                    old_values = dict(existing)
                    self.db.update(entity_type, existing['id'], row, old_values=old_values, corrected_by='import-overwrite', reason=f'覆盖导入: {source_file}')
                    result.updated += 1
                    continue
                elif mode == 'append':
                    row['version'] = existing['version'] + 1
                    row['is_active'] = 1
                    self.db.soft_delete(entity_type, existing['id'], corrected_by='import-append', reason=f'追加导入，旧记录标记删除: {source_file}')

            self.db.insert(entity_type, row)
            result.inserted += 1

        return result

    def import_csv(self, entity_type: str, file_path: str, mode: str = 'ignore') -> ImportResult:
        data = self.parse_csv(file_path)
        return self.import_entity(entity_type, data, os.path.basename(file_path), mode)

    def batch_import(self, imports: List[Tuple[str, str, str]]) -> List[ImportResult]:
        results = []
        for entity_type, file_path, mode in imports:
            result = self.import_csv(entity_type, file_path, mode)
            results.append(result)
        return results