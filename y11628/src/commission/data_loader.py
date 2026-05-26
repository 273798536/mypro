import pandas as pd
import yaml
from pathlib import Path
from typing import List, Dict, Tuple, Optional
from .models import SalesOrder, RegionRule, TierRate


class DataLoader:
    def __init__(self, data_dir: str = "./data"):
        self.data_dir = Path(data_dir)

    def load_orders(self, file_path: Optional[str] = None) -> List[SalesOrder]:
        orders = []
        if file_path:
            file = Path(file_path)
        else:
            file = self.data_dir / "orders.csv"

        if not file.exists():
            return orders

        df = self._read_file(file)
        for _, row in df.iterrows():
            order = SalesOrder(
                order_id=str(row.get("order_id", "")),
                salesperson=str(row.get("salesperson", "")),
                region=str(row.get("region", "")),
                product_line=str(row.get("product_line", "")),
                amount=float(row.get("amount", 0)),
                order_date=str(row.get("order_date", "")),
                payment_status=str(row.get("payment_status", "")),
                payment_amount=float(row.get("payment_amount", 0)),
                payment_date=str(row.get("payment_date", "")) if pd.notna(row.get("payment_date")) else None,
                rate_version=str(row.get("rate_version", "")) if pd.notna(row.get("rate_version")) else None,
                source_file=file.name,
                raw_data=row.to_dict(),
            )
            orders.append(order)
        return orders

    def load_region_rules(self, file_path: Optional[str] = None) -> Dict[str, RegionRule]:
        rules = {}
        if file_path:
            file = Path(file_path)
        else:
            file = self.data_dir / "region_rules.yaml"

        if not file.exists():
            return rules

        with open(file, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)

        for item in data.get("regions", []):
            rule = RegionRule(
                region=item["region"],
                allowed_product_lines=item.get("allowed_product_lines", []),
                payment_requirement_days=item.get("payment_requirement_days", 30),
                rate_table=item.get("rate_table", ""),
                cross_region_allowed=item.get("cross_region_allowed", False),
                cross_region_penalty=item.get("cross_region_penalty", 0.0),
            )
            rules[rule.region] = rule
        return rules

    def load_tier_rates(self, file_path: Optional[str] = None) -> List[TierRate]:
        rates = []
        if file_path:
            file = Path(file_path)
        else:
            file = self.data_dir / "tier_rates.csv"

        if not file.exists():
            return rates

        df = self._read_file(file)
        for _, row in df.iterrows():
            rate = TierRate(
                rate_version=str(row.get("rate_version", "")),
                product_line=str(row.get("product_line", "")),
                min_amount=float(row.get("min_amount", 0)),
                max_amount=float(row["max_amount"]) if pd.notna(row.get("max_amount")) else None,
                rate=float(row.get("rate", 0)),
                effective_date=str(row.get("effective_date", "")),
                expiry_date=str(row.get("expiry_date", "")) if pd.notna(row.get("expiry_date")) else None,
            )
            rates.append(rate)
        return rates

    def load_product_lines(self, file_path: Optional[str] = None) -> List[str]:
        if file_path:
            file = Path(file_path)
        else:
            file = self.data_dir / "product_lines.txt"

        if not file.exists():
            return []

        with open(file, "r", encoding="utf-8") as f:
            return [line.strip() for line in f if line.strip()]

    def load_corrections(self, file_path: Optional[str] = None) -> pd.DataFrame:
        if file_path:
            file = Path(file_path)
        else:
            file = self.data_dir / "corrections.csv"

        if not file.exists():
            return pd.DataFrame()

        return self._read_file(file)

    def _read_file(self, file_path: Path) -> pd.DataFrame:
        suffix = file_path.suffix.lower()
        if suffix == ".csv":
            return pd.read_csv(file_path)
        elif suffix in [".xlsx", ".xls"]:
            return pd.read_excel(file_path)
        else:
            raise ValueError(f"不支持的文件格式: {suffix}")

    def load_all(
        self,
        orders_file: Optional[str] = None,
        region_file: Optional[str] = None,
        rates_file: Optional[str] = None,
    ) -> Tuple[List[SalesOrder], Dict[str, RegionRule], List[TierRate]]:
        orders = self.load_orders(orders_file)
        region_rules = self.load_region_rules(region_file)
        tier_rates = self.load_tier_rates(rates_file)
        return orders, region_rules, tier_rates
