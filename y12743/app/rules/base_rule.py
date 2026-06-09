import pandas as pd
import numpy as np
from abc import ABC, abstractmethod


class BaseRule(ABC):
    rule_key = None
    
    def __init__(self, config):
        self.config = config
        self.rule_def = config.get_rule(self.rule_key) or {}
        self.params = self.rule_def.get('params', {})
        self.name = self.rule_def.get('name', self.rule_key)
        self.description = self.rule_def.get('description', '')
        self.severity = self.rule_def.get('severity', 'medium')
        self.suggested_status = self.rule_def.get('result_status', 'pending')
    
    @abstractmethod
    def detect(self, df, store, upload_id):
        pass
    
    def _add_issue(self, store, record_id, issue_type, details):
        store.add_issue(
            record_id=record_id,
            issue_type=issue_type,
            rule_name=self.name,
            details=details,
            severity=self.severity,
            suggested_status=self.suggested_status
        )
