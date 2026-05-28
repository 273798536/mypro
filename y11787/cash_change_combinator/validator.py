from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from models import (
    ChangeRequest,
    ChangeWarning,
    Denomination,
    InventoryEntry,
    SourceLocation,
    WarningKind,
)


class ValidationError(Exception):
    def __init__(self, message: str, source: SourceLocation | None = None):
        self.source = source
        full = f"{source}: {message}" if source else message
        super().__init__(full)


def _parse_source(raw: dict[str, Any] | None, fallback_file: str) -> SourceLocation | None:
    if raw is None:
        return None
    return SourceLocation(
        file=raw.get("file", fallback_file),
        line=raw.get("line", 1),
        column=raw.get("column"),
    )


def _load_json(path: Path) -> list[dict[str, Any]]:
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    data = json.loads(text)
    if not isinstance(data, list):
        data = [data]
    for i, item in enumerate(data):
        if "_source" not in item:
            item["_source"] = {"file": str(path), "line": i + 1}
        else:
            src = item["_source"]
            if "file" not in src:
                src["file"] = str(path)
            if "line" not in src:
                src["line"] = i + 1
    return data


def load_denominations(path: Path) -> list[Denomination]:
    records = _load_json(path)
    result: list[Denomination] = []
    for rec in records:
        src = _parse_source(rec.get("_source"), str(path))
        result.append(
            Denomination(
                value=rec["value"],
                label=rec.get("label", str(rec["value"])),
                source=src,
            )
        )
    return result


def load_inventory(path: Path) -> list[InventoryEntry]:
    records = _load_json(path)
    result: list[InventoryEntry] = []
    for rec in records:
        src = _parse_source(rec.get("_source"), str(path))
        result.append(
            InventoryEntry(
                denomination_value=rec["denomination"],
                count=rec["count"],
                source=src,
            )
        )
    return result


def load_change_requests(path: Path) -> list[ChangeRequest]:
    records = _load_json(path)
    result: list[ChangeRequest] = []
    for rec in records:
        src = _parse_source(rec.get("_source"), str(path))
        result.append(
            ChangeRequest(
                amount=rec["amount"],
                cashier=rec.get("cashier", ""),
                shift=rec.get("shift", ""),
                source=src,
            )
        )
    return result


def validate_denominations(denoms: list[Denomination]) -> list[ChangeWarning]:
    warnings: list[ChangeWarning] = []
    seen: dict[int, Denomination] = {}
    for d in denoms:
        if d.value in seen:
            warnings.append(
                ChangeWarning(
                    kind=WarningKind.DUPLICATE_DENOMINATION,
                    message=(
                        f"面额 {d.value} 重复: 先出现于 {seen[d.value].source}，"
                        f"后出现于 {d.source}"
                    ),
                    source=d.source,
                )
            )
        else:
            seen[d.value] = d
    return warnings


def validate_inventory(
    inventory: list[InventoryEntry],
    denoms: list[Denomination],
    amount: int,
) -> list[ChangeWarning]:
    warnings: list[ChangeWarning] = []
    denom_values = {d.value for d in denoms}
    total_available = 0
    for entry in inventory:
        if entry.denomination_value not in denom_values:
            warnings.append(
                ChangeWarning(
                    kind=WarningKind.INSUFFICIENT_INVENTORY,
                    message=(
                        f"库存面额 {entry.denomination_value} 不在合法面额列表中 "
                        f"({entry.source})"
                    ),
                    source=entry.source,
                )
            )
        total_available += entry.denomination_value * entry.count

    if total_available < amount:
        warnings.append(
            ChangeWarning(
                kind=WarningKind.INSUFFICIENT_INVENTORY,
                message=(
                    f"库存总价值 {total_available} < 应找金额 {amount}，"
                    f"无法完成找零"
                ),
            )
        )
    return warnings


def deduplicate_denominations(
    denoms: list[Denomination], warnings: list[ChangeWarning]
) -> list[Denomination]:
    seen: dict[int, Denomination] = {}
    for d in denoms:
        if d.value not in seen:
            seen[d.value] = d
    return list(seen.values())


def build_inventory_map(
    inventory: list[InventoryEntry], denom_values: set[int]
) -> dict[int, int]:
    inv: dict[int, int] = {}
    for entry in inventory:
        if entry.denomination_value in denom_values:
            inv[entry.denomination_value] = entry.count
    for v in denom_values:
        if v not in inv:
            inv[v] = 0
    return inv
