from .config_loader import RuleConfig
from .sorting_unstable import SortingUnstableRule
from .extrapolation_oob import ExtrapolationOutOfBoundsRule
from .data_quality import DataMissingRule, DataAbnormalRule


class RuleEngine:
    _rule_map = {
        'sorting_unstable': SortingUnstableRule,
        'extrapolation_out_of_bounds': ExtrapolationOutOfBoundsRule,
        'data_missing': DataMissingRule,
        'data_abnormal': DataAbnormalRule
    }
    
    def __init__(self):
        self.config = RuleConfig()
        self.active_rules = []
        self._load_rules()
    
    def _load_rules(self):
        enabled = self.config.get_enabled_rules()
        for key, _ in enabled.items():
            if key in self._rule_map:
                self.active_rules.append(self._rule_map[key](self.config))
    
    def run_all(self, df, store, upload_id):
        results = {}
        for rule in self.active_rules:
            try:
                detected = rule.detect(df, store, upload_id)
                results[rule.rule_key] = {
                    'name': rule.name,
                    'count': len(detected),
                    'record_ids': detected
                }
            except Exception as e:
                results[rule.rule_key] = {
                    'name': rule.name,
                    'count': 0,
                    'error': str(e)
                }
        
        self._apply_suggested_statuses(store)
        return results
    
    def _apply_suggested_statuses(self, store):
        status_priority = {
            'recollect': 3,
            'pending': 2,
            'available': 1,
            None: 0
        }
        
        for record_id, record in store.records.items():
            final_status = None
            max_priority = 0
            for issue_id in record.get('issues', []):
                issue = store.issues.get(issue_id, {})
                sug = issue.get('suggested_status')
                p = status_priority.get(sug, 0)
                if p > max_priority:
                    max_priority = p
                    final_status = sug
            if final_status and record.get('data_status') != final_status:
                store.set_record_status(record_id, final_status)
    
    def get_rule_descriptions(self):
        return [
            {
                'key': rule.rule_key,
                'name': rule.name,
                'description': rule.description,
                'severity': rule.severity,
                'params': rule.params
            }
            for rule in self.active_rules
        ]
