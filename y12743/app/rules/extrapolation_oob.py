import pandas as pd
import numpy as np
from .base_rule import BaseRule
from config import Config


class ExtrapolationOutOfBoundsRule(BaseRule):
    rule_key = 'extrapolation_out_of_bounds'
    
    def detect(self, df, store, upload_id):
        value_col = self.params.get('value_column', 'extrapolated_value')
        lower_bound = self.params.get('lower_bound', 0)
        upper_bound = self.params.get('upper_bound', 100)
        hist_col = self.params.get('historical_column', 'historical_value')
        deviation_threshold = self.params.get('deviation_threshold', 0.3)
        
        if value_col not in df.columns:
            return []
        
        detected = []
        
        for idx, row in df.iterrows():
            value = row.get(value_col)
            if pd.isna(value):
                continue
            
            reasons = []
            calc_notes = []
            
            if value < lower_bound or value > upper_bound:
                reasons.append(f"值 {value} 超出合理范围 [{lower_bound}, {upper_bound}]")
            
            if hist_col in df.columns and not pd.isna(row.get(hist_col)):
                hist_val = row[hist_col]
                if hist_val != 0:
                    deviation = abs(value - hist_val) / abs(hist_val)
                    calc_notes.append(f"历史值={hist_val}, 偏差率={deviation:.3f}")
                    if deviation > deviation_threshold:
                        reasons.append(
                            f"与历史值偏差 {deviation:.1%}，超过阈值 {deviation_threshold:.0%}")
            
            if reasons:
                record_id = self._find_record_id(store, upload_id, idx)
                if record_id:
                    details = "; ".join(reasons)
                    if calc_notes:
                        details += f" (计算过程: {'; '.join(calc_notes)})"
                    self._add_issue(store, record_id,
                                  Config.ISSUE_TYPES['EXTRAPOLATION_OUT_OF_BOUNDS'],
                                  details)
                    detected.append(record_id)
        
        return detected
    
    def _find_record_id(self, store, upload_id, row_index):
        for rid, rec in store.records.items():
            if rec.get('upload_id') == upload_id and rec.get('row_index') == row_index:
                return rid
        return None
