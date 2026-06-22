import os
import json
import pandas as pd
from datetime import datetime
from typing import List, Tuple, Dict
from .models import EquationRecord, BadRecord, RecordStatus, BadCategory, ValidationResult
from .validator import Validator


class Processor:
    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.validator = Validator()
        self.successful: List[EquationRecord] = []
        self.bad_format: List[BadRecord] = []
        self.bad_missing: List[BadRecord] = []
        self.bad_business: List[BadRecord] = []
        self.duplicates: List[BadRecord] = []
        self.all_records: List[EquationRecord] = []

    def load_input(self, filepath: str) -> List[dict]:
        ext = os.path.splitext(filepath)[1].lower()
        if ext in ('.xlsx', '.xls'):
            df = pd.read_excel(filepath)
        elif ext == '.csv':
            df = pd.read_csv(filepath)
        else:
            raise ValueError(f"不支持的文件格式: {ext}")

        records = []
        for _, row in df.iterrows():
            raw = {}
            for col in df.columns:
                val = row[col]
                if pd.isna(val):
                    raw[col] = ''
                else:
                    raw[col] = str(val) if not isinstance(val, (int, float, bool)) else val
            records.append(raw)
        return records

    def parse_record(self, raw: dict) -> EquationRecord:
        rec = EquationRecord()
        rec.record_id = str(raw.get('record_id', '')).strip()
        rec.source = str(raw.get('source', '')).strip()
        rec.equation_type = str(raw.get('equation_type', '')).strip()
        rec.solution = str(raw.get('solution', '')).strip()
        rec.remark = str(raw.get('remark', '')).strip()
        rec.raw_data = raw
        rec.last_manual_note = str(raw.get('last_manual_note', '')).strip()

        params_raw = raw.get('input_params', '')
        if isinstance(params_raw, dict):
            rec.input_params = params_raw
        elif isinstance(params_raw, str) and params_raw.strip():
            try:
                rec.input_params = json.loads(params_raw)
            except Exception:
                kv = {}
                for pair in params_raw.split(';'):
                    if '=' in pair:
                        k, v = pair.split('=', 1)
                        kv[k.strip()] = v.strip()
                rec.input_params = kv
        else:
            rec.input_params = {}

        return rec

    def process(self, input_file: str) -> Dict:
        rows = self.load_input(input_file)
        self._reset()

        for raw in rows:
            rec = self.parse_record(raw)

            dup, dup_id = self.validator.detect_duplicate(rec, self.all_records)
            if dup:
                bad = BadRecord(**rec.__dict__)
                bad.bad_category = BadCategory.BUSINESS
                bad.error_detail = f"与已有记录 {dup_id} 重复：方程类型相同、参数相同、解也相同"
                bad.error_fields = ['record_id', 'equation_type', 'input_params', 'solution']
                bad.status = RecordStatus.DUPLICATE
                bad.is_duplicate_of = dup_id
                rec.anomalies.append(bad.error_detail)
                self.duplicates.append(bad)
                self.all_records.append(rec)
                continue

            vresult: ValidationResult = self.validator.validate(rec, raw)

            if vresult.is_valid:
                self.successful.append(rec)
                self.all_records.append(rec)
            else:
                bad = BadRecord(**rec.__dict__)
                bad.bad_category = vresult.bad_category
                bad.error_detail = '; '.join(vresult.errors)
                bad.error_fields = self._extract_error_fields(vresult.errors)
                bad.anomalies.extend(vresult.errors)
                if vresult.bad_category == BadCategory.FORMAT:
                    self.bad_format.append(bad)
                elif vresult.bad_category == BadCategory.MISSING:
                    self.bad_missing.append(bad)
                elif vresult.bad_category == BadCategory.BUSINESS:
                    self.bad_business.append(bad)
                self.all_records.append(bad)

        return self._export_results()

    def _reset(self):
        self.successful.clear()
        self.bad_format.clear()
        self.bad_missing.clear()
        self.bad_business.clear()
        self.duplicates.clear()
        self.all_records.clear()

    def _extract_error_fields(self, errors: List[str]) -> List[str]:
        fields = set()
        for err in errors:
            for f in ['record_id', 'source', 'equation_type', 'input_params', 'solution', 'remark']:
                if f in err:
                    fields.add(f)
        return list(fields)

    def _export_results(self) -> Dict:
        ts = datetime.now().strftime('%Y%m%d_%H%M%S')
        out_dir = os.path.join(self.data_dir, 'output')
        bad_dir = os.path.join(self.data_dir, 'bad_records')
        os.makedirs(out_dir, exist_ok=True)
        os.makedirs(bad_dir, exist_ok=True)

        success_path = os.path.join(out_dir, f'success_{ts}.xlsx')
        self._records_to_excel(self.successful, success_path, ['record_id', 'source', 'equation_type', 'input_params', 'solution', 'remark', 'status', 'last_manual_note', 'anomalies'])

        bad_path = os.path.join(bad_dir, f'bad_records_{ts}.xlsx')
        with pd.ExcelWriter(bad_path, engine='openpyxl') as writer:
            self._records_to_df(self.bad_missing, ['record_id', 'source', 'equation_type', 'input_params', 'solution', 'remark', 'bad_category', 'error_detail', 'error_fields', 'last_manual_note']).to_excel(writer, sheet_name='缺字段', index=False)
            self._records_to_df(self.bad_format, ['record_id', 'source', 'equation_type', 'input_params', 'solution', 'remark', 'bad_category', 'error_detail', 'error_fields', 'last_manual_note']).to_excel(writer, sheet_name='格式问题', index=False)
            self._records_to_df(self.bad_business, ['record_id', 'source', 'equation_type', 'input_params', 'solution', 'remark', 'bad_category', 'error_detail', 'error_fields', 'is_duplicate_of', 'last_manual_note']).to_excel(writer, sheet_name='业务规则', index=False)
            self._records_to_df(self.duplicates, ['record_id', 'source', 'equation_type', 'input_params', 'solution', 'remark', 'bad_category', 'error_detail', 'error_fields', 'is_duplicate_of', 'last_manual_note']).to_excel(writer, sheet_name='重复样本', index=False)

        return {
            'success': True,
            'timestamp': ts,
            'summary': {
                'total': len(self.all_records),
                'successful': len(self.successful),
                'bad_missing': len(self.bad_missing),
                'bad_format': len(self.bad_format),
                'bad_business': len(self.bad_business),
                'duplicates': len(self.duplicates),
            },
            'files': {
                'success': success_path,
                'bad_records': bad_path,
            },
            'summary_text': self.get_export_summary(),
            'details': {
                'successful': [r.to_dict() for r in self.successful],
                'bad_missing': [r.to_dict() for r in self.bad_missing],
                'bad_format': [r.to_dict() for r in self.bad_format],
                'bad_business': [r.to_dict() for r in self.bad_business],
                'duplicates': [r.to_dict() for r in self.duplicates],
            },
        }

    def _records_to_df(self, records, columns):
        data = []
        for r in records:
            d = r.to_dict()
            row = {}
            for c in columns:
                val = d.get(c, '')
                if isinstance(val, list):
                    row[c] = '; '.join(str(x) for x in val)
                elif isinstance(val, dict):
                    row[c] = json.dumps(val, ensure_ascii=False)
                else:
                    row[c] = val
            data.append(row)
        return pd.DataFrame(data, columns=columns)

    def _records_to_excel(self, records, path, columns):
        df = self._records_to_df(records, columns)
        df.to_excel(path, index=False, engine='openpyxl')

    def get_export_summary(self, category: str = 'all') -> str:
        lines = [
            f"微分方程错因追踪 处理摘要",
            f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"总计: {len(self.all_records)} 条",
            f"  - 成功: {len(self.successful)} 条",
            f"  - 缺字段: {len(self.bad_missing)} 条",
            f"  - 格式问题: {len(self.bad_format)} 条",
            f"  - 业务规则: {len(self.bad_business)} 条",
            f"  - 重复样本: {len(self.duplicates)} 条",
            "",
            "各分类明细:",
        ]

        for name, lst in [('缺字段', self.bad_missing), ('格式问题', self.bad_format),
                          ('业务规则', self.bad_business), ('重复样本', self.duplicates)]:
            if lst:
                lines.append(f"\n【{name}】共 {len(lst)} 条")
                for b in lst:
                    dup_info = f" [重复于 {b.is_duplicate_of}]" if b.is_duplicate_of else ""
                    lines.append(f"  - [{b.record_id}] ({b.source}) {b.equation_type}{dup_info}")
                    lines.append(f"    问题: {b.error_detail}")
                    if b.last_manual_note:
                        lines.append(f"    上一次人工说明: {b.last_manual_note}")

        return '\n'.join(lines)
