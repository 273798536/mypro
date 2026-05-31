from datetime import datetime
from typing import List, Dict, Optional, Tuple

from models import (
    RepairShopData,
    WorkOrder,
    WorkOrderStatus,
    PartRequirement,
    PartInventory,
    Notification,
)
from checker import find_part_inventory, calculate_locked_quantities


def update_work_order_status(
    shop_data: RepairShopData,
    work_order_id: str,
    new_status: WorkOrderStatus,
    note: Optional[str] = None,
) -> bool:
    for wo in shop_data.work_orders:
        if wo.id == work_order_id:
            wo.status = new_status
            wo.updated_at = datetime.now()
            if note:
                wo.notes.append(f"[{datetime.now().strftime('%Y-%m-%d %H:%M')}] 状态变更为 {new_status.value}: {note}")
            return True
    return False


def lock_parts_for_work_order(
    shop_data: RepairShopData,
    work_order_id: str,
) -> Tuple[bool, List[str]]:
    work_order = None
    for wo in shop_data.work_orders:
        if wo.id == work_order_id:
            work_order = wo
            break

    if not work_order:
        return False, [f"工单 {work_order_id} 不存在"]

    messages: List[str] = []
    all_locked = True

    locked_quantities = calculate_locked_quantities(shop_data, exclude_work_order_id=work_order_id)

    for pr in work_order.parts_required:
        if pr.locked:
            messages.append(f"配件 {pr.part_name} 已锁定，跳过")
            continue

        pi = find_part_inventory(shop_data, pr.part_name)
        if not pi:
            messages.append(f"配件 {pr.part_name} 未在库存中登记，无法锁定")
            all_locked = False
            continue

        locked_by_other = locked_quantities.get(pr.part_name, 0)
        available = pi.stock_quantity - locked_by_other

        if available >= pr.quantity:
            pr.locked = True
            pr.locked_at = datetime.now()
            pr.work_order_id = work_order_id
            messages.append(f"✅ 已锁定 {pr.part_name} x {pr.quantity} {pi.unit}")
        else:
            shortage = pr.quantity - available
            messages.append(f"❌ 无法锁定 {pr.part_name}，库存不足（可用 {available}，需要 {pr.quantity}，缺口 {shortage}）")
            all_locked = False

    if all_locked:
        if work_order.status == WorkOrderStatus.CHECKED:
            work_order.status = WorkOrderStatus.READY
        work_order.updated_at = datetime.now()
        work_order.notes.append(f"[{datetime.now().strftime('%Y-%m-%d %H:%M')}] 所有配件已锁定")

    return all_locked, messages


def unlock_parts_for_work_order(
    shop_data: RepairShopData,
    work_order_id: str,
    note: Optional[str] = None,
) -> Tuple[bool, List[str]]:
    work_order = None
    for wo in shop_data.work_orders:
        if wo.id == work_order_id:
            work_order = wo
            break

    if not work_order:
        return False, [f"工单 {work_order_id} 不存在"]

    messages: List[str] = []
    unlocked_count = 0

    for pr in work_order.parts_required:
        if pr.locked:
            pr.locked = False
            pr.locked_at = None
            pr.work_order_id = None
            messages.append(f"🔓 已解锁 {pr.part_name} x {pr.quantity}")
            unlocked_count += 1

    if unlocked_count > 0:
        work_order.updated_at = datetime.now()
        note_text = note or "取消锁定"
        work_order.notes.append(f"[{datetime.now().strftime('%Y-%m-%d %H:%M')}] {note_text}")
        if work_order.status == WorkOrderStatus.READY:
            work_order.status = WorkOrderStatus.CHECKED

    return unlocked_count > 0, messages


def consume_parts_for_work_order(
    shop_data: RepairShopData,
    work_order_id: str,
) -> Tuple[bool, List[str]]:
    work_order = None
    for wo in shop_data.work_orders:
        if wo.id == work_order_id:
            work_order = wo
            break

    if not work_order:
        return False, [f"工单 {work_order_id} 不存在"]

    messages: List[str] = []
    all_consumed = True

    for pr in work_order.parts_required:
        pi = find_part_inventory(shop_data, pr.part_name)
        if not pi:
            messages.append(f"❌ 配件 {pr.part_name} 未在库存中登记")
            all_consumed = False
            continue

        if pi.stock_quantity >= pr.quantity:
            pi.stock_quantity -= pr.quantity
            pr.locked = False
            pr.locked_at = None
            messages.append(f"📦 已消耗 {pr.part_name} x {pr.quantity} {pi.unit}，剩余库存 {pi.stock_quantity} {pi.unit}")
            if pi.is_low_stock():
                messages.append(f"  ⚠️  警告: {pr.part_name} 库存已低于安全库存（{pi.min_stock} {pi.unit}）")
        else:
            messages.append(f"❌ 无法消耗 {pr.part_name}，库存不足（现有 {pi.stock_quantity}，需要 {pr.quantity}）")
            all_consumed = False

    if all_consumed:
        work_order.status = WorkOrderStatus.IN_PROGRESS
        work_order.updated_at = datetime.now()
        work_order.notes.append(f"[{datetime.now().strftime('%Y-%m-%d %H:%M')}] 开始维修，配件已出库")

    return all_consumed, messages


