import csv
import json
import os
from typing import List, Dict, Any, Tuple
from datetime import date, datetime

from models import (
    RepairShopData,
    WorkOrder,
    InstrumentType,
    PartInventory,
    Technician,
)


def detect_file_format(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".json":
        return "json"
    elif ext == ".csv":
        return "csv"
    else:
        raise ValueError(f"不支持的文件格式: {ext}，仅支持 .json 和 .csv")


def load_json(file_path: str) -> Dict[str, Any]:
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_csv(file_path: str) -> List[Dict[str, Any]]:
    with open(file_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader)


def parse_parts_required(parts_str: str) -> List[Dict[str, Any]]:
    if not parts_str:
        return []
    parts = []
    for part_entry in parts_str.split(";"):
        if ":" in part_entry:
            name, qty = part_entry.split(":", 1)
            try:
                parts.append({"part_name": name.strip(), "quantity": int(qty.strip())})
            except ValueError:
                continue
    return parts


def import_work_orders_json(data_list: List[Dict]) -> List[WorkOrder]:
    return [WorkOrder.from_dict(wo) for wo in data_list]


def import_work_orders_csv(data_list: List[Dict]) -> List[WorkOrder]:
    work_orders = []
    for row in data_list:
        wo_dict = {
            "id": row.get("id", ""),
            "customer_name": row.get("customer_name", ""),
            "instrument_type": row.get("instrument_type", ""),
            "instrument_model": row.get("instrument_model", ""),
            "issue_description": row.get("issue_description", ""),
            "status": row.get("status", "待处理"),
            "assigned_technician": row.get("assigned_technician") or None,
            "scheduled_date": row.get("scheduled_date") or None,
            "parts_required": parse_parts_required(row.get("parts_required", "")),
            "notes": [n for n in (row.get("notes", "") or "").split("|") if n],
        }
        work_orders.append(WorkOrder.from_dict(wo_dict))
    return work_orders


def import_instrument_types_json(data_list: List[Dict]) -> List[InstrumentType]:
    return [InstrumentType.from_dict(it) for it in data_list]


def import_instrument_types_csv(data_list: List[Dict]) -> List[InstrumentType]:
    instrument_types = []
    for row in data_list:
        it_dict = {
            "id": row.get("id", ""),
            "name": row.get("name", ""),
            "category": row.get("category", "未分类"),
            "common_parts": [p for p in (row.get("common_parts", "") or "").split("|") if p],
            "difficulty_level": int(row.get("difficulty_level", "1")),
        }
        instrument_types.append(InstrumentType.from_dict(it_dict))
    return instrument_types


def import_part_inventories_json(data_list: List[Dict]) -> List[PartInventory]:
    return [PartInventory.from_dict(pi) for pi in data_list]


def import_part_inventories_csv(data_list: List[Dict]) -> List[PartInventory]:
    part_inventories = []
    for row in data_list:
        pi_dict = {
            "id": row.get("id", ""),
            "name": row.get("name", ""),
            "stock_quantity": int(row.get("stock_quantity", "0")),
            "min_stock": int(row.get("min_stock", "0")),
            "unit": row.get("unit", "个"),
            "supplier": row.get("supplier", ""),
        }
        part_inventories.append(PartInventory.from_dict(pi_dict))
    return part_inventories


def import_technicians_json(data_list: List[Dict]) -> List[Technician]:
    return [Technician.from_dict(t) for t in data_list]


def import_technicians_csv(data_list: List[Dict]) -> List[Technician]:
    technicians = []
    for row in data_list:
        leave_dates = []
        for d in (row.get("leave_dates", "") or "").split("|"):
            if d:
                try:
                    leave_dates.append(date.fromisoformat(d.strip()))
                except ValueError:
                    continue
        t_dict = {
            "id": row.get("id", ""),
            "name": row.get("name", ""),
            "skills": [s for s in (row.get("skills", "") or "").split("|") if s],
            "leave_dates": leave_dates,
        }
        technicians.append(Technician.from_dict(t_dict))
    return technicians


def import_data(file_path: str, data_type: str) -> Tuple[List, int]:
    fmt = detect_file_format(file_path)

    if fmt == "json":
        data = load_json(file_path)
        if isinstance(data, dict) and data_type in data:
            data_list = data[data_type]
        elif isinstance(data, list):
            data_list = data
        else:
            raise ValueError(f"JSON格式不正确，未找到 {data_type} 数据")
    else:
        data_list = load_csv(file_path)

    count = len(data_list)

    importers = {
        "json": {
            "work_orders": import_work_orders_json,
            "instrument_types": import_instrument_types_json,
            "part_inventories": import_part_inventories_json,
            "technicians": import_technicians_json,
        },
        "csv": {
            "work_orders": import_work_orders_csv,
            "instrument_types": import_instrument_types_csv,
            "part_inventories": import_part_inventories_csv,
            "technicians": import_technicians_csv,
        },
    }

    if data_type not in importers[fmt]:
        raise ValueError(f"不支持的数据类型: {data_type}")

    imported = importers[fmt][data_type](data_list)
    return imported, count


def import_all_from_json(file_path: str) -> RepairShopData:
    data = load_json(file_path)
    shop_data = RepairShopData()

    if "work_orders" in data:
        shop_data.work_orders = import_work_orders_json(data["work_orders"])
    if "instrument_types" in data:
        shop_data.instrument_types = import_instrument_types_json(data["instrument_types"])
    if "part_inventories" in data:
        shop_data.part_inventories = import_part_inventories_json(data["part_inventories"])
    if "technicians" in data:
        shop_data.technicians = import_technicians_json(data["technicians"])
    if "notifications" in data:
        from models import Notification
        shop_data.notifications = [Notification.from_dict(n) for n in data["notifications"]]

    return shop_data


def import_single_file(shop_data: RepairShopData, file_path: str, data_type: str) -> int:
    items, count = import_data(file_path, data_type)

    existing_map = {}
    if data_type == "work_orders":
        existing_map = {wo.id: wo for wo in shop_data.work_orders}
    elif data_type == "instrument_types":
        existing_map = {it.id: it for it in shop_data.instrument_types}
    elif data_type == "part_inventories":
        existing_map = {pi.id: pi for pi in shop_data.part_inventories}
    elif data_type == "technicians":
        existing_map = {t.id: t for t in shop_data.technicians}

    for item in items:
        if item.id in existing_map:
            idx = list(existing_map.keys()).index(item.id)
            if data_type == "work_orders":
                shop_data.work_orders[idx] = item
            elif data_type == "instrument_types":
                shop_data.instrument_types[idx] = item
            elif data_type == "part_inventories":
                shop_data.part_inventories[idx] = item
            elif data_type == "technicians":
                shop_data.technicians[idx] = item
        else:
            if data_type == "work_orders":
                shop_data.work_orders.append(item)
            elif data_type == "instrument_types":
                shop_data.instrument_types.append(item)
            elif data_type == "part_inventories":
                shop_data.part_inventories.append(item)
            elif data_type == "technicians":
                shop_data.technicians.append(item)

    return count
