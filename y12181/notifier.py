from datetime import datetime
from typing import List, Dict, Optional
from enum import Enum

from models import RepairShopData, Notification, WorkOrder
from fixer import Colors, color, print_separator


class NotificationType(Enum):
    PART_SHORTAGE = "part_shortage"
    TECHNICIAN_CONFLICT = "technician_conflict"
    INSTRUMENT_MISSING = "instrument_missing"
    UNKNOWN = "unknown"


NOTIFICATION_TYPE_LABELS = {
    "part_shortage": ("配件缺货", Colors.RED),
    "technician_conflict": ("人员冲突", Colors.MAGENTA),
    "instrument_missing": ("类型缺失", Colors.YELLOW),
    "unknown": ("其他问题", Colors.BLUE),
}


def add_notification(
    shop_data: RepairShopData,
    work_order_id: str,
    message: str,
    notif_type: str = "unknown",
) -> Notification:
    notification = Notification(
        id="",
        work_order_id=work_order_id,
        message=message,
        type=notif_type,
    )
    shop_data.notifications.append(notification)
    return notification


def resolve_notification(
    shop_data: RepairShopData,
    notification_id: str,
    resolution_note: Optional[str] = None,
) -> bool:
    for notif in shop_data.notifications:
        if notif.id == notification_id:
            notif.resolved = True
            notif.resolved_at = datetime.now()
            notif.resolution_note = resolution_note
            return True
    return False


def resolve_notifications_for_work_order(
    shop_data: RepairShopData,
    work_order_id: str,
    resolution_note: Optional[str] = None,
) -> int:
    count = 0
    for notif in shop_data.notifications:
        if notif.work_order_id == work_order_id and not notif.resolved:
            notif.resolved = True
            notif.resolved_at = datetime.now()
            notif.resolution_note = resolution_note
            count += 1
    return count


def get_notifications(
    shop_data: RepairShopData,
    work_order_id: Optional[str] = None,
    notif_type: Optional[str] = None,
    resolved: Optional[bool] = None,
) -> List[Notification]:
    results = shop_data.notifications

    if work_order_id:
        results = [n for n in results if n.work_order_id == work_order_id]

    if notif_type:
        results = [n for n in results if n.type == notif_type]

    if resolved is not None:
        results = [n for n in results if n.resolved == resolved]

    results.sort(key=lambda n: n.created_at, reverse=True)
    return results


def get_notification_statistics(shop_data: RepairShopData) -> Dict[str, int]:
    stats = {
        "total": len(shop_data.notifications),
        "resolved": 0,
        "unresolved": 0,
        "by_type": {},
    }

    for notif in shop_data.notifications:
        if notif.resolved:
            stats["resolved"] += 1
        else:
            stats["unresolved"] += 1

        t = notif.type
        if t not in stats["by_type"]:
            stats["by_type"][t] = {"total": 0, "resolved": 0, "unresolved": 0}
        stats["by_type"][t]["total"] += 1
        if notif.resolved:
            stats["by_type"][t]["resolved"] += 1
        else:
            stats["by_type"][t]["unresolved"] += 1

    return stats


def print_notification(notif: Notification, index: int = 1) -> None:
    label, color_code = NOTIFICATION_TYPE_LABELS.get(notif.type, ("未知", Colors.BLUE))
    status_color = Colors.GREEN if notif.resolved else Colors.RED
    status = "已解决" if notif.resolved else "未解决"

    work_order_info = ""
    for wo in shop_data_ref:
        if wo.id == notif.work_order_id:
            work_order_info = f" - {wo.customer_name} ({wo.instrument_type})"
            break

    print(f"  {index}. [{color(label, color_code + Colors.BOLD)}] "
          f"[{color(status, status_color)}] "
          f"工单 {notif.work_order_id}{work_order_info}")
    print(f"     时间: {notif.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"     内容: {notif.message}")

    if notif.resolved and notif.resolved_at:
        print(f"     解决时间: {notif.resolved_at.strftime('%Y-%m-%d %H:%M:%S')}")
        if notif.resolution_note:
            print(f"     解决说明: {notif.resolution_note}")

    print()


shop_data_ref = []


def print_notification_history(
    shop_data: RepairShopData,
    work_order_id: Optional[str] = None,
    notif_type: Optional[str] = None,
    resolved: Optional[bool] = None,
    limit: int = 20,
) -> None:
    global shop_data_ref
    shop_data_ref = shop_data.work_orders

    notifications = get_notifications(shop_data, work_order_id, notif_type, resolved)
    stats = get_notification_statistics(shop_data)

    print()
    print_separator("=")
    print(color("📜 通知历史记录", Colors.BLUE + Colors.BOLD + Colors.UNDERLINE))
    print_separator("-")
    print(f"总计: {stats['total']} 条 | "
          f"{color('已解决', Colors.GREEN)}: {stats['resolved']} | "
          f"{color('未解决', Colors.RED)}: {stats['unresolved']}")

    if stats['by_type']:
        print("按类型统计:")
        for t, counts in stats['by_type'].items():
            label, _ = NOTIFICATION_TYPE_LABELS.get(t, ("未知", Colors.BLUE))
            print(f"  {label}: {counts['total']} (未解决: {counts['unresolved']})")

    print_separator()

    if not notifications:
        print(color("  暂无通知记录", Colors.YELLOW))
        print()
        return

    display_count = min(limit, len(notifications))
    print(f"显示最新 {display_count} 条记录:\n")

    for i, notif in enumerate(notifications[:display_count], 1):
        print_notification(notif, i)

    if len(notifications) > limit:
        print(color(f"  ... 还有 {len(notifications) - limit} 条记录", Colors.CYAN))
        print()


def print_unresolved_alerts(shop_data: RepairShopData) -> None:
    unresolved = get_notifications(shop_data, resolved=False)

    if not unresolved:
        return

    print()
    print_separator("!")
    print(color("⚠️  待处理警报", Colors.YELLOW + Colors.BOLD + Colors.UNDERLINE))
    print_separator("!")

    by_work_order: Dict[str, List[Notification]] = {}
    for notif in unresolved:
        if notif.work_order_id not in by_work_order:
            by_work_order[notif.work_order_id] = []
        by_work_order[notif.work_order_id].append(notif)

    for wo_id, notifs in by_work_order.items():
        wo_info = ""
        for wo in shop_data.work_orders:
            if wo.id == wo_id:
                wo_info = f" - {wo.customer_name} ({wo.instrument_type})"
                break

        print(f"\n  {color(f'工单 {wo_id}{wo_info}', Colors.BOLD)} 有 {len(notifs)} 个问题:")
        for j, notif in enumerate(notifs, 1):
            label, color_code = NOTIFICATION_TYPE_LABELS.get(notif.type, ("未知", Colors.BLUE))
            print(f"    {j}. [{color(label, color_code)}] {notif.message}")

    print()
    print_separator("!")
    print()
