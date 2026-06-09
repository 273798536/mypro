import os
import yaml
from config import Config


class RuleConfig:
    def __init__(self, config_path=None):
        self.config_path = config_path or Config.RULES_CONFIG
        self._config = None
        self.load()
    
    def load(self):
        if os.path.exists(self.config_path):
            with open(self.config_path, 'r', encoding='utf-8') as f:
                self._config = yaml.safe_load(f)
        else:
            self._config = {'rules': {}, 'review_workflow': {}}
    
    def get_rule(self, rule_key):
        return self._config.get('rules', {}).get(rule_key)
    
    def get_all_rules(self):
        return self._config.get('rules', {})
    
    def get_enabled_rules(self):
        return {k: v for k, v in self._config.get('rules', {}).items() 
                if v.get('enabled', True)}
    
    def get_workflow(self):
        return self._config.get('review_workflow', {})
    
    def get_params(self, rule_key):
        rule = self.get_rule(rule_key)
        return rule.get('params', {}) if rule else {}
