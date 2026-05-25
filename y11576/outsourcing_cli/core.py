import hashlib
import json
import csv
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass

import pandas as pd

from .database import Database, SourceFile, RawRecord, ReconciliationRecord


VALID_FILE_TYPES = ['delivery', 'repair', 'deduction', 'comment']
FILE_TYPE_NAMES = {
    'delivery': '外协送货单',
    'repair': '返修记录',
    'deduction': '扣款明细',
    'comment': '主管批注'
}


@dataclass
class ImportResult:
    batch_id: str
    file_type: str
    file_name: str
    total_rows: int
    success_rows: int
    failed_rows: int
    is_duplicate: bool
    errors: List[Dict[str, Any]]


class FileParser:
    def __init__(self, file_path: str, file_type: str):
        self.file_path = Path(file_path)
        self.file_type = file_type
        self.file_hash = self._compute_hash()

    def _compute_hash(self) -> str:
        hasher = hashlib.sha256()
        with open(self.file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                hasher.update(chunk)
        return hasher.hexdigest()

    def parse(self) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        if self.file_path.suffix.lower() in ['.xlsx', '.xls']:
            return self._parse_excel()
        elif self.file_path.suffix.lower() == '.csv':
            return self._parse_csv()
        else:
            raise ValueError(f"不支持的文件格式: {self.file_path.suffix}")

    def _parse_excel(self) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        df = pd.read_excel(self.file_path, dtype=str)
        return self._parse_dataframe(df)

    def _parse_csv(self) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        encodings = ['utf-8', 'gbk', 'gb2312']
        for enc in encodings:
            try:
                df = pd.read_csv(self.file_path, dtype=str, encoding=enc)
                return self._parse_dataframe(df)
            except UnicodeDecodeError:
                continue
        raise ValueError("无法识别文件编码，请使用 UTF-8 或 GBK 编码")

    def _parse_dataframe(self, df: pd.DataFrame) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        records = []
        errors = []
        
        for idx, row in df.iterrows():
            original_row = idx + 2
            raw_data = row.to_dict()
            
            try:
                parsed = self._parse_row(raw_data, original_row)
                records.append({
                    'original_row': original_row,
                    'raw_data': raw_data,
                    'parsed_data': parsed,
                    'status': 'success',
                    'error': None
                })
            except Exception as e:
                errors.append({
                    'original_row': original_row,
                    'raw_data': raw_data,
                    'error': str(e)
                })
                records.append({
                    'original_row': original_row,
                    'raw_data': raw_data,
                    'parsed_data': {},
                    'status': 'failed',
                    'error': str(e)
                })
        
        return records, errors

    def _parse_row(self, raw_data: Dict[str, Any], row_num: int) -> Dict[str, Any]:
        if self.file_type == 'delivery':
            return self._parse_delivery(raw_data, row_num)
        elif self.file_type == 'repair':
            return self._parse_repair(raw_data, row_num)
        elif self.file_type == 'deduction':
            return self._parse_deduction(raw_data, row_num)
        elif self.file_type == 'comment':
            return self._parse_comment(raw_data, row_num)
        else:
            raise ValueError(f"未知的文件类型: {self.file_type}")

    def _parse_delivery(self, raw: Dict[str, Any], row_num: int) -> Dict[str, Any]:
        product_code = self._get_value(raw, ['物料编码', '产品编码', 'product_code', 'code'])
        product_name = self._get_value(raw, ['物料名称', '产品名称', 'product_name', 'name'])
        quantity = self._get_numeric_value(raw, ['送货数量', '数量', 'quantity', 'qty'])
        
        if not product_code:
            raise ValueError(f"缺少物料编码")
        if quantity is None:
            raise ValueError(f"缺少送货数量")
        
        return {
            'product_code': str(product_code).strip(),
            'product_name': str(product_name or '').strip(),
            'quantity': float(quantity),
            'delivery_date': self._get_value(raw, ['送货日期', '日期', 'date'])
        }

    def _parse_repair(self, raw: Dict[str, Any], row_num: int) -> Dict[str, Any]:
        product_code = self._get_value(raw, ['物料编码', '产品编码', 'product_code', 'code'])
        product_name = self._get_value(raw, ['物料名称', '产品名称', 'product_name', 'name'])
        quantity = self._get_numeric_value(raw, ['返修数量', '数量', 'quantity', 'qty'])
        repair_times = self._get_numeric_value(raw, ['返修次数', '次数', 'times']) or 1
        
        if not product_code:
            raise ValueError(f"缺少物料编码")
        
        return {
            'product_code': str(product_code).strip(),
            'product_name': str(product_name or '').strip(),
            'quantity': float(quantity) if quantity else 0,
            'repair_times': int(repair_times),
            'repair_type': self._get_value(raw, ['返修类型', '类型', 'type'])
        }

    def _parse_deduction(self, raw: Dict[str, Any], row_num: int) -> Dict[str, Any]:
        product_code = self._get_value(raw, ['物料编码', '产品编码', 'product_code', 'code'])
        product_name = self._get_value(raw, ['物料名称', '产品名称', 'product_name', 'name'])
        amount = self._get_numeric_value(raw, ['扣款金额', '金额', 'amount', 'deduction'])
        
        if not product_code:
            raise ValueError(f"缺少物料编码")
        
        return {
            'product_code': str(product_code).strip(),
            'product_name': str(product_name or '').strip(),
            'amount': float(amount) if amount else 0,
            'deduction_reason': self._get_value(raw, ['扣款原因', '原因', 'reason'])
        }

    def _parse_comment(self, raw: Dict[str, Any], row_num: int) -> Dict[str, Any]:
        product_code = self._get_value(raw, ['物料编码', '产品编码', 'product_code', 'code']) or ''
        batch_ref = self._get_value(raw, ['批次号', '批次', 'batch'])
        
        return {
            'product_code': str(product_code).strip(),
            'batch_ref': str(batch_ref or '').strip(),
            'comment': self._get_value(raw, ['批注', '备注', 'comment', 'remark']) or '',
            'approver': self._get_value(raw, ['审批人', '主管', 'approver']) or ''
        }

    def _get_value(self, raw: Dict[str, Any], keys: List[str]) -> Optional[str]:
        for k in keys:
            if k in raw and pd.notna(raw[k]) and str(raw[k]).strip():
                return str(raw[k]).strip()
        return None

    def _get_numeric_value(self, raw: Dict[str, Any], keys: List[str]) -> Optional[float]:
        for k in keys:
            if k in raw and pd.notna(raw[k]):
                try:
                    val = str(raw[k]).strip()
                    if val:
                        return float(val.replace(',', ''))
                except (ValueError, TypeError):
                    continue
        return None


class ReconciliationEngine:
    def __init__(self, db: Database):
        self.db = db

    def calculate_batch(self, batch_id: str, operator: str) -> Dict[str, Any]:
        with self.db.connect() as conn:
            cursor = conn.cursor()
            
            delivery_data = self._aggregate_data(cursor, batch_id, 'delivery')
            repair_data = self._aggregate_data(cursor, batch_id, 'repair')
            deduction_data = self._aggregate_data(cursor, batch_id, 'deduction')
            
            all_product_codes = set(delivery_data.keys()) | set(repair_data.keys()) | set(deduction_data.keys())
            
            results = []
            for product_code in all_product_codes:
                delivery = delivery_data.get(product_code, {'quantity': 0, 'name': ''})
                repair = repair_data.get(product_code, {'quantity': 0, 'name': ''})
                deduction = deduction_data.get(product_code, {'amount': 0, 'name': ''})
                
                product_name = delivery['name'] or repair['name'] or deduction['name'] or product_code
                
                final_settlement = delivery['quantity'] - repair['quantity']
                
                status = 'success'
                if repair['quantity'] > 0 and repair['repair_times'] and repair['repair_times'] > 1:
                    status = 'needs_review'
                    check_note = f"该产品返修{repair['repair_times']}次，需确认是否重复扣款"
                
                record = ReconciliationRecord(
                    id=None,
                    batch_id=batch_id,
                    product_code=product_code,
                    product_name=product_name,
                    delivery_quantity=delivery['quantity'],
                    repair_quantity=repair['quantity'],
                    deduction_amount=deduction['amount'],
                    final_settlement=final_settlement,
                    status=status,
                    is_frozen=0,
                    is_manual_override=0,
                    override_reason=None,
                    created_at=datetime.now().isoformat(),
                    updated_at=datetime.now().isoformat()
                )
                
                self.db.upsert_reconciliation(record)
                results.append({
                    'product_code': product_code,
                    'product_name': product_name,
                    'delivery': delivery['quantity'],
                    'repair': repair['quantity'],
                    'deduction': deduction['amount'],
                    'final_settlement': final_settlement,
                    'status': status
                })
            
            self.db.log_action(
                batch_id, 'calculate', operator,
                new_value={'record_count': len(results)},
                reason='执行对账计算'
            )
            
            return {
                'batch_id': batch_id,
                'total_products': len(results),
                'needs_review': len([r for r in results if r['status'] == 'needs_review']),
                'records': results
            }

    def _aggregate_data(self, cursor, batch_id: str, file_type: str) -> Dict[str, Dict[str, Any]]:
        cursor.execute('''
            SELECT parsed_data FROM raw_records
            WHERE batch_id = ? AND file_type = ? AND status = 'success'
        ''', (batch_id, file_type))
        
        aggregated = {}
        for row in cursor.fetchall():
            parsed = json.loads(row['parsed_data'])
            code = parsed.get('product_code')
            if not code:
                continue
                
            if code not in aggregated:
                aggregated[code] = {
                    'quantity': 0,
                    'amount': 0,
                    'repair_times': 0,
                    'name': parsed.get('product_name', '')
                }
            
            if file_type == 'delivery':
                aggregated[code]['quantity'] += parsed.get('quantity', 0)
            elif file_type == 'repair':
                aggregated[code]['quantity'] += parsed.get('quantity', 0)
                aggregated[code]['repair_times'] = max(
                    aggregated[code]['repair_times'],
                    parsed.get('repair_times', 1)
                )
            elif file_type == 'deduction':
                aggregated[code]['amount'] += parsed.get('amount', 0)
        
        return aggregated


class ImportManager:
    def __init__(self, db: Database):
        self.db = db

    def import_file(self, batch_id: str, file_path: str, file_type: str, 
                    operator: str) -> ImportResult:
        if file_type not in VALID_FILE_TYPES:
            raise ValueError(f"无效的文件类型。有效类型: {VALID_FILE_TYPES}")

        parser = FileParser(file_path, file_type)
        
        is_duplicate = self.db.check_duplicate_file(batch_id, file_type, parser.file_hash)
        
        if is_duplicate:
            self.db.log_action(
                batch_id, 'import_duplicate_rejected', operator,
                new_value={
                    'file_type': file_type,
                    'file_name': Path(file_path).name,
                    'file_hash': parser.file_hash
                },
                reason=f'拒绝重复导入 {FILE_TYPE_NAMES.get(file_type, file_type)}: 文件内容与已有记录完全一致'
            )
            return ImportResult(
                batch_id=batch_id,
                file_type=file_type,
                file_name=Path(file_path).name,
                total_rows=0,
                success_rows=0,
                failed_rows=0,
                is_duplicate=True,
                errors=[]
            )
        
        records, errors = parser.parse()
        
        if len(errors) == 0:
            file_status = 'completed'
        elif len(errors) < len(records):
            file_status = 'partial'
        else:
            file_status = 'failed'
        
        source_file = SourceFile(
            id=None,
            batch_id=batch_id,
            file_type=file_type,
            file_name=Path(file_path).name,
            file_hash=parser.file_hash,
            imported_at=datetime.now().isoformat(),
            imported_by=operator,
            status=file_status,
            row_count=len(records)
        )
        
        source_file_id = self.db.insert_source_file(source_file)
        
        success_count = 0
        for rec in records:
            raw_record = RawRecord(
                id=None,
                source_file_id=source_file_id,
                batch_id=batch_id,
                file_type=file_type,
                original_row_number=rec['original_row'],
                raw_data=json.dumps(rec['raw_data'], ensure_ascii=False),
                parsed_data=json.dumps(rec['parsed_data'], ensure_ascii=False),
                status=rec['status'],
                check_result=rec['error'],
                created_at=datetime.now().isoformat(),
                updated_at=datetime.now().isoformat()
            )
            self.db.insert_raw_record(raw_record)
            if rec['status'] == 'success':
                success_count += 1
        
        self.db.log_action(
            batch_id, 'import', operator,
            new_value={
                'file_type': file_type,
                'file_name': Path(file_path).name,
                'total_rows': len(records),
                'success_rows': success_count,
                'failed_rows': len(records) - success_count
            },
            reason=f'导入 {FILE_TYPE_NAMES.get(file_type, file_type)} [{file_status}]'
        )
        
        return ImportResult(
            batch_id=batch_id,
            file_type=file_type,
            file_name=Path(file_path).name,
            total_rows=len(records),
            success_rows=success_count,
            failed_rows=len(records) - success_count,
            is_duplicate=False,
            errors=errors
        )
