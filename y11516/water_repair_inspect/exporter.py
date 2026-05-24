import csv
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional

import pandas as pd

from .config import Config
from .storage import RecordStorage
from .models import DataSourceType, RepairRecord


class DataExporter:
    def __init__(self, config: Config, storage: RecordStorage):
        self.config = config
        self.storage = storage

    def freeze_data(self, source_type: Optional[str] = None) -> None:
        records = self.storage.get_all_records()
        
        if source_type:
            records = [r for r in records if r.source_type.value == source_type]
        
        for record in records:
            if not record.is_frozen:
                record.is_frozen = True
                record.status = record.status
                self.storage.save_record(record)

    def export_data(self, format: str = 'excel',
                    source_type: Optional[str] = None) -> Dict[str, Any]:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if source_type:
            filename = f"export_{source_type}_{timestamp}.{format}"
        else:
            filename = f"export_all_{timestamp}.{format}"
        
        file_path = self.storage.get_export_path(filename)
        
        if format == 'csv':
            result = self._export_csv(file_path, source_type)
        else:
            result = self._export_excel(file_path, source_type)
        
        return {
            'file_path': str(file_path),
            'record_count': result['record_count'],
            'format': format
        }

    def _export_csv(self, file_path: Path, source_type: Optional[str]) -> Dict[str, Any]:
        records = self._get_export_records(source_type)
        
        rows = []
        for record in records:
            row = self._record_to_export_row(record)
            rows.append(row)
        
        if rows:
            fieldnames = list(rows[0].keys())
            with open(file_path, 'w', encoding='utf-8-sig', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(rows)
        
        return {'record_count': len(rows)}

    def _export_excel(self, file_path: Path, source_type: Optional[str]) -> Dict[str, Any]:
        with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
            total_count = 0
            
            if source_type:
                source_types = [DataSourceType(source_type)]
            else:
                source_types = list(DataSourceType)
            
            for st in source_types:
                records = self.storage.get_all_records(source_type=st)
                rows = [self._record_to_export_row(r) for r in records]
                
                if rows:
                    df = pd.DataFrame(rows)
                    df.to_excel(writer, sheet_name=st.value, index=False)
                    total_count += len(rows)
            
            summary_df = self._create_summary_sheet(source_types)
            summary_df.to_excel(writer, sheet_name='汇总', index=False)
            
            failures_df = self._create_failures_sheet()
            if len(failures_df) > 0:
                failures_df.to_excel(writer, sheet_name='失败清单', index=False)
            
            history_df = self._create_history_sheet()
            if len(history_df) > 0:
                history_df.to_excel(writer, sheet_name='修正历史', index=False)
        
        return {'record_count': total_count}

    def _get_export_records(self, source_type: Optional[str]) -> List[RepairRecord]:
        if source_type:
            st = DataSourceType(source_type)
            return self.storage.get_all_records(source_type=st)
        else:
            return self.storage.get_all_records()

    def _record_to_export_row(self, record: RepairRecord) -> Dict[str, Any]:
        row = {
            '记录ID': record.record_id,
            '数据源类型': record.source_type.value,
            '业务主键': record.business_key,
            '状态': record.status.value,
            '是否冻结': '是' if record.is_frozen else '否',
            '创建时间': record.created_at,
            '更新时间': record.updated_at
        }
        
        for key, value in record.current_value.items():
            row[f'数据_{key}'] = value
        
        if record.source_evidence:
            latest = record.source_evidence[-1]
            row['来源文件'] = latest.source_file
            row['原始行号'] = latest.original_row_number
        
        if record.manual_judgment:
            row['人工改判'] = record.manual_judgment.get('judgment', '')
            row['改判人'] = record.manual_judgment.get('operator', '')
            row['改判时间'] = record.manual_judgment.get('timestamp', '')
        
        return row

    def _create_summary_sheet(self, source_types: List[DataSourceType]) -> pd.DataFrame:
        summary_data = []
        
        for st in source_types:
            records = self.storage.get_all_records(source_type=st)
            summary_data.append({
                '数据源类型': st.value,
                '记录总数': len(records),
                '有效记录': sum(1 for r in records if r.status.value == 'valid'),
                '无效记录': sum(1 for r in records if r.status.value == 'invalid'),
                '待处理': sum(1 for r in records if r.status.value in ['pending', 'fixed']),
                '已撤回': sum(1 for r in records if r.status.value == 'withdrawn'),
                '人工改判': sum(1 for r in records if r.status.value == 'manual_judged'),
                '已冻结': sum(1 for r in records if r.is_frozen)
            })
        
        return pd.DataFrame(summary_data)

    def _create_failures_sheet(self) -> pd.DataFrame:
        from .models import RecordStatus
        
        invalid_records = self.storage.get_all_records(status=RecordStatus.INVALID)
        failure_data = []
        
        for record in invalid_records:
            errors = [issue.get('message', '') 
                     for issue in record.check_results 
                     if issue.get('severity') == 'error']
            
            failure_data.append({
                '记录ID': record.record_id,
                '数据源类型': record.source_type.value,
                '来源文件': record.source_evidence[-1].source_file if record.source_evidence else '',
                '原始行号': record.source_evidence[-1].original_row_number if record.source_evidence else '',
                '错误信息': '; '.join(errors),
                '当前值': str(record.current_value)
            })
        
        return pd.DataFrame(failure_data)

    def _create_history_sheet(self) -> pd.DataFrame:
        all_records = self.storage.get_all_records()
        history_data = []
        
        for record in all_records:
            for fix in record.fix_history:
                history_data.append({
                    '记录ID': record.record_id,
                    '修正类型': fix.get('type', ''),
                    '修正时间': fix.get('timestamp', ''),
                    '修正内容': '; '.join(fix.get('actions', [])) if 'actions' in fix else '',
                    '改判意见': fix.get('judgment', ''),
                    '改判人': fix.get('operator', '')
                })
        
        return pd.DataFrame(history_data)
