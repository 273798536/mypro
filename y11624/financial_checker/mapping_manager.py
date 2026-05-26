from typing import Dict, List, Set, Tuple
import logging
from datetime import datetime

from .models import (
    AccountMapping,
    FinancialStatement,
    StatementType,
    Anomaly,
    Severity,
    Account,
)

logger = logging.getLogger(__name__)


class MappingManager:
    def __init__(self, mappings: Dict[str, AccountMapping] = None):
        self.mappings = mappings or {}
        self.missing_mappings: List[Anomaly] = []
        self.unmapped_accounts: Set[str] = set()

    def add_mapping(self, source: str, target: str, mapping_type: str = "direct"):
        self.mappings[source] = AccountMapping(
            source_account=source,
            target_account=target,
            mapping_type=mapping_type,
        )

    def get_target(self, source_account: str) -> str:
        if source_account in self.mappings:
            return self.mappings[source_account].target_account
        return source_account

    def validate_mappings(
        self,
        balance_sheet: FinancialStatement,
        income_statement: FinancialStatement = None,
        cash_flow: FinancialStatement = None,
    ) -> List[Anomaly]:
        self.missing_mappings = []
        self.unmapped_accounts = set()

        all_accounts = set()
        
        if balance_sheet:
            all_accounts.update(balance_sheet.accounts.keys())
        
        if income_statement:
            all_accounts.update(income_statement.accounts.keys())
        
        if cash_flow:
            all_accounts.update(cash_flow.accounts.keys())

        for account_code in all_accounts:
            if account_code not in self.mappings:
                self.unmapped_accounts.add(account_code)
                self.missing_mappings.append(
                    Anomaly(
                        id=f"map_missing_{account_code}_{datetime.now().strftime('%H%M%S')}",
                        type="missing_mapping",
                        severity=Severity.WARNING,
                        message=f"科目 {account_code} 缺少映射配置",
                        details={
                            "account_code": account_code,
                            "suggestion": "请在科目映射表中添加该科目的映射关系",
                        },
                        accounts=[account_code],
                    )
                )

        self._validate_mapping_targets(balance_sheet, income_statement, cash_flow)

        return self.missing_mappings

    def _validate_mapping_targets(
        self,
        balance_sheet: FinancialStatement,
        income_statement: FinancialStatement,
        cash_flow: FinancialStatement,
    ):
        valid_targets = set()
        if balance_sheet:
            valid_targets.update(balance_sheet.accounts.keys())
        if income_statement:
            valid_targets.update(income_statement.accounts.keys())
        if cash_flow:
            valid_targets.update(cash_flow.accounts.keys())

        for source, mapping in self.mappings.items():
            if mapping.target_account not in valid_targets:
                self.missing_mappings.append(
                    Anomaly(
                        id=f"map_invalid_target_{source}_{datetime.now().strftime('%H%M%S')}",
                        type="invalid_mapping_target",
                        severity=Severity.ERROR,
                        message=f"科目 {source} 的映射目标 {mapping.target_account} 不存在",
                        details={
                            "source_account": source,
                            "target_account": mapping.target_account,
                            "suggestion": "请检查映射目标科目是否存在于报表中",
                        },
                        accounts=[source, mapping.target_account],
                    )
                )

    def apply_mappings(
        self,
        balance_sheet: FinancialStatement,
        income_statement: FinancialStatement = None,
        cash_flow: FinancialStatement = None,
    ) -> Tuple[FinancialStatement, FinancialStatement, FinancialStatement]:
        self._apply_mapping_to_statement(balance_sheet)
        self._apply_mapping_to_statement(income_statement)
        self._apply_mapping_to_statement(cash_flow)
        
        return balance_sheet, income_statement, cash_flow

    def _apply_mapping_to_statement(self, statement: FinancialStatement):
        if not statement:
            return

        mapped_accounts: Dict[str, Account] = {}
        
        for code, account in statement.accounts.items():
            target_code = self.get_target(code)
            
            if target_code != code:
                if target_code in mapped_accounts:
                    mapped_accounts[target_code].balance += account.balance
                    if account.opening_balance is not None:
                        if mapped_accounts[target_code].opening_balance is None:
                            mapped_accounts[target_code].opening_balance = 0.0
                        mapped_accounts[target_code].opening_balance += account.opening_balance
                else:
                    mapped_accounts[target_code] = Account(
                        code=target_code,
                        name=account.name,
                        statement_type=account.statement_type,
                        category=account.category,
                        balance=account.balance,
                        opening_balance=account.opening_balance,
                    )
            else:
                mapped_accounts[code] = account

        statement.accounts = mapped_accounts

    def get_mapping_summary(self) -> Dict:
        return {
            "total_mappings": len(self.mappings),
            "missing_mappings_count": len(self.missing_mappings),
            "unmapped_accounts": list(self.unmapped_accounts),
            "mapping_coverage": (
                1 - len(self.unmapped_accounts) / max(len(self.mappings) + len(self.unmapped_accounts), 1)
            )
            * 100,
        }
