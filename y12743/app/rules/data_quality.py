import pandas as pd
import numpy as np
from .base_rule import BaseRule
from config import Config


class DataMissingRule(BaseRule):
    rule_key = 'data_missing'
    
    def detect(self, df, store, upload_id):
        required_cols = self.params.get('required_columns', [])
        
        if not required_cols:
            return []
        
        present_cols = [c for c in required_cols if c in df.columns]
        if not present_cols:
            return []
        
        detected = []
        
        for idx, row in df.iterrows():
            missing = [c for c in present_cols if pd.isna(row.get(c))]
            if missing:
                record_id = self._find_record_id(store, upload_id, idx)
                if record_id:
                    details = f"关键字段缺失: {', '.join(missing)}"
                    self._add_issue(store, record_id,
                                  Config.ISSUE_TYPES['DATA_MISSING'], details)
                    detected.append(record_id)
        
        return detected
    
    def _find_record_id(self, store, upload_id, row_index):
        for rid, rec in store.records.items():
            if rec.get('upload_id') == upload_id and rec.get('row_index') == row_index:
                return rid
        return None


class DataAbnormalRule(BaseRule):
    rule_key = 'data_abnormal'
    
    def detect(self, df, store, upload_id):
        check_cols = self.params.get('check_columns', [])
        zscore_threshold = self.params.get('zscore_threshold', 2.5)
        
        present_cols = [c for c in check_cols if c in df.columns]
        if not present_cols:
            return []
        
        detected = []
        
        for col in present_cols:
            if not pd.api.types.is_numeric_dtype(df[col]):
                continue
            vals = df[col].dropna()
            if len(vals) < 3:
                continue
            mean = vals.mean()
            std = vals.std()
            if std == 0:
                continue
            
            for idx, row in df.iterrows():
                val = row.get(col)
                if pd.isna(val):
                    continue
                zscore = abs(val - mean) / std
                if zscore > zscore_threshold:
                    record_id = self._find_record_id(store, upload_id, idx)
                    if record_id:
                        details = (f"字段 {col}={val} 异常，"
                                   f"Z-Score={zscore:.2f}，均值={mean:.2f}，"
                                   f"标准差={std:.2f}，阈值={zscore_threshold}")
                        self._add_issue(store, record_id,
                                      Config.ISSUE_TYPES['DATA_ABNORMAL'], details)
                        if record_id not in detected:
                            detected.append(record_id)
        
        return detected
    
    def _find_record_id(self, store, upload_id, row_index):
        for rid, rec in store.records.items():
            if rec.get('upload_id') == upload_id and rec.get('row_index') == row_index:
                return rid
        return None
