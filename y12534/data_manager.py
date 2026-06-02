import pandas as pd
import numpy as np
from pathlib import Path
import json
from datetime import datetime


class DataManager:
    def __init__(self, data_dir="./data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        
        self.metrics_df = None
        self.groups_df = None
        self.windows_df = None
        self.metadata = {}
        
        self._load_state()
    
    def _load_state(self):
        meta_file = self.data_dir / "metadata.json"
        if meta_file.exists():
            with open(meta_file, 'r', encoding='utf-8') as f:
                self.metadata = json.load(f)
        
        metrics_file = self.data_dir / "metrics.csv"
        if metrics_file.exists():
            self.metrics_df = pd.read_csv(metrics_file)
        
        groups_file = self.data_dir / "groups.csv"
        if groups_file.exists():
            self.groups_df = pd.read_csv(groups_file)
        
        windows_file = self.data_dir / "windows.csv"
        if windows_file.exists():
            self.windows_df = pd.read_csv(windows_file)
    
    def _save_state(self):
        meta_file = self.data_dir / "metadata.json"
        with open(meta_file, 'w', encoding='utf-8') as f:
            json.dump(self.metadata, f, ensure_ascii=False, indent=2)
        
        if self.metrics_df is not None:
            self.metrics_df.to_csv(self.data_dir / "metrics.csv", index=False)
        if self.groups_df is not None:
            self.groups_df.to_csv(self.data_dir / "groups.csv", index=False)
        if self.windows_df is not None:
            self.windows_df.to_csv(self.data_dir / "windows.csv", index=False)
    
    def import_metrics(self, file_path, id_col="sample_id", date_col=None, overwrite=False):
        if not overwrite and self.metrics_df is not None:
            raise ValueError("指标数据已存在，如需覆盖请设置 overwrite=True")
        
        file_path = Path(file_path)
        if file_path.suffix == '.csv':
            df = pd.read_csv(file_path)
        elif file_path.suffix in ['.xlsx', '.xls']:
            df = pd.read_excel(file_path)
        else:
            raise ValueError("仅支持 CSV 和 Excel 文件")
        
        if id_col not in df.columns:
            raise ValueError(f"ID 列 '{id_col}' 不存在")
        
        df[id_col] = df[id_col].astype(str)
        
        self.metrics_df = df
        self.metadata['id_column'] = id_col
        self.metadata['date_column'] = date_col
        self.metadata['metrics_import_time'] = datetime.now().isoformat()
        self.metadata['metric_columns'] = [c for c in df.columns if c not in [id_col, date_col]]
        
        self._save_state()
        return f"成功导入 {len(df)} 条记录，{len(self.metadata['metric_columns'])} 个指标"
    
    def add_sample_groups(self, file_path=None, group_data=None, group_name="group"):
        if self.metrics_df is None:
            raise ValueError("请先导入指标数据")
        
        id_col = self.metadata['id_column']
        
        if file_path:
            file_path = Path(file_path)
            if file_path.suffix == '.csv':
                new_groups = pd.read_csv(file_path)
            elif file_path.suffix in ['.xlsx', '.xls']:
                new_groups = pd.read_excel(file_path)
            else:
                raise ValueError("仅支持 CSV 和 Excel 文件")
        elif group_data is not None:
            new_groups = pd.DataFrame(group_data)
        else:
            raise ValueError("必须提供 file_path 或 group_data")
        
        new_groups[id_col] = new_groups[id_col].astype(str)
        
        if group_name in new_groups.columns:
            new_groups = new_groups[[id_col, group_name]].rename(columns={group_name: f"group_{group_name}"})
        else:
            new_groups.columns = [id_col] + [f"group_{c}" for c in new_groups.columns if c != id_col]
        
        if self.groups_df is None:
            self.groups_df = new_groups
        else:
            existing_group_cols = [c for c in self.groups_df.columns if c.startswith('group_')]
            new_group_cols = [c for c in new_groups.columns if c.startswith('group_')]
            
            for col in new_group_cols:
                if col in existing_group_cols:
                    merged = self.groups_df[[id_col]].merge(new_groups[[id_col, col]], on=id_col, how='outer')
                    self.groups_df = self.groups_df.drop(columns=[col]).merge(merged, on=id_col, how='outer')
                else:
                    self.groups_df = self.groups_df.merge(new_groups[[id_col, col]], on=id_col, how='outer')
        
        self.metadata['groups_last_updated'] = datetime.now().isoformat()
        self._save_state()
        
        return f"成功更新样本分组，当前共有 {len([c for c in self.groups_df.columns if c.startswith('group_')])} 套分组"
    
    def add_time_windows(self, file_path=None, window_data=None, window_col="window"):
        if self.metrics_df is None:
            raise ValueError("请先导入指标数据")
        
        id_col = self.metadata['id_column']
        
        if file_path:
            file_path = Path(file_path)
            if file_path.suffix == '.csv':
                new_windows = pd.read_csv(file_path)
            elif file_path.suffix in ['.xlsx', '.xls']:
                new_windows = pd.read_excel(file_path)
            else:
                raise ValueError("仅支持 CSV 和 Excel 文件")
        elif window_data is not None:
            new_windows = pd.DataFrame(window_data)
        else:
            raise ValueError("必须提供 file_path 或 window_data")
        
        new_windows[id_col] = new_windows[id_col].astype(str)
        
        if window_col in new_windows.columns:
            new_windows = new_windows[[id_col, window_col]].rename(columns={window_col: f"window_{window_col}"})
        else:
            new_windows.columns = [id_col] + [f"window_{c}" for c in new_windows.columns if c != id_col]
        
        if self.windows_df is None:
            self.windows_df = new_windows
        else:
            existing_window_cols = [c for c in self.windows_df.columns if c.startswith('window_')]
            new_window_cols = [c for c in new_windows.columns if c.startswith('window_')]
            
            for col in new_window_cols:
                if col in existing_window_cols:
                    merged = self.windows_df[[id_col]].merge(new_windows[[id_col, col]], on=id_col, how='outer')
                    self.windows_df = self.windows_df.drop(columns=[col]).merge(merged, on=id_col, how='outer')
                else:
                    self.windows_df = self.windows_df.merge(new_windows[[id_col, col]], on=id_col, how='outer')
        
        self.metadata['windows_last_updated'] = datetime.now().isoformat()
        self._save_state()
        
        return f"成功更新时间窗口，当前共有 {len([c for c in self.windows_df.columns if c.startswith('window_')])} 套时间窗口"
    
    def get_combined_data(self):
        if self.metrics_df is None:
            return None
        
        result = self.metrics_df.copy()
        id_col = self.metadata['id_column']
        
        if self.groups_df is not None:
            result = result.merge(self.groups_df, on=id_col, how='left')
        
        if self.windows_df is not None:
            result = result.merge(self.windows_df, on=id_col, how='left')
        
        return result
    
    def get_group_columns(self):
        if self.groups_df is None:
            return []
        return [c for c in self.groups_df.columns if c.startswith('group_')]
    
    def get_window_columns(self):
        if self.windows_df is None:
            return []
        return [c for c in self.windows_df.columns if c.startswith('window_')]
    
    def get_metric_columns(self):
        return self.metadata.get('metric_columns', [])
    
    def info(self):
        info = {
            "指标数据": f"{len(self.metrics_df)} 条记录" if self.metrics_df is not None else "未导入",
            "指标数量": len(self.metadata.get('metric_columns', [])),
            "样本分组数量": len(self.get_group_columns()),
            "时间窗口数量": len(self.get_window_columns()),
            "分组列": self.get_group_columns(),
            "窗口列": self.get_window_columns()
        }
        return info
