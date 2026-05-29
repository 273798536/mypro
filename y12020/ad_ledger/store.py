import json
import hashlib
from pathlib import Path
from datetime import date, datetime
from decimal import Decimal

from .models import (
    Account,
    Recharge,
    Consumption,
    Rebate,
    Refund,
    ConflictRecord,
)

LEDGER_DIR = ".ad-ledger"

COMPARE_EXCLUDE = {
    "consumptions": {"matched_from"},
}


def _fingerprint(record: dict) -> str:
    canonical = json.dumps(record, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(canonical.encode()).hexdigest()


def _records_equal(existing: dict, incoming: dict, exclude: set) -> bool:
    for key in set(existing.keys()) | set(incoming.keys()):
        if key in exclude:
            continue
        if existing.get(key) != incoming.get(key):
            return False
    return True


class Store:
    def __init__(self, base_dir: Path):
        self.base_dir = base_dir
        self.ledger_dir = base_dir / LEDGER_DIR
        self._new_conflicts: list[ConflictRecord] = []

    def is_initialized(self) -> bool:
        return self.ledger_dir.is_dir()

    def init(self):
        self.ledger_dir.mkdir(parents=True, exist_ok=True)
        for name in ("accounts", "recharges", "consumptions", "rebates", "refunds", "conflicts"):
            path = self.ledger_dir / f"{name}.json"
            if not path.exists():
                path.write_text("[]", encoding="utf-8")

    def _load(self, name: str) -> list[dict]:
        path = self.ledger_dir / f"{name}.json"
        if not path.exists():
            return []
        raw = path.read_text(encoding="utf-8")
        return json.loads(raw) if raw.strip() else []

    def _save(self, name: str, data: list[dict]):
        path = self.ledger_dir / f"{name}.json"
        path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
        )

    def _merge(
        self,
        store_name: str,
        records: list[dict],
        id_field: str,
    ) -> tuple[int, int, int]:
        existing = self._load(store_name)
        exclude = COMPARE_EXCLUDE.get(store_name, set())
        existing_map: dict[str, dict] = {}
        for r in existing:
            existing_map[r.get(id_field, _fingerprint(r))] = r

        added = 0
        skipped = 0
        conflict_count = 0

        for record in records:
            key = record.get(id_field, _fingerprint(record))
            if key in existing_map:
                if _records_equal(existing_map[key], record, exclude):
                    skipped += 1
                else:
                    conflict_count += 1
                    cr = ConflictRecord(
                        record_type=store_name,
                        record_id=key,
                        existing=existing_map[key],
                        incoming=record,
                        detected_at=datetime.now().isoformat(),
                    )
                    self._new_conflicts.append(cr)
                    conflict_list = self._load("conflicts")
                    conflict_list.append(
                        {
                            "record_type": cr.record_type,
                            "record_id": cr.record_id,
                            "existing": cr.existing,
                            "incoming": cr.incoming,
                            "detected_at": cr.detected_at,
                        }
                    )
                    self._save("conflicts", conflict_list)
            else:
                existing.append(record)
                existing_map[key] = record
                added += 1

        self._save(store_name, existing)
        return added, skipped, conflict_count

    def pop_new_conflicts(self) -> list[ConflictRecord]:
        result = list(self._new_conflicts)
        self._new_conflicts.clear()
        return result

    def import_accounts(self, records: list[dict]) -> tuple[int, int, int]:
        return self._merge("accounts", records, id_field="account_id")

    def import_recharges(self, records: list[dict]) -> tuple[int, int, int]:
        return self._merge("recharges", records, id_field="recharge_id")

    def import_consumptions(self, records: list[dict]) -> tuple[int, int, int]:
        return self._merge("consumptions", records, id_field="consumption_id")

    def import_rebates(self, records: list[dict]) -> tuple[int, int, int]:
        return self._merge("rebates", records, id_field="rebate_id")

    def import_refunds(self, records: list[dict]) -> tuple[int, int, int]:
        return self._merge("refunds", records, id_field="refund_id")

    def load_accounts(self) -> list[Account]:
        return [self._to_account(d) for d in self._load("accounts")]

    def load_recharges(self) -> list[Recharge]:
        return [self._to_recharge(d) for d in self._load("recharges")]

    def load_consumptions(self) -> list[Consumption]:
        return [self._to_consumption(d) for d in self._load("consumptions")]

    def load_rebates(self) -> list[Rebate]:
        return [self._to_rebate(d) for d in self._load("rebates")]

    def load_refunds(self) -> list[Refund]:
        return [self._to_refund(d) for d in self._load("refunds")]

    def load_conflicts(self) -> list[dict]:
        return self._load("conflicts")

    def save_consumptions(self, consumptions: list[Consumption]):
        data = []
        for c in consumptions:
            entry = {
                "consumption_id": c.consumption_id,
                "account_id": c.account_id,
                "amount": str(c.amount),
                "date": c.date.isoformat(),
                "settled_date": c.settled_date.isoformat() if c.settled_date else None,
                "matched_from": c.matched_from,
                "note": c.note,
            }
            data.append(entry)
        self._save("consumptions", data)

    @staticmethod
    def _to_account(d: dict) -> Account:
        return Account(
            account_id=d["account_id"],
            name=d["name"],
            platform=d["platform"],
            currency=d.get("currency", "CNY"),
        )

    @staticmethod
    def _to_recharge(d: dict) -> Recharge:
        return Recharge(
            recharge_id=d["recharge_id"],
            account_id=d["account_id"],
            amount=Decimal(str(d["amount"])),
            date=date.fromisoformat(d["date"]),
            operator=d["operator"],
            note=d.get("note", ""),
        )

    @staticmethod
    def _to_consumption(d: dict) -> Consumption:
        return Consumption(
            consumption_id=d["consumption_id"],
            account_id=d["account_id"],
            amount=Decimal(str(d["amount"])),
            date=date.fromisoformat(d["date"]),
            settled_date=(
                date.fromisoformat(d["settled_date"]) if d.get("settled_date") else None
            ),
            matched_from=d.get("matched_from", []),
            note=d.get("note", ""),
        )

    @staticmethod
    def _to_rebate(d: dict) -> Rebate:
        return Rebate(
            rebate_id=d["rebate_id"],
            account_id=d["account_id"],
            amount=Decimal(str(d["amount"])),
            date=date.fromisoformat(d["date"]),
            rebate_from_recharge_id=d["rebate_from_recharge_id"],
            note=d.get("note", ""),
        )

    @staticmethod
    def _to_refund(d: dict) -> Refund:
        return Refund(
            refund_id=d["refund_id"],
            account_id=d["account_id"],
            amount=Decimal(str(d["amount"])),
            date=date.fromisoformat(d["date"]),
            refund_from_id=d["refund_from_id"],
            refund_from_type=d["refund_from_type"],
            note=d.get("note", ""),
        )
