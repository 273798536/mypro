from typing import Dict, List, Tuple
import logging
from datetime import datetime
from collections import defaultdict

from .models import (
    AdjustmentEntry,
    FinancialStatement,
    StatementType,
    Anomaly,
    Severity,
    Account,
)

logger = logging.getLogger(__name__)


class AdjustmentManager:
    def __init__(self, adjustments: List[AdjustmentEntry] = None):
        self.adjustments = adjustments or []
        self.applied_adjustments: List[AdjustmentEntry] = []
        self.anomalies: List[Anomaly] = []

    def add_adjustment(self, adjustment: AdjustmentEntry):
        self.adjustments.append(adjustment)

    def validate_adjustments(
        self,
        balance_sheet: FinancialStatement,
        income_statement: FinancialStatement = None,
    ) -> List[Anomaly]:
        self.anomalies = []
        
        self._check_duplicate_adjustments()
        self._check_account_existence(balance_sheet, income_statement)
        self._check_balanced_entries()
        
        return self.anomalies

    def _check_duplicate_adjustments(self):
        id_counts = defaultdict(int)
        signature_counts = defaultdict(list)

        for adj in self.adjustments:
            id_counts[adj.id] += 1
            signature = (adj.date, adj.debit_account, adj.credit_account, adj.amount)
            signature_counts[signature].append(adj.id)

        for adj_id, count in id_counts.items():
            if count > 1:
                self.anomalies.append(
                    Anomaly(
                        id=f"adj_dup_id_{adj_id}_{datetime.now().strftime('%H%M%S')}",
                        type="duplicate_adjustment_id",
                        severity=Severity.ERROR,
                        message=f"调整分录ID重复: {adj_id} 出现 {count} 次",
                        details={
                            "adjustment_id": adj_id,
                            "count": count,
                            "suggestion": "请检查并确保每个调整分录ID唯一",
                        },
                        accounts=[],
                    )
                )

        for signature, ids in signature_counts.items():
            if len(ids) > 1:
                self.anomalies.append(
                    Anomaly(
                        id=f"adj_dup_content_{ids[0]}_{datetime.now().strftime('%H%M%S')}",
                        type="duplicate_adjustment_content",
                        severity=Severity.WARNING,
                        message=f"存在内容重复的调整分录: {', '.join(ids)}",
                        details={
                            "adjustment_ids": ids,
                            "date": signature[0],
                            "debit": signature[1],
                            "credit": signature[2],
                            "amount": signature[3],
                            "suggestion": "请确认是否为重复调整，避免重复记账",
                        },
                        accounts=[signature[1], signature[2]],
                    )
                )

    def _check_account_existence(
        self,
        balance_sheet: FinancialStatement,
        income_statement: FinancialStatement,
    ):
        valid_accounts = set()
        if balance_sheet:
            valid_accounts.update(balance_sheet.accounts.keys())
        if income_statement:
            valid_accounts.update(income_statement.accounts.keys())

        for adj in self.adjustments:
            if adj.debit_account not in valid_accounts:
                self.anomalies.append(
                    Anomaly(
                        id=f"adj_inv_debit_{adj.id}_{datetime.now().strftime('%H%M%S')}",
                        type="invalid_adjustment_account",
                        severity=Severity.ERROR,
                        message=f"调整分录 {adj.id} 的借方科目 {adj.debit_account} 不存在",
                        details={
                            "adjustment_id": adj.id,
                            "account_type": "debit",
                            "account": adj.debit_account,
                            "suggestion": "请检查科目代码是否正确",
                        },
                        accounts=[adj.debit_account],
                    )
                )
            
            if adj.credit_account not in valid_accounts:
                self.anomalies.append(
                    Anomaly(
                        id=f"adj_inv_credit_{adj.id}_{datetime.now().strftime('%H%M%S')}",
                        type="invalid_adjustment_account",
                        severity=Severity.ERROR,
                        message=f"调整分录 {adj.id} 的贷方科目 {adj.credit_account} 不存在",
                        details={
                            "adjustment_id": adj.id,
                            "account_type": "credit",
                            "account": adj.credit_account,
                            "suggestion": "请检查科目代码是否正确",
                        },
                        accounts=[adj.credit_account],
                    )
                )

    def _check_balanced_entries(self):
        for adj in self.adjustments:
            if adj.amount <= 0:
                self.anomalies.append(
                    Anomaly(
                        id=f"adj_neg_amt_{adj.id}_{datetime.now().strftime('%H%M%S')}",
                        type="negative_amount",
                        severity=Severity.ERROR,
                        message=f"调整分录 {adj.id} 的金额 {adj.amount} 不是正数",
                        details={
                            "adjustment_id": adj.id,
                            "amount": adj.amount,
                            "suggestion": "请确保调整金额为正数",
                        },
                        accounts=[adj.debit_account, adj.credit_account],
                    )
                )

    def apply_adjustments(
        self,
        balance_sheet: FinancialStatement,
        income_statement: FinancialStatement = None,
    ) -> Tuple[FinancialStatement, FinancialStatement, List[AdjustmentEntry]]:
        applied = []
        
        for adj in self.adjustments:
            if adj.is_applied:
                continue

            success = self._apply_single_adjustment(adj, balance_sheet, income_statement)
            if success:
                adj.is_applied = True
                adj.applied_at = datetime.now()
                applied.append(adj)
                self.applied_adjustments.append(adj)

        return balance_sheet, income_statement, applied

    def _apply_single_adjustment(
        self,
        adjustment: AdjustmentEntry,
        balance_sheet: FinancialStatement,
        income_statement: FinancialStatement,
    ) -> bool:
        accounts = {}
        if balance_sheet:
            accounts.update(balance_sheet.accounts)
        if income_statement:
            accounts.update(income_statement.accounts)

        debit_account = accounts.get(adjustment.debit_account)
        credit_account = accounts.get(adjustment.credit_account)

        if not debit_account or not credit_account:
            logger.warning(f"无法应用调整分录 {adjustment.id}: 科目不存在")
            return False

        debit_account.balance += adjustment.amount
        credit_account.balance -= adjustment.amount

        logger.info(
            f"已应用调整分录 {adjustment.id}: {adjustment.debit_account} +{adjustment.amount}, "
            f"{adjustment.credit_account} -{adjustment.amount}"
        )

        return True

    def get_adjustment_summary(self) -> Dict:
        return {
            "total_adjustments": len(self.adjustments),
            "applied_adjustments": len(self.applied_adjustments),
            "pending_adjustments": len(self.adjustments) - len(self.applied_adjustments),
            "total_adjustment_amount": sum(adj.amount for adj in self.adjustments),
            "anomalies_count": len(self.anomalies),
        }
