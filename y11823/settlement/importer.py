import csv
import json
import os
import warnings
from typing import Any, Optional

from settlement.models import Contract, Show, Sponsorship


def _safe_float(val: Any, field_name: str, row_idx: int) -> Optional[float]:
    if val is None:
        return None
    s = str(val).strip()
    if s == "" or s.lower() in ("n/a", "na", "null", "none", "-", "—", "–"):
        return None
    cleaned = s.replace(",", "").replace("，", "")
    try:
        return float(cleaned)
    except ValueError:
        warnings.warn(
            f"Row {row_idx + 2}, field '{field_name}': cannot parse '{val}' as number, treating as None"
        )
        return None


def _safe_str(val: Any) -> str:
    if val is None:
        return ""
    s = str(val).strip()
    if s.lower() in ("n/a", "na", "null", "none"):
        return ""
    return s


class DataImporter:
    def __init__(self):
        self.contracts: list[Contract] = []
        self.shows: list[Show] = []
        self.sponsorships: list[Sponsorship] = []
        self.warnings: list[str] = []
        self._skipped_rows: list[dict] = []

    def load_csv(self, filepath: str, data_type: str) -> list:
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"File not found: {filepath}")
        with open(filepath, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
        if data_type == "contracts":
            return self._parse_contracts(rows)
        elif data_type == "shows":
            return self._parse_shows(rows)
        elif data_type == "sponsorships":
            return self._parse_sponsorships(rows)
        else:
            raise ValueError(f"Unknown data_type: {data_type}")

    def load_json(self, filepath: str, data_type: str) -> list:
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"File not found: {filepath}")
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict):
            data = [data]
        if data_type == "contracts":
            return self._parse_contracts_json(data)
        elif data_type == "shows":
            return self._parse_shows_json(data)
        elif data_type == "sponsorships":
            return self._parse_sponsorships_json(data)
        else:
            raise ValueError(f"Unknown data_type: {data_type}")

    def _parse_contracts(self, rows: list[dict]) -> list[Contract]:
        result = []
        for i, row in enumerate(rows):
            try:
                contract_id = _safe_str(row.get("contract_id", ""))
                if not contract_id:
                    self.warnings.append(
                        f"contracts row {i + 2}: empty contract_id, skipping"
                    )
                    self._skipped_rows.append({"type": "contract", "row": i + 2, "data": row})
                    continue
                artist_name = _safe_str(row.get("artist_name", ""))
                tour_name = _safe_str(row.get("tour_name", ""))
                guarantee_amount = _safe_float(row.get("guarantee_amount"), "guarantee_amount", i)
                if guarantee_amount is None:
                    guarantee_amount = 0.0
                    self.warnings.append(
                        f"contracts row {i + 2}: guarantee_amount is empty, defaulting to 0.0"
                    )
                ratio = _safe_float(row.get("artist_split_ratio"), "artist_split_ratio", i)
                if ratio is None:
                    ratio = 0.5
                    self.warnings.append(
                        f"contracts row {i + 2}: artist_split_ratio is empty, defaulting to 0.5"
                    )
                elif ratio > 1:
                    ratio = ratio / 100.0
                    self.warnings.append(
                        f"contracts row {i + 2}: artist_split_ratio > 1, treating as percentage, converted to {ratio}"
                    )
                sponsor_deduction_order = _safe_str(
                    row.get("sponsor_deduction_order", "before_split")
                ) or "before_split"
                refund_cross_show = _safe_str(row.get("refund_cross_show", ""))
                refund_cross_show_bool = refund_cross_show.lower() in ("yes", "true", "1", "是")
                notes = _safe_str(row.get("notes", ""))
                c = Contract(
                    contract_id=contract_id,
                    artist_name=artist_name,
                    tour_name=tour_name,
                    guarantee_amount=guarantee_amount,
                    artist_split_ratio=ratio,
                    sponsor_deduction_order=sponsor_deduction_order,
                    refund_cross_show=refund_cross_show_bool,
                    notes=notes,
                )
                result.append(c)
            except Exception as e:
                self.warnings.append(f"contracts row {i + 2}: {e}, skipping")
                self._skipped_rows.append({"type": "contract", "row": i + 2, "data": row})
        self.contracts = result
        return result

    def _parse_shows(self, rows: list[dict]) -> list[Show]:
        result = []
        for i, row in enumerate(rows):
            try:
                show_id = _safe_str(row.get("show_id", ""))
                if not show_id:
                    self.warnings.append(f"shows row {i + 2}: empty show_id, skipping")
                    self._skipped_rows.append({"type": "show", "row": i + 2, "data": row})
                    continue
                contract_id = _safe_str(row.get("contract_id", ""))
                city = _safe_str(row.get("city", ""))
                show_date = _safe_str(row.get("show_date", ""))
                gross = _safe_float(row.get("gross_box_office"), "gross_box_office", i)
                refunds = _safe_float(row.get("refunds"), "refunds", i)
                notes = _safe_str(row.get("notes", ""))
                s = Show(
                    show_id=show_id,
                    contract_id=contract_id,
                    city=city,
                    show_date=show_date,
                    gross_box_office=gross,
                    refunds=refunds,
                    notes=notes,
                )
                result.append(s)
            except Exception as e:
                self.warnings.append(f"shows row {i + 2}: {e}, skipping")
                self._skipped_rows.append({"type": "show", "row": i + 2, "data": row})
        self.shows = result
        return result

    def _parse_sponsorships(self, rows: list[dict]) -> list[Sponsorship]:
        result = []
        for i, row in enumerate(rows):
            try:
                sponsorship_id = _safe_str(row.get("sponsorship_id", ""))
                if not sponsorship_id:
                    self.warnings.append(
                        f"sponsorships row {i + 2}: empty sponsorship_id, skipping"
                    )
                    self._skipped_rows.append(
                        {"type": "sponsorship", "row": i + 2, "data": row}
                    )
                    continue
                contract_id = _safe_str(row.get("contract_id", ""))
                sponsor_name = _safe_str(row.get("sponsor_name", ""))
                amount = _safe_float(row.get("amount"), "amount", i)
                show_id = _safe_str(row.get("show_id", "")) or None
                deduction_order_val = _safe_float(
                    row.get("deduction_order"), "deduction_order", i
                )
                deduction_order = int(deduction_order_val) if deduction_order_val is not None else 0
                notes = _safe_str(row.get("notes", ""))
                sp = Sponsorship(
                    sponsorship_id=sponsorship_id,
                    contract_id=contract_id,
                    sponsor_name=sponsor_name,
                    amount=amount,
                    show_id=show_id,
                    deduction_order=deduction_order,
                    notes=notes,
                )
                result.append(sp)
            except Exception as e:
                self.warnings.append(f"sponsorships row {i + 2}: {e}, skipping")
                self._skipped_rows.append(
                    {"type": "sponsorship", "row": i + 2, "data": row}
                )
        self.sponsorships = result
        return result

    def _parse_contracts_json(self, data: list[dict]) -> list[Contract]:
        return self._parse_contracts(data)

    def _parse_shows_json(self, data: list[dict]) -> list[Show]:
        return self._parse_shows(data)

    def _parse_sponsorships_json(self, data: list[dict]) -> list[Sponsorship]:
        return self._parse_sponsorships(data)

    def load_samples(self, sample_dir: str) -> dict:
        contracts_path = os.path.join(sample_dir, "contracts.csv")
        shows_path = os.path.join(sample_dir, "box_office.csv")
        sponsorships_path = os.path.join(sample_dir, "sponsorships.csv")
        contracts = []
        shows = []
        sponsorships = []
        if os.path.exists(contracts_path):
            contracts = self.load_csv(contracts_path, "contracts")
        if os.path.exists(shows_path):
            shows = self.load_csv(shows_path, "shows")
        if os.path.exists(sponsorships_path):
            sponsorships = self.load_csv(sponsorships_path, "sponsorships")
        return {
            "contracts": contracts,
            "shows": shows,
            "sponsorships": sponsorships,
            "warnings": self.warnings,
            "skipped_rows": self._skipped_rows,
        }
