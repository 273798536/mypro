import os
import csv
import json
from typing import List, Dict, Any, Optional
from datetime import datetime


def load_config(config_path: str) -> Dict:
    with open(config_path, 'r', encoding='utf-8') as f:
        return json.load(f)


class DataReader:
    def __init__(self, base_dir: str):
        self.base_dir = base_dir
        self.field_mapping = load_config(os.path.join(base_dir, 'config', 'field_mapping.json'))
        self.paths = load_config(os.path.join(base_dir, 'config', 'paths.json'))

    def _get_audio_dir(self) -> str:
        return os.path.join(self.base_dir, self.paths['audio_files_dir'])

    def _map_field(self, raw_field: str) -> Optional[str]:
        raw_lower = raw_field.strip().lower()
        for std_field, variants in self.field_mapping['standard_fields'].items():
            for v in variants:
                if raw_lower == v.lower():
                    return std_field
        return None

    def _normalize_row(self, raw_row: Dict, source_file: str) -> Dict[str, Any]:
        normalized = {}
        unmapped = {}
        for raw_key, value in raw_row.items():
            std_key = self._map_field(raw_key)
            if std_key:
                normalized[std_key] = value.strip() if isinstance(value, str) else value
            else:
                unmapped[raw_key] = value

        for field in self.field_mapping['preserve_fields']:
            if field not in normalized:
                normalized[field] = '未指定'

        if 'source' not in normalized or normalized['source'] == '未指定':
            normalized['source'] = os.path.basename(source_file)

        normalized['_source_file'] = os.path.basename(source_file)
        normalized['_unmapped_fields'] = unmapped
        normalized['_row_id'] = f"{normalized.get('song_name', '')}_{normalized.get('performance_time', '')}_{normalized.get('theater', '')}"

        return normalized

    def _validate_row(self, row: Dict) -> tuple[bool, List[str]]:
        missing = []
        for field in self.field_mapping['required_fields']:
            if field not in row or not row[field]:
                missing.append(field)
        return len(missing) == 0, missing

    def read_csv_file(self, file_path: str) -> List[Dict]:
        rows = []
        filename = os.path.basename(file_path)
        with open(file_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for idx, raw_row in enumerate(reader, start=1):
                normalized = self._normalize_row(raw_row, filename)
                normalized['_line_number'] = idx
                is_valid, missing = self._validate_row(normalized)
                normalized['_is_valid'] = is_valid
                normalized['_missing_fields'] = missing
                rows.append(normalized)
        return rows

    def read_all_files(self) -> List[Dict]:
        audio_dir = self._get_audio_dir()
        all_rows = []
        if not os.path.exists(audio_dir):
            return all_rows

        for fname in sorted(os.listdir(audio_dir)):
            if fname.endswith('.csv'):
                fpath = os.path.join(audio_dir, fname)
                all_rows.extend(self.read_csv_file(fpath))
        return all_rows

    def get_file_summaries(self) -> List[Dict]:
        audio_dir = self._get_audio_dir()
        summaries = []
        if not os.path.exists(audio_dir):
            return summaries

        for fname in sorted(os.listdir(audio_dir)):
            if fname.endswith('.csv'):
                fpath = os.path.join(audio_dir, fname)
                mtime = datetime.fromtimestamp(os.path.getmtime(fpath)).strftime('%Y-%m-%d %H:%M:%S')
                rows = self.read_csv_file(fpath)
                valid_count = sum(1 for r in rows if r['_is_valid'])
                summaries.append({
                    'filename': fname,
                    'modified_at': mtime,
                    'total_rows': len(rows),
                    'valid_rows': valid_count,
                    'invalid_rows': len(rows) - valid_count
                })
        return summaries
