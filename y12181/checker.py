from datetime import date, datetime
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, field

from models import (
    RepairShopData,
    WorkOrder,
    WorkOrderStatus,
    PartInventory,
    Technician,
    InstrumentType,
    PartRequirement,
    Notification,
)


@dataclass
class PartShortage:
    part_name: str
    required: int
    available: int
    shortage: int
    unit: str
    supplier: str
    min_stock: int
    locked_by_other: int = 0

    def __str__(self) -> str:
        msg = f"【{self.part_name}】需求 {self.required}{self.unit}，库存仅 {self.available}{self.unit}"
        if self.locked_by_other > 0:
            msg += f"（其中 {self.locked_by_other}{self.unit} 被其他工单锁定）"
        msg += f"，缺口 {self.shortage}{self.unit}"
        if self.supplier:
            msg += f"，供应商: {self.supplier}"
        return msg


@dataclass
class TechnicianConflict:
    technician_name: str
    scheduled_date: date
    reason: str

    def __str__(self) -> str:
        return f"【{self.technician_name}】在 {self.scheduled_date} {self.reason}"


@dataclass
class InstrumentMissing:
    instrument_type: str
    suggestion: str

    def __str__(self) -> str:
        return f"乐器类型【{self.instrument_type}】未登记，{self.suggestion}"


@dataclass
class PartUnknown:
    part_name: str
    work_order_id: str
    suggestion: str

    def __str__(self) -> str:
        return f"工单 {self.work_order_id} 中的配件【{self.part_name}】未在库存中登记，{self.suggestion}"


@dataclass
class WorkOrderCheckResult:
    work_order_id: str
    customer_name: str
    instrument_type: str
    has_issues: bool = False
    part_shortages: List[PartShortage] = field(default_factory=list)
    technician_conflicts: List[TechnicianConflict] = field(default_factory=list)
    instrument_missing: Optional[InstrumentMissing] = None
    unknown_parts: List[PartUnknown] = field(default_factory=list)
    all_parts_available: bool = True
    technician_available: bool = True
    instrument_registered: bool = True

    def add_part_shortage(self, shortage: PartShortage) -> None:
        self.part_shortages.append(shortage)
        self.has_issues = True
        self.all_parts_available = False

    def add_technician_conflict(self, conflict: TechnicianConflict) -> None:
        self.technician_conflicts.append(conflict)
        self.has_issues = True
        self.technician_available = False

    def set_instrument_missing(self, missing: InstrumentMissing) -> None:
        self.instrument_missing = missing
        self.has_issues = True
        self.instrument_registered = False

    def add_unknown_part(self, unknown: PartUnknown) -> None:
        self.unknown_parts.append(unknown)
        self.has_issues = True
        self.all_parts_available = False

    def get_blocking_reasons(self) -> List[str]:
        reasons = []
        for ps in self.part_shortages:
            reasons.append(f"配件缺货: {ps}")
        for tc in self.technician_conflicts:
            reasons.append(f"人员冲突: {tc}")
        if self.instrument_missing:
            reasons.append(f"类型缺失: {self.instrument_missing}")
        for up in self.unknown_parts:
            reasons.append(f"未知配件: {up}")
        return reasons

    def get_summary(self) -> str:
        if not self.has_issues:
            return f"工单 {self.work_order_id}（{self.customer_name}）检查通过，可正常安排"
        reasons = self.get_blocking_reasons()
        return f"工单 {self.work_order_id}（{self.customer_name}）发现 {len(reasons)} 个问题: " + "; ".join(reasons)


@dataclass
class CheckReport:
    check_date: datetime
    total_orders: int
    checked_orders: int
    blocked_orders: int
    ready_orders: int
    results: List[WorkOrderCheckResult] = field(default_factory=list)
    all_part_shortages: List[PartShortage] = field(default_factory=list)
    all_technician_conflicts: List[TechnicianConflict] = field(default_factory=list)

    def get_statistics(self) -> Dict[str, int]:
        return {
            "total": self.total_orders,
            "checked": self.checked_orders,
            "blocked": self.blocked_orders,
            "ready": self.ready_orders,
            "part_shortages": len(self.all_part_shortages),
            "technician_conflicts": len(self.all_technician_conflicts),
        }


def calculate_locked_quantities(
    shop_data: RepairShopData,
    exclude_work_order_id: Optional[str] = None,
) -> Dict[str, int]:
    locked: Dict[str, int] = {}
    for wo in shop_data.work_orders:
        if exclude_work_order_id and wo.id == exclude_work_order_id:
            continue
        for pr in wo.parts_required:
            if pr.locked:
                locked[pr.part_name] = locked.get(pr.part_name, 0) + pr.quantity
    return locked


def find_part_inventory(shop_data: RepairShopData, part_name: str) -> Optional[PartInventory]:
    for pi in shop_data.part_inventories:
        if pi.name == part_name:
            return pi
    return None


