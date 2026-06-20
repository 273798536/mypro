import os
import csv
import json
from typing import List, Dict, Any, Optional
from datetime import datetime


def load_config(config_path: str) -> Dict:
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"[异常] 配置文件不存在: {config_path}，请检查 config/ 目录是否完整")
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        raise ValueError(f"[异常] 配置文件格式错误: {config_path}, 错误: {e}")
    except IOError as e:
        raise IOError(f"[异常] 配置文件读取失败: {config_path}, 错误: {e}")


class DataReader:
    def __init__(self, base_dir: str):
        self.base_dir = base_dir
        try:
            self.field_mapping = load_config(os.path.join(base_dir, 'config', 'field_mapping.json'))
            self.paths = load_config(os.path.join(base_dir, 'config', 'paths.json'))
        except (FileNotFoundError, ValueError, IOError) as e:
            print(f"[致命错误] 配置加载失败: {e}")
            raise

    def _get_audio_dir(self) -> str:
        return os.path.join(self.base_dir, self.paths['audio_files_dir'])

    def _ensure_audio_dir(self) -> None:
        audio_dir = self._get_audio_dir()
        if not os.path.exists(audio_dir):
            os.makedirs(audio_dir, exist_ok=True)
            print(f"[提示] 已自动创建音频文件夹: {audio_dir}，请将CSV文件放入此处")

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
        if not os.path.exists(file_path):
            print(f"[警告] 文件不存在，已跳过: {file_path}")
            return rows

        try:
            with open(file_path, 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                if not reader.fieldnames:
                    print(f"[警告] 文件为空或无表头，已跳过: {filename}")
                    return rows
                for idx, raw_row in enumerate(reader, start=1):
                    try:
                        normalized = self._normalize_row(raw_row, filename)
                        normalized['_line_number'] = idx
                        is_valid, missing = self._validate_row(normalized)
                        normalized['_is_valid'] = is_valid
                        normalized['_missing_fields'] = missing
                        rows.append(normalized)
                    except Exception as e:
                        print(f"[警告] {filename} 第{idx}行解析失败: {e}，已跳过该行")
                        continue
        except UnicodeDecodeError:
            print(f"[警告] 文件编码非UTF-8，尝试用GBK重读: {filename}")
            try:
                with open(file_path, 'r', encoding='gbk') as f:
                    reader = csv.DictReader(f)
                    for idx, raw_row in enumerate(reader, start=1):
                        normalized = self._normalize_row(raw_row, filename)
                        normalized['_line_number'] = idx
                        is_valid, missing = self._validate_row(normalized)
                        normalized['_is_valid'] = is_valid
                        normalized['_missing_fields'] = missing
                        rows.append(normalized)
                print(f"[提示] GBK编码读取成功: {filename}")
            except Exception as e2:
                print(f"[错误] 文件读取失败，已跳过: {filename}, 错误: {e2}")
        except csv.Error as e:
            print(f"[错误] CSV格式错误，已跳过: {filename}, 错误: {e}")
        except Exception as e:
            print(f"[错误] 未知异常，已跳过: {filename}, 错误: {e}")

        return rows

    def read_all_files(self) -> List[Dict]:
        self._ensure_audio_dir()
        audio_dir = self._get_audio_dir()
        all_rows = []

        csv_files = [f for f in os.listdir(audio_dir) if f.endswith('.csv')]
        if not csv_files:
            print(f"[提示] {audio_dir} 目录下暂无CSV文件，请放入排期表")
            return all_rows

        for fname in sorted(csv_files):
            fpath = os.path.join(audio_dir, fname)
            rows = self.read_csv_file(fpath)
            if rows:
                print(f"[读取] {fname}: {len(rows)} 行")
            all_rows.extend(rows)
        return all_rows

    def get_file_summaries(self) -> List[Dict]:
        self._ensure_audio_dir()
        audio_dir = self._get_audio_dir()
        summaries = []

        csv_files = [f for f in os.listdir(audio_dir) if f.endswith('.csv')]
        if not csv_files:
            return summaries

        for fname in sorted(csv_files):
            fpath = os.path.join(audio_dir, fname)
            try:
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
            except Exception as e:
                print(f"[警告] 无法获取文件信息: {fname}, 错误: {e}")
        return summaries
