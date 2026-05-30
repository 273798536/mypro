import pandas as pd
import numpy as np
from pathlib import Path
from typing import Tuple, Dict, List


class DataLoader:
    def __init__(self, data_dir: str = "data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)

    def load_communities(self, filename: str = "communities.csv") -> pd.DataFrame:
        file_path = self.data_dir / filename
        if not file_path.exists():
            return self._create_sample_communities()
        
        df = pd.read_csv(file_path)
        df = self._validate_coordinates(df, "小区")
        return df

    def load_warehouse_candidates(self, filename: str = "warehouse_candidates.csv") -> pd.DataFrame:
        file_path = self.data_dir / filename
        if not file_path.exists():
            return self._create_sample_warehouses()
        
        df = pd.read_csv(file_path)
        df = self._validate_coordinates(df, "仓库候选")
        return df

    def _validate_coordinates(self, df: pd.DataFrame, source: str) -> pd.DataFrame:
        required_cols = ['id', 'name', 'lng', 'lat']
        missing_cols = [col for col in required_cols if col not in df.columns]
        
        if missing_cols:
            raise ValueError(f"{source}数据缺少必要列: {missing_cols}")
        
        df['source'] = source
        df['lng'] = pd.to_numeric(df['lng'], errors='coerce')
        df['lat'] = pd.to_numeric(df['lat'], errors='coerce')
        
        invalid = df[df['lng'].isna() | df['lat'].isna()]
        if not invalid.empty:
            print(f"警告: {source}中有 {len(invalid)} 条记录坐标无效")
        
        return df.dropna(subset=['lng', 'lat'])

    def _create_sample_communities(self) -> pd.DataFrame:
        data = [
            {'id': 'C001', 'name': '阳光花园', 'lng': 116.397, 'lat': 39.908, 'source': '小区', 'population': 1200},
            {'id': 'C002', 'name': '幸福里', 'lng': 116.405, 'lat': 39.912, 'source': '小区', 'population': 800},
            {'id': 'C003', 'name': '和平家园', 'lng': 116.388, 'lat': 39.915, 'source': '小区', 'population': 1500},
            {'id': 'C004', 'name': '翠苑小区', 'lng': 116.412, 'lat': 39.903, 'source': '小区', 'population': 2000},
            {'id': 'C005', 'name': '金棕榈', 'lng': 116.395, 'lat': 39.895, 'source': '小区', 'population': 900},
            {'id': 'C006', 'name': '锦绣家园', 'lng': 116.418, 'lat': 39.920, 'source': '小区', 'population': 1100},
            {'id': 'C007', 'name': '玫瑰园', 'lng': 116.380, 'lat': 39.900, 'source': '小区', 'population': 600},
            {'id': 'C008', 'name': '莲花小区', 'lng': 116.400, 'lat': 39.925, 'source': '小区', 'population': 1300},
            {'id': 'C009', 'name': '玉兰苑', 'lng': 116.420, 'lat': 39.898, 'source': '小区', 'population': 700},
            {'id': 'C010', 'name': '海棠花园', 'lng': 116.375, 'lat': 39.910, 'source': '小区', 'population': 1600},
        ]
        return pd.DataFrame(data)

    def _create_sample_warehouses(self) -> pd.DataFrame:
        data = [
            {'id': 'W001', 'name': '仓配中心A', 'lng': 116.400, 'lat': 39.910, 'source': '仓库候选', 'radius_km': 3.0},
            {'id': 'W002', 'name': '前置仓B', 'lng': 116.395, 'lat': 39.908, 'source': '仓库候选', 'radius_km': 2.5},
            {'id': 'W003', 'name': '站点C', 'lng': 116.410, 'lat': 39.915, 'source': '仓库候选', 'radius_km': 2.0},
            {'id': 'W004', 'name': '仓配中心D', 'lng': 116.385, 'lat': 39.905, 'source': '仓库候选', 'radius_km': 3.5},
        ]
        return pd.DataFrame(data)

    def merge_datasets(self, communities: pd.DataFrame, warehouses: pd.DataFrame) -> Tuple[pd.DataFrame, Dict]:
        all_points = pd.concat([communities, warehouses], ignore_index=True)
        conflicts = self._detect_conflicts(all_points)
        
        return all_points, conflicts

    def _detect_conflicts(self, all_points: pd.DataFrame) -> Dict:
        conflicts = {
            'duplicate_coordinates': [],
            'same_id_different_source': []
        }
        
        coord_groups = all_points.groupby(['lng', 'lat'])
        for (lng, lat), group in coord_groups:
            if len(group) > 1:
                sources = group['source'].unique()
                if len(sources) > 1:
                    conflicts['duplicate_coordinates'].append({
                        'coordinate': (lng, lat),
                        'records': group[['id', 'name', 'source']].to_dict('records'),
                        'severity': 'high' if '小区' in sources and '仓库候选' in sources else 'medium'
                    })
        
        id_groups = all_points.groupby('id')
        for id_val, group in id_groups:
            if len(group['source'].unique()) > 1:
                conflicts['same_id_different_source'].append({
                    'id': id_val,
                    'records': group[['name', 'source', 'lng', 'lat']].to_dict('records')
                })
        
        return conflicts