def find_technician(shop_data: RepairShopData, name: str) -> Optional[Technician]:
    for t in shop_data.technicians:
        if t.name == name:
            return t
    return None


def find_instrument_type(shop_data: RepairShopData, name: str) -> Optional[InstrumentType]:
    for it in shop_data.instrument_types:
        if it.name == name:
            return it
    return None


def check_work_order(
    shop_data: RepairShopData,
    work_order: WorkOrder,
    check_date: Optional[date] = None,
) -> WorkOrderCheckResult:
    if check_date is None:
        check_date = date.today()

    result = WorkOrderCheckResult(
        work_order_id=work_order.id,
        customer_name=work_order.customer_name,
        instrument_type=work_order.instrument_type,
    )

    instrument = find_instrument_type(shop_data, work_order.instrument_type)
    if not instrument:
        registered_types = [it.name for it in shop_data.instrument_types]
        suggestion = "请先在乐器类型库中添加"
        if registered_types:
            suggestion += f"，已登记类型: {', '.join(registered_types)}"
        result.set_instrument_missing(InstrumentMissing(
            instrument_type=work_order.instrument_type,
            suggestion=suggestion,
        ))

    locked_quantities = calculate_locked_quantities(shop_data, exclude_work_order_id=work_order.id)

    for pr in work_order.parts_required:
        pi = find_part_inventory(shop_data, pr.part_name)
        if not pi:
            result.add_unknown_part(PartUnknown(
                part_name=pr.part_name,
                work_order_id=work_order.id,
                suggestion="请先在配件库存中添加该配件",
            ))
            continue

        locked_by_other = locked_quantities.get(pr.part_name, 0)
        available = pi.stock_quantity - locked_by_other
        if available < pr.quantity:
            shortage = pr.quantity - available
            result.add_part_shortage(PartShortage(
                part_name=pr.part_name,
                required=pr.quantity,
                available=pi.stock_quantity,
                shortage=shortage,
                unit=pi.unit,
                supplier=pi.supplier,
                min_stock=pi.min_stock,
                locked_by_other=locked_by_other,
            ))

    if work_order.assigned_technician and work_order.scheduled_date:
        tech = find_technician(shop_data, work_order.assigned_technician)
        if tech:
            if tech.is_on_leave(work_order.scheduled_date):
                other_techs = [
                    t.name for t in shop_data.technicians
                    if t.name != tech.name and not t.is_on_leave(work_order.scheduled_date)
                ]
                reason = "请假"
                if other_techs:
                    reason += f"，可替代: {', '.join(other_techs)}"
                else:
                    reason += "，当天无其他师傅可用"
                result.add_technician_conflict(TechnicianConflict(
                    technician_name=tech.name,
                    scheduled_date=work_order.scheduled_date,
                    reason=reason,
                ))

    return result


def check_all_work_orders(
    shop_data: RepairShopData,
    check_date: Optional[date] = None,
    status_filter: Optional[List[WorkOrderStatus]] = None,
) -> CheckReport:
    if check_date is None:
        check_date = date.today()

    orders_to_check = shop_data.work_orders
    if status_filter:
        orders_to_check = [wo for wo in orders_to_check if wo.status in status_filter]

    report = CheckReport(
        check_date=datetime.now(),
        total_orders=len(shop_data.work_orders),
        checked_orders=len(orders_to_check),
        blocked_orders=0,
        ready_orders=0,
    )

    for wo in orders_to_check:
        result = check_work_order(shop_data, wo, check_date)
        report.results.append(result)

        if result.has_issues:
            report.blocked_orders += 1
            wo.status = WorkOrderStatus.BLOCKED
            report.all_part_shortages.extend(result.part_shortages)
            report.all_technician_conflicts.extend(result.technician_conflicts)
        else:
            report.ready_orders += 1
            if wo.status == WorkOrderStatus.PENDING:
                wo.status = WorkOrderStatus.CHECKED

        wo.updated_at = datetime.now()

    return report


def generate_notifications(shop_data: RepairShopData, report: CheckReport) -> List[Notification]:
    notifications: List[Notification] = []
    existing_ids = {(n.work_order_id, n.message) for n in shop_data.notifications}

    for result in report.results:
        if result.has_issues:
            for reason in result.get_blocking_reasons():
                key = (result.work_order_id, reason)
                if key not in existing_ids:
                    notif_type = "part_shortage" if "配件缺货" in reason else \
                                 "technician_conflict" if "人员冲突" in reason else \
                                 "instrument_missing" if "类型缺失" in reason else "unknown"
                    notification = Notification(
                        id="",
                        work_order_id=result.work_order_id,
                        message=reason,
                        type=notif_type,
                    )
                    notifications.append(notification)

    shop_data.notifications.extend(notifications)
    return notifications
