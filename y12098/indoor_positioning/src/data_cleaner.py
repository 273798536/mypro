import pandas as pd
import numpy as np
import os
from typing import Tuple, List, Dict


class DataCleaner:
    REQUIRED_COLUMNS = ['timestamp', 'x', 'y', 'floor', 'beacon_id']
    
    def __init__(self, file_path: str, output_dir: str = 'output'):
        self.file_path = file_path
        self.output_dir = output_dir
        self.bad_rows: List[Dict] = []
        self.comment_rows: List[Dict] = []
        self.empty_rows: List[Dict] = []
        self.missing_cols_rows: List[Dict] = []
        self.invalid_value_rows: List[Dict] = []
        os.makedirs(output_dir, exist_ok=True)
    
    def load_and_clean(self) -> Tuple[pd.DataFrame, Dict]:
        raw_lines = self._read_raw_lines()
        header_line, header_idx = self._find_header(raw_lines)
        expected_cols = len(header_line.split(','))
        
        cleaned_data = []
        for line_num, line in enumerate(raw_lines):
            stripped = line.strip()
            
            if not stripped:
                self.empty_rows.append({
                    'original_line': line_num + 1,
                    'content': '(empty line)'
                })
                continue
            
            if stripped.startswith('#'):
                self.comment_rows.append({
                    'original_line': line_num + 1,
                    'content': stripped
                })
                continue
            
            if line_num == header_idx:
                continue
            
            parts = stripped.split(',')
            if len(parts) < expected_cols:
                self.missing_cols_rows.append({
                    'original_line': line_num + 1,
                    'expected_cols': expected_cols,
                    'actual_cols': len(parts),
                    'content': stripped
                })
                continue
            
            row_dict = dict(zip(header_line.split(','), parts))
            row_dict['original_line'] = line_num + 1
            
            validation_result = self._validate_row(row_dict)
            if validation_result['valid']:
                cleaned_data.append(self._convert_types(row_dict))
            else:
                self.invalid_value_rows.append({
                    'original_line': line_num + 1,
                    'error': validation_result['error'],
                    'content': stripped
                })
        
        df = pd.DataFrame(cleaned_data)
        stats = self._get_statistics()
        
        self._export_bad_rows()
        return df, stats
    
    def _read_raw_lines(self) -> List[str]:
        with open(self.file_path, 'r', encoding='utf-8') as f:
            return f.readlines()
    
    def _find_header(self, lines: List[str]) -> Tuple[str, int]:
        for idx, line in enumerate(lines):
            stripped = line.strip()
            if stripped and not stripped.startswith('#'):
                header_cols = [c.strip().lower() for c in stripped.split(',')]
                if any(col in self.REQUIRED_COLUMNS for col in header_cols):
                    return stripped, idx
        raise ValueError("No valid header found in CSV file")
    
    def _validate_row(self, row: Dict) -> Dict:
        try:
            float(row.get('x', 'nan'))
            float(row.get('y', 'nan'))
            float(row.get('floor', 'nan'))
            float(row.get('timestamp', 'nan'))
            
            beacon_id = row.get('beacon_id', '')
            if not beacon_id or beacon_id.lower() in ['null', 'none', 'nan', '']:
                return {'valid': False, 'error': 'beacon_id is empty or null'}
            
            return {'valid': True}
        except (ValueError, TypeError) as e:
            return {'valid': False, 'error': str(e)}
    
    def _convert_types(self, row: Dict) -> Dict:
        converted = row.copy()
        for col in ['x', 'y', 'floor', 'timestamp']:
            if col in converted:
                try:
                    converted[col] = float(converted[col])
                except (ValueError, TypeError):
                    converted[col] = np.nan
        converted['floor'] = int(float(converted['floor'])) if not pd.isna(converted['floor']) else None
        return converted
    
    def _get_statistics(self) -> Dict:
        self.bad_rows = self.empty_rows + self.comment_rows + self.missing_cols_rows + self.invalid_value_rows
        return {
            'total_rows_processed': len(self.bad_rows),
            'empty_rows': len(self.empty_rows),
            'comment_rows': len(self.comment_rows),
            'missing_columns_rows': len(self.missing_cols_rows),
            'invalid_value_rows': len(self.invalid_value_rows),
            'total_bad_rows': len(self.bad_rows),
            'bad_rows_details': self.bad_rows
        }
    
    def _export_bad_rows(self):
        bad_rows_df = pd.DataFrame(self.bad_rows)
        if not bad_rows_df.empty:
            output_path = os.path.join(self.output_dir, 'bad_rows.csv')
            bad_rows_df.to_csv(output_path, index=False, encoding='utf-8-sig')
            print(f"Bad rows exported to: {output_path}")
        
        if self.empty_rows:
            empty_df = pd.DataFrame(self.empty_rows)
            empty_df.to_csv(os.path.join(self.output_dir, 'empty_rows.csv'), index=False, encoding='utf-8-sig')
        
        if self.comment_rows:
            comment_df = pd.DataFrame(self.comment_rows)
            comment_df.to_csv(os.path.join(self.output_dir, 'comment_rows.csv'), index=False, encoding='utf-8-sig')
        
        if self.missing_cols_rows:
            missing_df = pd.DataFrame(self.missing_cols_rows)
            missing_df.to_csv(os.path.join(self.output_dir, 'missing_columns_rows.csv'), index=False, encoding='utf-8-sig')
        
        if self.invalid_value_rows:
            invalid_df = pd.DataFrame(self.invalid_value_rows)
            invalid_df.to_csv(os.path.join(self.output_dir, 'invalid_value_rows.csv'), index=False, encoding='utf-8-sig')
