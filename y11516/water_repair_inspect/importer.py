import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional

import pandas as pd

from .config import Config
from .storage import RecordStorage
from .deadletter import DeadLetterQueue
from .models import (
    DataSourceType, RecordStatus, ImportStatus,
    SourceEvidence, RepairRecord,
    generate_business_key, generate_record_id
)


class DataImporter:
    def __init__(self, config: Config, storage: RecordStorage):
        self.config = config
        self.storage = storage
        self.batch_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.dlq = DeadLetterQueue(config)

    def import_file(self, source_type_str: str, file_path: str,
                    sheet: str = '0') -> Dict[str, Any]:
        source_type = DataSourceType(source_type_str)
        file_path = Path(file_path)
        file_hash = self.storage.get_file_hash(str(file_path))
        
        df = self._read_file(file_path, sheet)
        source_config = self.config.data_sources.get(source_type_str, {})
        required_columns = source_config.get('required_columns', [])
        
        result = {
            'source_type': source_type_str,
            'source_file': str(file_path),
            'file_hash': file_hash,
            'batch_id': self.batch_id,
            'total_rows': len(df),
            'success_count': 0,
            'failed_count': 0,
            'duplicate_count': 0,
            'updated_ids': [],
            'new_ids': [],
            'failed_rows': [],
            'status': ImportStatus.SUCCESS.value
        }
        
        for idx, row in df.iterrows():
            original_row_number = idx + 2
            try:
                row_dict = self._clean_row_data(row.to_dict())
                
                missing_cols = [c for c in required_columns if c not in row_dict or pd.isna(row_dict.get(c))]
                if missing_cols:
                    raise ValueError(f"缺少必要列: {', '.join(missing_cols)}")
                
                parsed_value = self._parse_standard_value(source_type, row_dict)
                business_key = generate_business_key(source_type, parsed_value)
                record_id = generate_record_id(source_type, business_key)
                
                evidence = SourceEvidence(
                    source_file=str(file_path),
                    source_file_hash=file_hash,
                    original_row_number=original_row_number,
                    original_content=row_dict,
                    parsed_standard_value=parsed_value
                )
                
                existing_record = self.storage.get_record(record_id)
                
                if existing_record:
                    if existing_record.is_frozen:
                        raise ValueError("记录已冻结，无法更新")
                    
                    if existing_record.status == RecordStatus.WITHDRAWN:
                        existing_record.status = RecordStatus.PENDING
                    
                    existing_record.source_evidence.append(evidence)
                    existing_record.current_value = parsed_value
                    existing_record.status = RecordStatus.PENDING
                    existing_record.check_results = []
                    
                    self.storage.save_record(existing_record)
                    result['updated_ids'].append(record_id)
                    result['duplicate_count'] += 1
                else:
                    new_record = RepairRecord(
                        record_id=record_id,
                        source_type=source_type,
                        business_key=business_key,
                        status=RecordStatus.PENDING,
                        current_value=parsed_value,
                        source_evidence=[evidence]
                    )
                    self.storage.save_record(new_record)
                    result['new_ids'].append(record_id)
                
                result['success_count'] += 1
                
            except Exception as e:
                result['failed_count'] += 1
                fail_row = {
                    'row': original_row_number,
                    'content': self._clean_row_data(row.to_dict()),
                    'error': str(e)
                }
                result['failed_rows'].append(fail_row)
                
                dlq_id = self.dlq.enqueue(
                    source_type=source_type_str,
                    source_file=str(file_path),
                    batch_id=self.batch_id,
                    row_number=original_row_number,
                    original_content=fail_row['content'],
                    error_message=str(e)
                )
                fail_row['dlq_id'] = dlq_id
        
        if result['failed_count'] > 0:
            if result['success_count'] > 0:
                result['status'] = ImportStatus.PARTIAL_FAILURE.value
            else:
                result['status'] = ImportStatus.FAILED.value
        
        return result

    def _read_file(self, file_path: Path, sheet: str = '0') -> pd.DataFrame:
        suffix = file_path.suffix.lower()
        
        if suffix in ['.xlsx', '.xls']:
            sheet_name = int(sheet) if sheet.isdigit() else sheet
            return pd.read_excel(file_path, sheet_name=sheet_name, dtype=str)
        elif suffix == '.csv':
            return pd.read_csv(file_path, dtype=str, encoding='utf-8')
        else:
            raise ValueError(f"不支持的文件格式: {suffix}")

    def _clean_row_data(self, row_dict: Dict[str, Any]) -> Dict[str, Any]:
        cleaned = {}
        for k, v in row_dict.items():
            if pd.isna(v):
                cleaned[k] = None
            elif isinstance(v, str):
                cleaned[k] = v.strip()
            else:
                cleaned[k] = v
        return cleaned

    def _parse_standard_value(self, source_type: DataSourceType, 
                              row_dict: Dict[str, Any]) -> Dict[str, Any]:
        parsed = dict(row_dict)
        
        if source_type == DataSourceType.DISPATCH_ORDER:
            parsed['order_no'] = str(parsed.get('order_no', '')).strip()
            parsed['quantity'] = self._parse_quantity(parsed.get('quantity', '0'))
            
        elif source_type == DataSourceType.VALVE_INVENTORY:
            parsed['valve_code'] = str(parsed.get('valve_code', '')).strip()
            parsed['quantity'] = self._parse_quantity(parsed.get('quantity', '0'))
            
        elif source_type == DataSourceType.SITE_PHOTO:
            parsed['order_no'] = str(parsed.get('order_no', '')).strip()
            parsed['photo_sequence'] = self._parse_int(parsed.get('photo_sequence', '1'))
            
        elif source_type == DataSourceType.SCAN_DETAIL:
            parsed['order_no'] = str(parsed.get('order_no', '')).strip()
            parsed['material_code'] = str(parsed.get('material_code', '')).strip()
            parsed['quantity'] = self._parse_quantity(parsed.get('quantity', '0'))
        
        return parsed

    def _parse_quantity(self, value: Any) -> float:
        if value is None:
            return 0.0
        if isinstance(value, (int, float)):
            return float(value)
        s = str(value).strip()
        if not s:
            return 0.0
        s = s.replace(',', '')
        try:
            return float(s)
        except ValueError:
            raise ValueError(f"无法解析数量: {value}")

    def _parse_int(self, value: Any) -> int:
        if value is None:
            return 0
        if isinstance(value, int):
            return value
        s = str(value).strip()
        if not s:
            return 0
        try:
            return int(float(s))
        except ValueError:
            raise ValueError(f"无法解析整数: {value}")
