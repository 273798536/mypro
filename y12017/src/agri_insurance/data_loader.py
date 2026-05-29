import json
import csv
import os
from typing import List, Dict, Any, Optional, Tuple
from datetime import date, datetime
from pathlib import Path

from .models import (
    Farmer, PurchaseOrder, PremiumRecord, SourceRef, OrderStatus, PremiumStatus
)


def parse_date(date_str: Any) -> date:
    if isinstance(date_str, date):
        return date_str
    if isinstance(date_str, datetime):
        return date_str.date()
    date_str = str(date_str).strip()
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y年%m月%d日", "%m/%d/%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"无法解析日期: {date_str}")


def load_json_file(file_path: str) -> Dict[str, Any]:
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_csv_file(file_path: str) -> List[Dict[str, Any]]:
    with open(file_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        return list(reader)


def load_farmers(file_path: str, file_name: Optional[str] = None) -> List[Farmer]:
    file_name = file_name or os.path.basename(file_path)
    data = load_json_file(file_path)
    farmers = []
    for idx, item in enumerate(data.get("farmers", []), start=1):
        farmer = Farmer(
            farmer_id=str(item["farmer_id"]),
            name=str(item["name"]),
            id_card=str(item["id_card"]),
            village=str(item["village"]),
            phone=str(item.get("phone", "")) or None,
            source=SourceRef(
                file_name=file_name,
                sheet_name="farmers",
                row_number=idx,
                raw_value=json.dumps(item, ensure_ascii=False),
            ),
        )
        farmers.append(farmer)
    return farmers


def load_orders(file_path: str, file_name: Optional[str] = None) -> List[PurchaseOrder]:
    file_name = file_name or os.path.basename(file_path)
    data = load_json_file(file_path)
    orders = []
    for idx, item in enumerate(data.get("orders", []), start=1):
        status = OrderStatus(str(item.get("status", "normal")).lower())
        order = PurchaseOrder(
            order_id=str(item["order_id"]),
            farmer_id=str(item["farmer_id"]),
            crop_type=str(item["crop_type"]),
            area_mu=float(item["area_mu"]),
            order_date=parse_date(item["order_date"]),
            status=status,
            expected_yield_kg=float(item["expected_yield_kg"]) if item.get("expected_yield_kg") else None,
            contract_price=float(item["contract_price"]) if item.get("contract_price") else None,
            cancellation_reason=str(item.get("cancellation_reason", "")) or None,
            cancellation_date=parse_date(item["cancellation_date"]) if item.get("cancellation_date") else None,
            amendment_note=str(item.get("amendment_note", "")) or None,
            source=SourceRef(
                file_name=file_name,
                sheet_name="orders",
                row_number=idx,
                raw_value=json.dumps(item, ensure_ascii=False),
            ),
        )
        orders.append(order)
    return orders


def load_premiums(file_path: str, file_name: Optional[str] = None) -> List[PremiumRecord]:
    file_name = file_name or os.path.basename(file_path)
    data = load_json_file(file_path)
    premiums = []
    for idx, item in enumerate(data.get("premiums", []), start=1):
        status = PremiumStatus(str(item.get("status", "unpaid")).lower())
        premium = PremiumRecord(
            premium_id=str(item["premium_id"]),
            order_id=str(item["order_id"]),
            farmer_id=str(item["farmer_id"]),
            total_premium=float(item["total_premium"]),
            farmer_payable=float(item["farmer_payable"]),
            subsidy_amount=float(item["subsidy_amount"]),
            premium_date=parse_date(item["premium_date"]),
            status=status,
            policy_number=str(item.get("policy_number", "")) or None,
            insurance_company=str(item.get("insurance_company", "")) or None,
            subsidy_tracing=str(item.get("subsidy_tracing", "")) or None,
            source=SourceRef(
                file_name=file_name,
                sheet_name="premiums",
                row_number=idx,
                raw_value=json.dumps(item, ensure_ascii=False),
            ),
        )
        premiums.append(premium)
    return premiums


def load_all_data(input_dir: str) -> Tuple[List[Farmer], List[PurchaseOrder], List[PremiumRecord]]:
    input_path = Path(input_dir)
    farmers: List[Farmer] = []
    orders: List[PurchaseOrder] = []
    premiums: List[PremiumRecord] = []

    json_files = sorted(input_path.glob("*.json"))

    for json_file in json_files:
        file_name = json_file.name
        data = load_json_file(str(json_file))

        if "farmers" in data:
            farmers.extend(load_farmers(str(json_file), file_name))

        if "orders" in data:
            orders.extend(load_orders(str(json_file), file_name))

        if "premiums" in data:
            premiums.extend(load_premiums(str(json_file), file_name))

    return farmers, orders, premiums


def build_farmer_index(farmers: List[Farmer]) -> Dict[str, Farmer]:
    return {f.farmer_id: f for f in farmers}


def build_order_index(orders: List[PurchaseOrder]) -> Dict[str, PurchaseOrder]:
    return {o.order_id: o for o in orders}


def build_premium_index(premiums: List[PremiumRecord]) -> Dict[str, PremiumRecord]:
    return {p.premium_id: p for p in premiums}


def build_premiums_by_order(premiums: List[PremiumRecord]) -> Dict[str, List[PremiumRecord]]:
    result: Dict[str, List[PremiumRecord]] = {}
    for p in premiums:
        result.setdefault(p.order_id, []).append(p)
    return result
