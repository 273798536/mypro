from __future__ import annotations

import csv
import json
import os
from typing import Dict, List, Tuple

from .models import Transaction, WorkOrder


TRANSACTION_FIELD_MAP = {
    "transaction_id": ["transaction_id", "txn_id", "流水号", "交易号"],
    "work_order_id": ["work_order_id", "order_id", "工单号", "业务工单号"],
    "amount": ["amount", "金额", "交易金额", "amt"],
    "transaction_date": ["transaction_date", "txn_date", "交易日期", "日期"],
    "account_from": ["account_from", "from_account", "转出账户", "来源账户"],
    "account_to": ["account_to", "to_account", "转入账户", "目标账户"],
    "status": ["status", "状态", "交易状态"],
    "migration_batch": ["migration_batch", "batch_id", "迁移批次", "批次号"],
}

WORKORDER_FIELD_MAP = {
    "work_order_id": ["work_order_id", "order_id", "工单号", "业务工单号"],
    "order_type": ["order_type", "type", "工单类型", "类型"],
    "expected_amount": ["expected_amount", "amount", "预期金额", "金额"],
    "created_date": ["created_date", "create_date", "创建日期", "工单日期"],
    "status": ["status", "状态", "工单状态"],
}


def _resolve_field(raw_key: str, field_map: Dict[str, List[str]]) -> str | None:
    key_lower = raw_key.strip().lower()
    for canonical, aliases in field_map.items():
        if key_lower in [a.lower() for a in aliases]:
            return canonical
    return None


def _normalize_row(raw: dict, field_map: Dict[str, List[str]]) -> dict:
    result = {}
    for k, v in raw.items():
        canonical = _resolve_field(k, field_map)
        if canonical:
            result[canonical] = v
    return result


TXN_FNAME_HINTS = ("transaction", "txn", "流水", "交易")
WO_FNAME_HINTS = ("work_order", "workorder", "order", "工单", "业务工单")


def _filename_matches(fname: str, hints: tuple[str, ...]) -> bool:
    lower = fname.lower()
    return any(h.lower() in lower for h in hints)


def load_transactions(input_dir: str) -> List[Transaction]:
    tx_dir = os.path.join(input_dir, "transactions")
    use_subdir = os.path.isdir(tx_dir)
    if not use_subdir:
        tx_dir = input_dir
    transactions: List[Transaction] = []
    for fname in sorted(os.listdir(tx_dir)):
        fpath = os.path.join(tx_dir, fname)
        if not os.path.isfile(fpath):
            continue
        if not use_subdir and not _filename_matches(fname, TXN_FNAME_HINTS):
            continue
        if fname.endswith(".csv"):
            transactions.extend(_load_transactions_csv(fpath))
        elif fname.endswith(".json"):
            transactions.extend(_load_transactions_json(fpath))
    return transactions


def _load_transactions_csv(fpath: str) -> List[Transaction]:
    results: List[Transaction] = []
    with open(fpath, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            norm = _normalize_row(dict(row), TRANSACTION_FIELD_MAP)
            results.append(
                Transaction(
                    transaction_id=norm.get("transaction_id", ""),
                    work_order_id=norm.get("work_order_id", ""),
                    amount=_safe_float(norm.get("amount", 0)),
                    transaction_date=norm.get("transaction_date", ""),
                    account_from=norm.get("account_from", ""),
                    account_to=norm.get("account_to", ""),
                    status=norm.get("status", ""),
                    migration_batch=norm.get("migration_batch", ""),
                    raw_line=dict(row),
                )
            )
    return results


def _load_transactions_json(fpath: str) -> List[Transaction]:
    results: List[Transaction] = []
    with open(fpath, encoding="utf-8") as f:
        data = json.load(f)
    items = data if isinstance(data, list) else data.get("transactions", data.get("records", []))
    for item in items:
        norm = _normalize_row(item, TRANSACTION_FIELD_MAP)
        results.append(
            Transaction(
                transaction_id=norm.get("transaction_id", ""),
                work_order_id=norm.get("work_order_id", ""),
                amount=_safe_float(norm.get("amount", 0)),
                transaction_date=norm.get("transaction_date", ""),
                account_from=norm.get("account_from", ""),
                account_to=norm.get("account_to", ""),
                status=norm.get("status", ""),
                migration_batch=norm.get("migration_batch", ""),
                raw_line=item,
            )
        )
    return results


def load_work_orders(input_dir: str) -> Dict[str, WorkOrder]:
    wo_dir = os.path.join(input_dir, "work_orders")
    use_subdir = os.path.isdir(wo_dir)
    if not use_subdir:
        wo_dir = input_dir
    orders: Dict[str, WorkOrder] = {}
    for fname in sorted(os.listdir(wo_dir)):
        fpath = os.path.join(wo_dir, fname)
        if not os.path.isfile(fpath):
            continue
        if not use_subdir and not _filename_matches(fname, WO_FNAME_HINTS):
            continue
        if fname.endswith(".csv"):
            for wo in _load_workorders_csv(fpath):
                orders[wo.work_order_id] = wo
        elif fname.endswith(".json"):
            for wo in _load_workorders_json(fpath):
                orders[wo.work_order_id] = wo
    return orders


def _load_workorders_csv(fpath: str) -> List[WorkOrder]:
    results: List[WorkOrder] = []
    with open(fpath, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            norm = _normalize_row(dict(row), WORKORDER_FIELD_MAP)
            results.append(
                WorkOrder(
                    work_order_id=norm.get("work_order_id", ""),
                    order_type=norm.get("order_type", ""),
                    expected_amount=_safe_float(norm.get("expected_amount", 0)),
                    created_date=norm.get("created_date", ""),
                    status=norm.get("status", ""),
                    raw_line=dict(row),
                )
            )
    return results


def _load_workorders_json(fpath: str) -> List[WorkOrder]:
    results: List[WorkOrder] = []
    with open(fpath, encoding="utf-8") as f:
        data = json.load(f)
    items = data if isinstance(data, list) else data.get("work_orders", data.get("orders", []))
    for item in items:
        norm = _normalize_row(item, WORKORDER_FIELD_MAP)
        results.append(
            WorkOrder(
                work_order_id=norm.get("work_order_id", ""),
                order_type=norm.get("order_type", ""),
                expected_amount=_safe_float(norm.get("expected_amount", 0)),
                created_date=norm.get("created_date", ""),
                status=norm.get("status", ""),
                raw_line=item,
            )
        )
    return results


def detect_new_fields(transactions: List[Transaction], work_orders: Dict[str, WorkOrder]) -> List[str]:
    known_fields = set(TRANSACTION_FIELD_MAP.keys()) | set(WORKORDER_FIELD_MAP.keys())
    new_fields: List[str] = []
    seen: set = set()
    for txn in transactions:
        if txn.raw_line:
            for k in txn.raw_line:
                resolved = _resolve_field(k, TRANSACTION_FIELD_MAP)
                if resolved is None and k not in seen:
                    seen.add(k)
                    new_fields.append(k)
    for wo in work_orders.values():
        if wo.raw_line:
            for k in wo.raw_line:
                resolved = _resolve_field(k, WORKORDER_FIELD_MAP)
                if resolved is None and k not in seen:
                    seen.add(k)
                    new_fields.append(k)
    return new_fields


def _safe_float(val) -> float:
    try:
        return float(val)
    except (ValueError, TypeError):
        return 0.0
