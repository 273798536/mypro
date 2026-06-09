import pandas as pd
import numpy as np
from .base_rule import BaseRule
from config import Config


class SortingUnstableRule(BaseRule):
    rule_key = 'sorting_unstable'
    
    def detect(self, df, store, upload_id):
        sort_col = self.params.get('sort_column', 'score')
        group_col = self.params.get('group_column', 'question_id')
        rank_diff_threshold = self.params.get('rank_diff_threshold', 3)
        window_size = self.params.get('window_size', 3)
        
        if sort_col not in df.columns or group_col not in df.columns:
            return []
        
        detected = []
        
        for question_id, group in df.groupby(group_col):
            if len(group) < 2:
                continue
            
            group_sorted = group.sort_values(by=sort_col, ascending=False)
            ranks = group_sorted.reset_index()
            ranks['rank'] = ranks.index + 1
            
            if 'batch_id' in ranks.columns:
                ranks = ranks.sort_values('batch_id')
                ranks['rank_diff'] = ranks['rank'].diff().abs()
                unstable = ranks[ranks['rank_diff'] > rank_diff_threshold]
            else:
                ranks['score_diff'] = ranks[sort_col].diff().abs()
                ranks['score_ratio'] = ranks['score_diff'] / (ranks[sort_col].shift(1) + 1e-9)
                unstable = ranks[ranks['score_ratio'] > 0.5]
            
            for _, row in unstable.iterrows():
                orig_idx = int(row['index'])
                record_id = self._find_record_id(store, upload_id, orig_idx)
                if record_id:
                    if 'batch_id' in row:
                        details = (f"题目 {question_id} 在批次 {row.get('batch_id','')} "
                                   f"排名变化 {row.get('rank_diff','N/A')} 位，"
                                   f"超过阈值 {rank_diff_threshold}")
                    else:
                        details = (f"题目 {question_id} 分数波动异常，"
                                   f"变化比例 {row.get('score_ratio', 0):.2f}")
                    self._add_issue(store, record_id, 
                                  Config.ISSUE_TYPES['SORTING_UNSTABLE'], details)
                    detected.append(record_id)
        
        return detected
    
    def _find_record_id(self, store, upload_id, row_index):
        for rid, rec in store.records.items():
            if rec.get('upload_id') == upload_id and rec.get('row_index') == row_index:
                return rid
        return None