def complete_work_order(
    shop_data: RepairShopData,
    work_order_id: str,
    note: Optional[str] = None,
) -> bool:
    for wo in shop_data.work_orders:
        if wo.id == work_order_id:
            wo.status = WorkOrderStatus.COMPLETED
            wo.updated_at = datetime.now()
            note_text = note or "维修完成"
            wo.notes.append(f"[{datetime.now().strftime('%Y-%m-%d %H:%M')}] {note_text}")

            for pr in wo.parts_required:
                if pr.locked:
                    pr.locked = False
                    pr.locked_at = None
                    pr.work_order_id = None

            for notif in shop_data.notifications:
                if notif.work_order_id == work_order_id and not notif.resolved:
                    notif.resolved = True
                    notif.resolved_at = datetime.now()
                    notif.resolution_note = "工单完成，问题自动解决"

            return True
    return False


def add_parts_to_work_order(
    shop_data: RepairShopData,
    work_order_id: str,
    part_name: str,
    quantity: int,
) -> bool:
    for wo in shop_data.work_orders:
        if wo.id == work_order_id:
            for pr in wo.parts_required:
                if pr.part_name == part_name:
                    pr.quantity += quantity
                    wo.updated_at = datetime.now()
                    wo.notes.append(f"[{datetime.now().strftime('%Y-%m-%d %H:%M')}] 配件 {part_name} 数量增加 {quantity}")
                    return True

            wo.parts_required.append(PartRequirement(
                part_name=part_name,
                quantity=quantity,
            ))
            wo.updated_at = datetime.now()
            wo.notes.append(f"[{datetime.now().strftime('%Y-%m-%d %H:%M')}] 新增配件需求: {part_name} x {quantity}")
            return True
    return False


def update_inventory(
    shop_data: RepairShopData,
    part_name: str,
    add_quantity: int,
    note: Optional[str] = None,
) -> Tuple[bool, str]:
    pi = find_part_inventory(shop_data, part_name)
    if not pi:
        return False, f"配件 {part_name} 未在库存中登记"

    pi.stock_quantity += add_quantity
    msg = f"库存更新: {part_name} +{add_quantity} {pi.unit}，现有 {pi.stock_quantity} {pi.unit}"
    if note:
        msg += f" - {note}"
    return True, msg


def get_locked_parts_summary(shop_data: RepairShopData) -> List[Dict]:
    locked_summary: Dict[str, Dict] = {}

    for wo in shop_data.work_orders:
        for pr in wo.parts_required:
            if pr.locked:
                if pr.part_name not in locked_summary:
                    pi = find_part_inventory(shop_data, pr.part_name)
                    locked_summary[pr.part_name] = {
                        "part_name": pr.part_name,
                        "total_locked": 0,
                        "work_orders": [],
                        "stock": pi.stock_quantity if pi else 0,
                        "unit": pi.unit if pi else "个",
                    }
                locked_summary[pr.part_name]["total_locked"] += pr.quantity
                locked_summary[pr.part_name]["work_orders"].append({
                    "work_order_id": wo.id,
                    "customer": wo.customer_name,
                    "quantity": pr.quantity,
                    "locked_at": pr.locked_at,
                })

    return list(locked_summary.values())


def get_work_order_by_id(shop_data: RepairShopData, work_order_id: str) -> Optional[WorkOrder]:
    for wo in shop_data.work_orders:
        if wo.id == work_order_id:
            return wo
    return None


def list_work_orders(
    shop_data: RepairShopData,
    status_filter: Optional[WorkOrderStatus] = None,
) -> List[WorkOrder]:
    if status_filter:
        return [wo for wo in shop_data.work_orders if wo.status == status_filter]
    return shop_data.work_orders.copy()
