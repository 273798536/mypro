from pathlib import Path
from typing import Dict, List
import yaml


class Config:
    def __init__(self, config_file: str = None):
        self.statement_files = {
            "balance_sheet": ["balance_sheet.xlsx", "资产负债表.xlsx"],
            "income_statement": ["income_statement.xlsx", "利润表.xlsx"],
            "cash_flow": ["cash_flow.xlsx", "现金流量表.xlsx"],
            "account_mapping": ["account_mapping.xlsx", "科目映射.xlsx", "mapping.xlsx"],
            "adjustments": ["adjustments.xlsx", "调整分录.xlsx"],
        }
        
        self.required_columns = {
            "balance_sheet": ["科目代码", "科目名称", "期初余额", "期末余额"],
            "income_statement": ["科目代码", "科目名称", "本期金额", "上期金额"],
            "cash_flow": ["项目代码", "项目名称", "本期金额", "上期金额"],
            "account_mapping": ["源科目", "目标科目", "映射类型"],
            "adjustments": ["分录ID", "日期", "摘要", "借方科目", "贷方科目", "金额"],
        }
        
        self.check_rules = {
            "check_opening_balance": True,
            "check_missing_mappings": True,
            "check_duplicate_adjustments": True,
            "check_assets_equity": True,
            "check_net_income_reconciliation": True,
            "check_cash_flow": True,
        }
        
        if config_file and Path(config_file).exists():
            self._load_from_file(config_file)

    def _load_from_file(self, config_file: str):
        with open(config_file, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
            if data:
                if 'statement_files' in data:
                    self.statement_files.update(data['statement_files'])
                if 'check_rules' in data:
                    self.check_rules.update(data['check_rules'])
