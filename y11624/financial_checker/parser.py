import pandas as pd
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import logging

from .models import (
    Account,
    FinancialStatement,
    StatementType,
    AccountMapping,
    AdjustmentEntry,
)
from .config import Config

logger = logging.getLogger(__name__)


class StatementParser:
    def __init__(self, config: Config):
        self.config = config

    def _find_file(self, directory: str, file_names: List[str]) -> Optional[str]:
        dir_path = Path(directory)
        for name in file_names:
            file_path = dir_path / name
            if file_path.exists():
                return str(file_path)
        return None

    def _read_excel(self, file_path: str) -> pd.DataFrame:
        return pd.read_excel(file_path, dtype={"科目代码": str, "项目代码": str})

    def parse_balance_sheet(self, directory: str) -> Optional[FinancialStatement]:
        file_path = self._find_file(directory, self.config.statement_files["balance_sheet"])
        if not file_path:
            logger.warning("未找到资产负债表文件")
            return None

        df = self._read_excel(file_path)
        required_cols = self.config.required_columns["balance_sheet"]
        
        for col in required_cols:
            if col not in df.columns:
                logger.error(f"资产负债表缺少必要列: {col}")
                return None

        statement = FinancialStatement(
            type=StatementType.BALANCE_SHEET,
            period="current",
            source_file=file_path,
            raw_data=df,
        )

        for _, row in df.iterrows():
            code = str(row["科目代码"]).strip()
            name = str(row["科目名称"]).strip()
            if not code or code.startswith("合计") or code.startswith("总计"):
                continue

            account = Account(
                code=code,
                name=name,
                statement_type=StatementType.BALANCE_SHEET,
                category=self._determine_category(code),
                balance=float(row["期末余额"]) if pd.notna(row["期末余额"]) else 0.0,
                opening_balance=float(row["期初余额"]) if pd.notna(row["期初余额"]) else None,
            )
            statement.accounts[code] = account

        return statement

    def parse_income_statement(self, directory: str) -> Optional[FinancialStatement]:
        file_path = self._find_file(directory, self.config.statement_files["income_statement"])
        if not file_path:
            logger.warning("未找到利润表文件")
            return None

        df = self._read_excel(file_path)
        required_cols = self.config.required_columns["income_statement"]
        
        for col in required_cols:
            if col not in df.columns:
                logger.error(f"利润表缺少必要列: {col}")
                return None

        statement = FinancialStatement(
            type=StatementType.INCOME_STATEMENT,
            period="current",
            source_file=file_path,
            raw_data=df,
        )

        for _, row in df.iterrows():
            code = str(row["科目代码"]).strip()
            name = str(row["科目名称"]).strip()
            if not code or code.startswith("合计") or code.startswith("总计"):
                continue

            account = Account(
                code=code,
                name=name,
                statement_type=StatementType.INCOME_STATEMENT,
                category="income" if code.startswith("6") else "expense",
                balance=float(row["本期金额"]) if pd.notna(row["本期金额"]) else 0.0,
            )
            statement.accounts[code] = account

        return statement

    def parse_cash_flow(self, directory: str) -> Optional[FinancialStatement]:
        file_path = self._find_file(directory, self.config.statement_files["cash_flow"])
        if not file_path:
            logger.warning("未找到现金流量表文件")
            return None

        df = self._read_excel(file_path)
        required_cols = self.config.required_columns["cash_flow"]
        
        for col in required_cols:
            if col not in df.columns:
                logger.error(f"现金流量表缺少必要列: {col}")
                return None

        statement = FinancialStatement(
            type=StatementType.CASH_FLOW,
            period="current",
            source_file=file_path,
            raw_data=df,
        )

        for _, row in df.iterrows():
            code = str(row["项目代码"]).strip()
            name = str(row["项目名称"]).strip()
            if not code or code.startswith("合计") or code.startswith("总计"):
                continue

            account = Account(
                code=code,
                name=name,
                statement_type=StatementType.CASH_FLOW,
                category=self._determine_cash_flow_category(code),
                balance=float(row["本期金额"]) if pd.notna(row["本期金额"]) else 0.0,
            )
            statement.accounts[code] = account

        return statement

    def parse_account_mapping(self, directory: str) -> Dict[str, AccountMapping]:
        file_path = self._find_file(directory, self.config.statement_files["account_mapping"])
        mappings: Dict[str, AccountMapping] = {}
        
        if not file_path:
            logger.info("未找到科目映射文件，将使用默认映射")
            return mappings

        df = self._read_excel(file_path)
        required_cols = self.config.required_columns["account_mapping"]
        
        for col in required_cols:
            if col not in df.columns:
                logger.error(f"科目映射表缺少必要列: {col}")
                return mappings

        for _, row in df.iterrows():
            source = str(row["源科目"]).strip()
            target = str(row["目标科目"]).strip()
            if not source or not target:
                continue

            mapping = AccountMapping(
                source_account=source,
                target_account=target,
                mapping_type=str(row.get("映射类型", "direct")).strip(),
            )
            mappings[source] = mapping

        return mappings

    def parse_adjustments(self, directory: str) -> List[AdjustmentEntry]:
        file_path = self._find_file(directory, self.config.statement_files["adjustments"])
        adjustments: List[AdjustmentEntry] = []
        
        if not file_path:
            logger.info("未找到调整分录文件")
            return adjustments

        df = self._read_excel(file_path)
        required_cols = self.config.required_columns["adjustments"]
        
        for col in required_cols:
            if col not in df.columns:
                logger.error(f"调整分录表缺少必要列: {col}")
                return adjustments

        for _, row in df.iterrows():
            entry_id = str(row["分录ID"]).strip()
            if not entry_id:
                continue

            adjustment = AdjustmentEntry(
                id=entry_id,
                date=str(row["日期"]).strip(),
                description=str(row["摘要"]).strip(),
                debit_account=str(row["借方科目"]).strip(),
                credit_account=str(row["贷方科目"]).strip(),
                amount=float(row["金额"]) if pd.notna(row["金额"]) else 0.0,
            )
            adjustments.append(adjustment)

        return adjustments

    def _determine_category(self, code: str) -> str:
        if code.startswith("1"):
            return "asset"
        elif code.startswith("2"):
            return "liability"
        elif code.startswith("4"):
            return "equity"
        elif code.startswith("5"):
            return "cost"
        elif code.startswith("6"):
            return "income"
        else:
            return "other"

    def _determine_cash_flow_category(self, code: str) -> str:
        if code.startswith("1"):
            return "operating"
        elif code.startswith("2"):
            return "investing"
        elif code.startswith("3"):
            return "financing"
        else:
            return "other"

    def parse_all(self, directory: str) -> Dict[str, any]:
        return {
            "balance_sheet": self.parse_balance_sheet(directory),
            "income_statement": self.parse_income_statement(directory),
            "cash_flow": self.parse_cash_flow(directory),
            "account_mapping": self.parse_account_mapping(directory),
            "adjustments": self.parse_adjustments(directory),
        }
