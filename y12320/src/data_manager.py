import pandas as pd
import numpy as np
from datetime import datetime
import hashlib
import json
import os
from typing import Dict, List, Optional, Tuple


class DataVersion:
    def __init__(self, version_id: str, timestamp: datetime, source: str, 
                 description: str, data_hash: str, row_count: int):
        self.version_id = version_id
        self.timestamp = timestamp
        self.source = source
        self.description = description
        self.data_hash = data_hash
        self.row_count = row_count

    def to_dict(self) -> Dict:
        return {
            'version_id': self.version_id,
            'timestamp': self.timestamp.isoformat(),
            'source': self.source,
            'description': self.description,
            'data_hash': self.data_hash,
            'row_count': self.row_count
        }


class DataManager:
    def __init__(self, storage_dir: str = 'data'):
        self.storage_dir = storage_dir
        self.versions: List[DataVersion] = []
        self.current_data: Optional[pd.DataFrame] = None
        self.current_version: Optional[DataVersion] = None
        self._load_versions()

    def _get_versions_file(self) -> str:
        return os.path.join(self.storage_dir, 'versions.json')

    def _load_versions(self):
        versions_file = self._get_versions_file()
        if os.path.exists(versions_file):
            with open(versions_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                self.versions = [
                    DataVersion(
                        v['version_id'],
                        datetime.fromisoformat(v['timestamp']),
                        v['source'],
                        v['description'],
                        v['data_hash'],
                        v['row_count']
                    ) for v in data
                ]

    def _save_versions(self):
        os.makedirs(self.storage_dir, exist_ok=True)
        versions_file = self._get_versions_file()
        with open(versions_file, 'w', encoding='utf-8') as f:
            json.dump([v.to_dict() for v in self.versions], f, indent=2, ensure_ascii=False)

    def _compute_hash(self, df: pd.DataFrame) -> str:
        df_str = df.to_csv(index=False).encode('utf-8')
        return hashlib.sha256(df_str).hexdigest()

    def load_data(self, file_path: str, source: str = 'unknown', 
                  description: str = '') -> Tuple[pd.DataFrame, DataVersion]:
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path)
        elif file_path.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(file_path)
        else:
            raise ValueError(f"不支持的文件格式: {file_path}")

        data_hash = self._compute_hash(df)
        version_id = f"v{len(self.versions) + 1:03d}"
        timestamp = datetime.now()

        version = DataVersion(
            version_id=version_id,
            timestamp=timestamp,
            source=source,
            description=description,
            data_hash=data_hash,
            row_count=len(df)
        )

        self.versions.append(version)
        self._save_versions()

        data_file = os.path.join(self.storage_dir, f"{version_id}.csv")
        df.to_csv(data_file, index=False, encoding='utf-8')

        self.current_data = df
        self.current_version = version

        return df, version

    def load_version(self, version_id: str) -> Optional[pd.DataFrame]:
        data_file = os.path.join(self.storage_dir, f"{version_id}.csv")
        if os.path.exists(data_file):
            df = pd.read_csv(data_file)
            version = next((v for v in self.versions if v.version_id == version_id), None)
            self.current_data = df
            self.current_version = version
            return df
        return None

    def get_versions(self) -> List[DataVersion]:
        return sorted(self.versions, key=lambda v: v.timestamp, reverse=True)

    def validate_schema(self, df: pd.DataFrame) -> Tuple[bool, List[str]]:
        required_columns = ['price', 'converted', 'customer_size']
        missing = [col for col in required_columns if col not in df.columns]
        
        if missing:
            return False, [f"缺少必需列: {', '.join(missing)}"]
        
        issues = []
        
        if df['price'].isnull().any():
            issues.append(f"price 列存在 {df['price'].isnull().sum()} 个空值")
        
        if not pd.api.types.is_numeric_dtype(df['price']):
            issues.append("price 列必须是数值类型")
        
        if df['converted'].isnull().any():
            issues.append(f"converted 列存在 {df['converted'].isnull().sum()} 个空值")
        
        if df['customer_size'].isnull().any():
            issues.append(f"customer_size 列存在 {df['customer_size'].isnull().sum()} 个空值")
        
        return len(issues) == 0, issues

    def get_data_summary(self, df: Optional[pd.DataFrame] = None) -> Dict:
        data = df if df is not None else self.current_data
        if data is None:
            return {}

        return {
            'total_rows': len(data),
            'price_range': (data['price'].min(), data['price'].max()),
            'conversion_rate': data['converted'].mean(),
            'unique_prices': data['price'].nunique(),
            'customer_size_range': (data['customer_size'].min(), data['customer_size'].max()),
            'avg_customer_size': data['customer_size'].mean()
        }
