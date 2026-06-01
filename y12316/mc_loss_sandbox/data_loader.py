import json
import csv
from pathlib import Path
from datetime import datetime
from typing import List, Tuple

from .models import (
    PolicyRecord,
    LossDistribution,
    ExpenseRate,
    DeductibleRule,
    DataSource,
)


class DataLoader:
    def __init__(self, input_dir: str):
        self.input_dir = Path(input_dir)

    def load_all(
        self,
    ) -> Tuple[
        List[PolicyRecord],
        List[LossDistribution],
        List[ExpenseRate],
        List[DeductibleRule],
    ]:
        policies = self._load_policies()
        loss_distributions = self._load_loss_distributions()
        expense_rates = self._load_expense_rates()
        deductible_rules = self._load_deductible_rules()

        return policies, loss_distributions, expense_rates, deductible_rules

    def _load_policies(self) -> List[PolicyRecord]:
        policies = []
        policy_files = list(self.input_dir.glob("*polic*.csv")) + list(
            self.input_dir.glob("*polic*.json")
        )

        for file_path in policy_files:
            if file_path.suffix == ".csv":
                policies.extend(self._load_policies_csv(file_path))
            elif file_path.suffix == ".json":
                policies.extend(self._load_policies_json(file_path))

        return policies

    def _load_policies_csv(self, file_path: Path) -> List[PolicyRecord]:
        policies = []
        with open(file_path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                policies.append(
                    PolicyRecord(
                        policy_id=row.get("policy_id", row.get("id", "")),
                        insured_amount=float(row.get("insured_amount", 0)),
                        policy_type=row.get("policy_type", "default"),
                        effective_date=datetime.fromisoformat(
                            row.get("effective_date", datetime.now().isoformat())
                        ),
                        expiry_date=datetime.fromisoformat(
                            row.get("expiry_date", datetime.now().isoformat())
                        ),
                        region=row.get("region"),
                        industry=row.get("industry"),
                        deductible=float(row["deductible"])
                        if row.get("deductible")
                        else None,
                        limit=float(row["limit"]) if row.get("limit") else None,
                        source_file=file_path.name,
                        source=DataSource.POLICY_MAIN,
                    )
                )
        return policies

    def _load_policies_json(self, file_path: Path) -> List[PolicyRecord]:
        policies = []
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            for item in data:
                policies.append(
                    PolicyRecord(
                        policy_id=item.get("policy_id", item.get("id", "")),
                        insured_amount=float(item.get("insured_amount", 0)),
                        policy_type=item.get("policy_type", "default"),
                        effective_date=datetime.fromisoformat(
                            item.get("effective_date", datetime.now().isoformat())
                        ),
                        expiry_date=datetime.fromisoformat(
                            item.get("expiry_date", datetime.now().isoformat())
                        ),
                        region=item.get("region"),
                        industry=item.get("industry"),
                        deductible=float(item["deductible"])
                        if item.get("deductible")
                        else None,
                        limit=float(item["limit"]) if item.get("limit") else None,
                        source_file=file_path.name,
                        source=DataSource.POLICY_MAIN,
                    )
                )
        return policies

    def _load_loss_distributions(self) -> List[LossDistribution]:
        distributions = []
        files = set()
        for pattern in ["*loss*.json", "*dist*.json"]:
            files.update(self.input_dir.glob(pattern))
        files = sorted(files)

        for file_path in files:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    for item in data:
                        distributions.append(self._parse_loss_distribution(item, file_path.name))
                else:
                    distributions.append(self._parse_loss_distribution(data, file_path.name))

        return distributions

    def _parse_loss_distribution(
        self, item: dict, source_file: str
    ) -> LossDistribution:
        return LossDistribution(
            policy_type=item.get("policy_type", "default"),
            distribution_type=item.get("distribution_type", "lognormal"),
            params=item.get("params", {}),
            sample_size=int(item.get("sample_size", 1000)),
            confidence_level=float(item.get("confidence_level", 0.95)),
            source_file=source_file,
            source=DataSource.LOSS_DISTRIBUTION,
        )

    def _load_expense_rates(self) -> List[ExpenseRate]:
        rates = []
        files = list(self.input_dir.glob("*expense*.json")) + list(
            self.input_dir.glob("*expense*.csv")
        )

        for file_path in files:
            if file_path.suffix == ".json":
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        for item in data:
                            rates.append(self._parse_expense_rate(item, file_path.name))
                    else:
                        rates.append(self._parse_expense_rate(data, file_path.name))

        return rates

    def _parse_expense_rate(self, item: dict, source_file: str) -> ExpenseRate:
        return ExpenseRate(
            policy_type=item.get("policy_type", "default"),
            expense_rate=float(item.get("expense_rate", 0)),
            acquisition_cost=float(item.get("acquisition_cost", 0)),
            administrative_cost=float(item.get("administrative_cost", 0)),
            source_file=source_file,
            source=DataSource.EXPENSE_RATE,
        )

    def _load_deductible_rules(self) -> List[DeductibleRule]:
        rules = []
        files = list(self.input_dir.glob("*deduct*.json")) + list(
            self.input_dir.glob("*deduct*.csv")
        )

        for file_path in files:
            if file_path.suffix == ".json":
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        for item in data:
                            rules.append(self._parse_deductible_rule(item, file_path.name))
                    else:
                        rules.append(self._parse_deductible_rule(data, file_path.name))

        return rules

    def _parse_deductible_rule(
        self, item: dict, source_file: str
    ) -> DeductibleRule:
        effective_date = datetime.fromisoformat(
            item.get("effective_date", datetime.now().isoformat())
        )
        received_date = datetime.fromisoformat(
            item.get("received_date", datetime.now().isoformat())
        )
        is_late = received_date > effective_date

        return DeductibleRule(
            policy_type=item.get("policy_type", "default"),
            deductible_amount=float(item.get("deductible_amount", 0)),
            deductible_ratio=float(item["deductible_ratio"])
            if item.get("deductible_ratio")
            else None,
            effective_date=effective_date,
            received_date=received_date,
            is_late_arrival=is_late,
            source_file=source_file,
            source=DataSource.DEDUCTIBLE_RULE,
        )
