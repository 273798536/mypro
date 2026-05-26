from typing import Dict, List, Tuple
import logging
from datetime import datetime

from .models import (
    FinancialStatement,
    StatementType,
    CheckResult,
    Anomaly,
    Severity,
)
from .config import Config

logger = logging.getLogger(__name__)


class RuleEngine:
    def __init__(self, config: Config = None):
        self.config = config or Config()
        self.results: List[CheckResult] = []

    def run_all_checks(
        self,
        balance_sheet: FinancialStatement,
        income_statement: FinancialStatement,
        cash_flow: FinancialStatement,
    ) -> List[CheckResult]:
        self.results = []

        if self.config.check_rules.get("check_opening_balance"):
            self.results.append(self._check_opening_balance(balance_sheet))

        if self.config.check_rules.get("check_assets_equity"):
            self.results.append(self._check_assets_equals_liabilities_equity(balance_sheet))

        if self.config.check_rules.get("check_net_income_reconciliation"):
            self.results.append(
                self._check_net_income_reconciliation(balance_sheet, income_statement)
            )

        if self.config.check_rules.get("check_cash_flow"):
            self.results.append(self._check_cash_flow_consistency(balance_sheet, cash_flow))

        return self.results

    def _check_opening_balance(self, balance_sheet: FinancialStatement) -> CheckResult:
        anomalies: List[Anomaly] = []
        total_opening_debit = 0.0
        total_opening_credit = 0.0

        for code, account in balance_sheet.accounts.items():
            if account.opening_balance is None:
                anomalies.append(
                    Anomaly(
                        id=f"open_missing_{code}_{datetime.now().strftime('%H%M%S')}",
                        type="missing_opening_balance",
                        severity=Severity.WARNING,
                        message=f"科目 {account.name} ({code}) 缺少期初余额",
                        details={
                            "account_code": code,
                            "account_name": account.name,
                            "suggestion": "请补全期初余额数据",
                        },
                        accounts=[code],
                    )
                )
                continue

            if account.category in ["asset", "cost", "expense"]:
                total_opening_debit += account.opening_balance
            else:
                total_opening_credit += account.opening_balance

        diff = abs(total_opening_debit - total_opening_credit)
        tolerance = 0.01

        if diff > tolerance:
            anomalies.append(
                Anomaly(
                    id=f"open_unbalanced_{datetime.now().strftime('%H%M%S')}",
                    type="opening_balance_unbalanced",
                    severity=Severity.ERROR,
                    message=f"期初余额借贷不平: 借方合计 {total_opening_debit:.2f}, 贷方合计 {total_opening_credit:.2f}, 差额 {diff:.2f}",
                    details={
                        "total_debit": total_opening_debit,
                        "total_credit": total_opening_credit,
                        "difference": diff,
                        "suggestion": "请检查期初余额的借贷方向和金额",
                    },
                    accounts=[],
                )
            )

        return CheckResult(
            rule_name="check_opening_balance",
            passed=len([a for a in anomalies if a.severity == Severity.ERROR]) == 0,
            message=f"期初余额检查完成，发现 {len(anomalies)} 个问题",
            details={
                "total_opening_debit": total_opening_debit,
                "total_opening_credit": total_opening_credit,
                "difference": diff,
            },
            anomalies=anomalies,
        )

    def _check_assets_equals_liabilities_equity(self, balance_sheet: FinancialStatement) -> CheckResult:
        anomalies: List[Anomaly] = []

        total_assets = sum(
            acc.balance for code, acc in balance_sheet.accounts.items() if acc.category == "asset"
        )
        total_liabilities = sum(
            acc.balance for code, acc in balance_sheet.accounts.items() if acc.category == "liability"
        )
        total_equity = sum(
            acc.balance for code, acc in balance_sheet.accounts.items() if acc.category == "equity"
        )

        diff = abs(total_assets - (total_liabilities + total_equity))
        tolerance = 0.01

        if diff > tolerance:
            anomalies.append(
                Anomaly(
                    id=f"ae_unbalanced_{datetime.now().strftime('%H%M%S')}",
                    type="assets_liabilities_equity_unbalanced",
                    severity=Severity.ERROR,
                    message=f"资产负债表不平: 资产 {total_assets:.2f}, 负债+权益 {total_liabilities + total_equity:.2f}, 差额 {diff:.2f}",
                    details={
                        "total_assets": total_assets,
                        "total_liabilities": total_liabilities,
                        "total_equity": total_equity,
                        "difference": diff,
                        "suggestion": "请检查资产、负债、权益类科目余额",
                    },
                    accounts=[],
                )
            )

        return CheckResult(
            rule_name="check_assets_equals_liabilities_equity",
            passed=len(anomalies) == 0,
            message=f"资产=负债+权益检查完成，差额 {diff:.2f}",
            details={
                "total_assets": total_assets,
                "total_liabilities": total_liabilities,
                "total_equity": total_equity,
                "difference": diff,
            },
            anomalies=anomalies,
        )

    def _check_net_income_reconciliation(
        self,
        balance_sheet: FinancialStatement,
        income_statement: FinancialStatement,
    ) -> CheckResult:
        anomalies: List[Anomaly] = []

        net_income = sum(
            acc.balance
            for code, acc in income_statement.accounts.items()
            if acc.category == "income"
        )
        total_expenses = sum(
            acc.balance
            for code, acc in income_statement.accounts.items()
            if acc.category == "expense"
        )
        current_net_profit = net_income - total_expenses

        retained_earnings_accounts = [
            acc
            for code, acc in balance_sheet.accounts.items()
            if "未分配利润" in acc.name or "利润分配" in acc.name
        ]

        retained_earnings_change = sum(
            acc.balance - (acc.opening_balance or 0)
            for acc in retained_earnings_accounts
        )

        diff = abs(current_net_profit - retained_earnings_change)
        tolerance = 0.01

        if diff > tolerance:
            anomalies.append(
                Anomaly(
                    id=f"ni_reconcile_{datetime.now().strftime('%H%M%S')}",
                    type="net_income_reconciliation_failed",
                    severity=Severity.WARNING,
                    message=f"净利润与未分配利润变动不一致: 净利润 {current_net_profit:.2f}, 未分配利润变动 {retained_earnings_change:.2f}, 差额 {diff:.2f}",
                    details={
                        "net_income": net_income,
                        "total_expenses": total_expenses,
                        "current_net_profit": current_net_profit,
                        "retained_earnings_change": retained_earnings_change,
                        "difference": diff,
                        "suggestion": "请检查利润分配、以前年度损益调整等科目",
                    },
                    accounts=[acc.code for acc in retained_earnings_accounts],
                )
            )

        return CheckResult(
            rule_name="check_net_income_reconciliation",
            passed=len(anomalies) == 0,
            message=f"净利润勾稽检查完成，差额 {diff:.2f}",
            details={
                "current_net_profit": current_net_profit,
                "retained_earnings_change": retained_earnings_change,
                "difference": diff,
            },
            anomalies=anomalies,
        )

    def _check_cash_flow_consistency(
        self,
        balance_sheet: FinancialStatement,
        cash_flow: FinancialStatement,
    ) -> CheckResult:
        anomalies: List[Anomaly] = []

        cash_accounts = [
            acc
            for code, acc in balance_sheet.accounts.items()
            if "现金" in acc.name or "银行存款" in acc.name or "货币资金" in acc.name
        ]

        if not cash_accounts:
            anomalies.append(
                Anomaly(
                    id=f"cf_no_cash_{datetime.now().strftime('%H%M%S')}",
                    type="no_cash_account_found",
                    severity=Severity.WARNING,
                    message="未找到货币资金类科目，无法验证现金流量表勾稽关系",
                    details={
                        "suggestion": "请确保资产负债表中包含现金、银行存款或货币资金科目",
                    },
                    accounts=[],
                )
            )
            return CheckResult(
                rule_name="check_cash_flow_consistency",
                passed=False,
                message="未找到货币资金类科目，跳过检查",
                details={},
                anomalies=anomalies,
            )

        cash_end_balance = sum(acc.balance for acc in cash_accounts)
        cash_opening_balance = sum(acc.opening_balance or 0 for acc in cash_accounts)
        cash_change = cash_end_balance - cash_opening_balance

        net_cash_flow = sum(acc.balance for acc in cash_flow.accounts.values())

        diff = abs(net_cash_flow - cash_change)
        tolerance = 0.01

        if diff > tolerance:
            anomalies.append(
                Anomaly(
                    id=f"cf_unbalanced_{datetime.now().strftime('%H%M%S')}",
                    type="cash_flow_unbalanced",
                    severity=Severity.ERROR,
                    message=f"现金流量表与货币资金变动不一致: 现金流量净额 {net_cash_flow:.2f}, 货币资金变动 {cash_change:.2f}, 差额 {diff:.2f}",
                    details={
                        "cash_end_balance": cash_end_balance,
                        "cash_opening_balance": cash_opening_balance,
                        "cash_change": cash_change,
                        "net_cash_flow": net_cash_flow,
                        "difference": diff,
                        "suggestion": "请检查现金流量表编制是否正确",
                    },
                    accounts=[acc.code for acc in cash_accounts],
                )
            )

        return CheckResult(
            rule_name="check_cash_flow_consistency",
            passed=len(anomalies) == 0,
            message=f"现金流量表勾稽检查完成，差额 {diff:.2f}",
            details={
                "cash_end_balance": cash_end_balance,
                "cash_opening_balance": cash_opening_balance,
                "cash_change": cash_change,
                "net_cash_flow": net_cash_flow,
                "difference": diff,
            },
            anomalies=anomalies,
        )

    def get_summary(self) -> Dict:
        total_rules = len(self.results)
        passed_rules = sum(1 for r in self.results if r.passed)
        total_anomalies = sum(len(r.anomalies) for r in self.results)
        errors = sum(
            1
            for r in self.results
            for a in r.anomalies
            if a.severity == Severity.ERROR
        )
        warnings = sum(
            1
            for r in self.results
            for a in r.anomalies
            if a.severity == Severity.WARNING
        )

        return {
            "total_rules": total_rules,
            "passed_rules": passed_rules,
            "failed_rules": total_rules - passed_rules,
            "total_anomalies": total_anomalies,
            "errors": errors,
            "warnings": warnings,
            "pass_rate": (passed_rules / total_rules * 100) if total_rules > 0 else 0,
        }
