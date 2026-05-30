import csv
import os
from pathlib import Path
from typing import List, Dict, Tuple, Optional


class MaterialParser:
    REQUIRED_COLUMNS = ['audio_file']
    OPTIONAL_COLUMNS = [
        'sample_rate', 'filter_method', 'noise_threshold',
        'low_freq', 'high_freq', 'preserve_bands',
        'spectrum_params', 'listening_notes', 'output_file'
    ]

    def __init__(self, comment_prefix='#', delimiter=None):
        self.comment_prefix = comment_prefix
        self.delimiter = delimiter
        self.bad_rows = []
        self.valid_rows = []
        self.warnings = []

    def parse(self, file_path: str) -> Dict:
        file_path = Path(file_path)
        if not file_path.exists():
            raise FileNotFoundError(f"材料文件不存在: {file_path}")

        ext = file_path.suffix.lower()
        if ext == '.tsv':
            delimiter = '\t'
        elif ext == '.csv':
            delimiter = ','
        else:
            delimiter = self.delimiter or ','

        self.bad_rows = []
        self.valid_rows = []
        self.warnings = []

        with open(file_path, 'r', encoding='utf-8-sig') as f:
            lines = f.readlines()

        header = None
        for line_num, line in enumerate(lines, 1):
            line = line.rstrip('\n\r')

            if not line.strip():
                self.bad_rows.append({
                    'line_number': line_num,
                    'raw_content': line,
                    'error_type': 'empty_line',
                    'error_message': '空行'
                })
                continue

            if line.strip().startswith(self.comment_prefix):
                self.warnings.append({
                    'line_number': line_num,
                    'content': line.strip(),
                    'type': 'comment_line'
                })
                continue

            if header is None:
                header = self._parse_header(line, delimiter)
                continue

            row = self._parse_row(line, line_num, header, delimiter)
            if row.get('is_valid', False):
                self.valid_rows.append(row)
            else:
                self.bad_rows.append(row)

        return {
            'header': header,
            'valid_rows': self.valid_rows,
            'bad_rows': self.bad_rows,
            'warnings': self.warnings,
            'total_lines': len(lines),
            'valid_count': len(self.valid_rows),
            'bad_count': len(self.bad_rows)
        }

    def _parse_header(self, line: str, delimiter: str) -> List[str]:
        reader = csv.reader([line], delimiter=delimiter)
        header = next(reader)
        return [h.strip().lower().replace(' ', '_') for h in header]

    def _parse_row(self, line: str, line_num: int, header: List[str], delimiter: str) -> Dict:
        try:
            reader = csv.reader([line], delimiter=delimiter)
            values = next(reader)
        except Exception as e:
            return {
                'line_number': line_num,
                'raw_content': line,
                'is_valid': False,
                'error_type': 'parse_error',
                'error_message': f'解析错误: {str(e)}'
            }

        if len(values) < len(self.REQUIRED_COLUMNS):
            return {
                'line_number': line_num,
                'raw_content': line,
                'is_valid': False,
                'error_type': 'insufficient_columns',
                'error_message': f'列数不足: 需要至少 {len(self.REQUIRED_COLUMNS)} 列, 实际 {len(values)} 列'
            }

        row_data = {}
        missing_required = []

        for i, col_name in enumerate(header):
            if i < len(values):
                value = values[i].strip()
                if value:
                    row_data[col_name] = value
                else:
                    row_data[col_name] = None
            else:
                row_data[col_name] = None

        for req_col in self.REQUIRED_COLUMNS:
            if req_col not in row_data or not row_data[req_col]:
                missing_required.append(req_col)

        if missing_required:
            return {
                'line_number': line_num,
                'raw_content': line,
                'is_valid': False,
                'error_type': 'missing_required_columns',
                'error_message': f'缺少必需列: {", ".join(missing_required)}',
                'parsed_data': row_data
            }

        return {
            'line_number': line_num,
            'raw_content': line,
            'is_valid': True,
            'data': self._normalize_row(row_data)
        }

    def _normalize_row(self, row_data: Dict) -> Dict:
        normalized = row_data.copy()

        if 'sample_rate' in normalized and normalized['sample_rate']:
            try:
                normalized['sample_rate'] = int(float(normalized['sample_rate']))
            except (ValueError, TypeError):
                normalized['sample_rate'] = None

        if 'noise_threshold' in normalized and normalized['noise_threshold']:
            try:
                normalized['noise_threshold'] = float(normalized['noise_threshold'])
            except (ValueError, TypeError):
                normalized['noise_threshold'] = None

        if 'low_freq' in normalized and normalized['low_freq']:
            try:
                normalized['low_freq'] = float(normalized['low_freq'])
            except (ValueError, TypeError):
                normalized['low_freq'] = None

        if 'high_freq' in normalized and normalized['high_freq']:
            try:
                normalized['high_freq'] = float(normalized['high_freq'])
            except (ValueError, TypeError):
                normalized['high_freq'] = None

        if 'preserve_bands' in normalized and normalized['preserve_bands']:
            try:
                bands = []
                parts = normalized['preserve_bands'].split(';')
                for part in parts:
                    if '-' in part:
                        low, high = part.split('-', 1)
                        bands.append((float(low.strip()), float(high.strip())))
                normalized['preserve_bands'] = bands if bands else None
            except (ValueError, TypeError):
                normalized['preserve_bands'] = None

        if 'filter_method' not in normalized or not normalized['filter_method']:
            normalized['filter_method'] = 'spectral_subtraction'

        return normalized

    def get_bad_rows_report(self) -> str:
        if not self.bad_rows:
            return "没有坏行"

        report_lines = [f"共发现 {len(self.bad_rows)} 个坏行:"]
        for row in self.bad_rows:
            report_lines.append(
                f"  行 {row['line_number']}: [{row['error_type']}] {row['error_message']}"
            )
            if 'raw_content' in row and row['raw_content'].strip():
                report_lines.append(f"    内容: {row['raw_content'][:80]}...")

        return '\n'.join(report_lines)

    def get_valid_rows_count(self) -> int:
        return len(self.valid_rows)

    def get_bad_rows_count(self) -> int:
        return len(self.bad_rows)
