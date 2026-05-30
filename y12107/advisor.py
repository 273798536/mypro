from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine import ScheduleResult
from models import BuildingMap, DoorStatus, Shift, WorkOrder


@dataclass
class Advice:
    category: str
    severity: str
    message: str
    action: str
    affected_ids: list[str] = field(default_factory=list)


def _severity_level(s: str) -> int:
    return {"critical": 3, "warning": 2, "info": 1}.get(s, 0)


class CorrectionAdvisor:
    def advise(
        self,
        result: ScheduleResult,
        orders: dict[str, WorkOrder],
        buildings: dict[str, BuildingMap],
        shifts: dict[str, Shift],
    ) -> list[Advice]:
        advices: list[Advice] = []
        advices.extend(self._check_duplicate_orders(orders))
        advices.extend(self._check_closed_doors(result, buildings))
        advices.extend(self._check_route_breakpoints(result, buildings))
        advices.extend(self._check_unreachable(result, buildings))
        advices.extend(self._check_unassigned(result, shifts))
        advices.extend(self._check_late_shifts(shifts))
        advices.extend(self._check_dirty_data(orders, buildings, shifts))
        advices.sort(key=lambda a: _severity_level(a.severity), reverse=True)
        return advices

    def _check_duplicate_orders(self, orders: dict[str, WorkOrder]) -> list[Advice]:
        advices: list[Advice] = []
        seen: dict[str, list[str]] = {}
        for oid, o in orders.items():
            key = f"{o.building_id}|{o.task_type}|{o.priority}"
            seen.setdefault(key, []).append(oid)
        for key, ids in seen.items():
            if len(ids) > 1:
                building_id, task_type, _ = key.split("|")
                advices.append(
                    Advice(
                        category="工单重复",
                        severity="warning",
                        message=f"楼栋 {building_id} 的 {task_type} 任务存在 {len(ids)} 条重复工单",
                        action=f"请核实工单 {ids}，合并或取消多余工单；若为不同紧急程度请调整优先级区分",
                        affected_ids=ids,
                    )
                )
        return advices

    def _check_closed_doors(
        self,
        result: ScheduleResult,
        buildings: dict[str, BuildingMap],
    ) -> list[Advice]:
        advices: list[Advice] = []
        for bid in result.closed_door_buildings:
            b = buildings.get(bid)
            name = b.name if b else bid
            advices.append(
                Advice(
                    category="门禁关闭",
                    severity="critical",
                    message=f"楼栋 {name}({bid}) 门禁已关闭，无法进入巡检",
                    action=f"1. 联系物业确认门禁状态，如已修复请更新 door_status 为 open 后重新排程; "
                    f"2. 若确认长期关闭，将该楼栋工单标记为 cancelled 或迁至备用入口楼栋; "
                    f"3. 不可忽略此告警——关闭的门禁意味着该楼栋完全不可达",
                    affected_ids=[bid],
                )
            )
        return advices

    def _check_route_breakpoints(
        self,
        result: ScheduleResult,
        buildings: dict[str, BuildingMap],
    ) -> list[Advice]:
        advices: list[Advice] = []
        for step in result.steps:
            path = step.path
            if len(path) < 2:
                continue
            for i in range(len(path) - 1):
                from_b = buildings.get(path[i])
                to_b = buildings.get(path[i + 1])
                if to_b and to_b.door_status == DoorStatus.CLOSED:
                    advices.append(
                        Advice(
                            category="路线断点",
                            severity="critical",
                            message=f"工单 {step.order_id} 的路径中 {path[i]}→{path[i+1]} 存在门禁关闭断点",
                            action=f"1. 确认 {path[i+1]} 门禁是否可临时开启; "
                            f"2. 如不可开启，删除该邻接关系并重新排程; "
                            f"3. 考虑从 {path[i]} 绕行其他楼栋到达 {step.building_id}",
                            affected_ids=[step.order_id, path[i + 1]],
                        )
                    )
                if to_b and path[i + 1] not in [adj for adj, _ in (from_b.edge_weights.items() if from_b else {})]:
                    if from_b and path[i + 1] not in from_b.adjacent_buildings:
                        advices.append(
                            Advice(
                                category="路线断点",
                                severity="warning",
                                message=f"工单 {step.order_id} 的路径中 {path[i]}→{path[i+1]} 邻接关系可能在地图更新后丢失",
                                action=f"检查楼栋 {path[i]} 的 adjacent_buildings 是否包含 {path[i+1]}，必要时补充边权重",
                                affected_ids=[step.order_id, path[i], path[i + 1]],
                            )
                        )
        return advices

    def _check_unreachable(
        self,
        result: ScheduleResult,
        buildings: dict[str, BuildingMap],
    ) -> list[Advice]:
        advices: list[Advice] = []
        for oid in result.unreachable_orders:
            advices.append(
                Advice(
                    category="不可达工单",
                    severity="warning",
                    message=f"工单 {oid} 目标楼栋在当前地图中不可达",
                    action=f"1. 确认工单 {oid} 的 building_id 是否正确; "
                    f"2. 检查楼栋地图是否有遗漏的邻接关系; "
                    f"3. 若楼栋确实孤立，考虑手动添加临时通道或调整工单楼栋",
                    affected_ids=[oid],
                )
            )
        return advices

    def _check_unassigned(
        self,
        result: ScheduleResult,
        shifts: dict[str, Shift],
    ) -> list[Advice]:
        advices: list[Advice] = []
        if not result.unassigned_orders:
            return advices
        effective = sum(1 for s in shifts.values() if s.is_effective)
        advices.append(
            Advice(
                category="工单未分配",
                severity="warning",
                message=f"有 {len(result.unassigned_orders)} 条工单未分配到维修员，当前有效班次 {effective} 个",
                action=f"1. 检查维修员班次是否充足，必要时增加班次; "
                f"2. 确认晚到维修员是否已到岗，更新 late_arrival=False 后重新排程; "
                f"3. 未分配工单: {result.unassigned_orders[:5]}{'...' if len(result.unassigned_orders) > 5 else ''}",
                affected_ids=result.unassigned_orders,
            )
        )
        return advices

    def _check_late_shifts(self, shifts: dict[str, Shift]) -> list[Advice]:
        advices: list[Advice] = []
        for sid, s in shifts.items():
            if s.late_arrival:
                advices.append(
                    Advice(
                        category="维修员晚到",
                        severity="info",
                        message=f"维修员 {s.worker_name}({sid}) 标记为晚到",
                        action=f"1. 确认 {s.worker_name} 预计到岗时间; "
                        f"2. 如已到岗，更新 late_arrival=False 并重新排程; "
                        f"3. 如长时间未到岗，将该班次标记为不可用(available=False)",
                        affected_ids=[sid],
                    )
                )
        return advices

    def _check_dirty_data(
        self,
        orders: dict[str, WorkOrder],
        buildings: dict[str, BuildingMap],
        shifts: dict[str, Shift],
    ) -> list[Advice]:
        advices: list[Advice] = []
        dirty_orders = [o for o in orders.values() if o.is_dirty]
        if dirty_orders:
            advices.append(
                Advice(
                    category="脏数据",
                    severity="info",
                    message=f"有 {len(dirty_orders)} 条工单存在缺失字段",
                    action=f"请补充缺失字段: {', '.join(set(f for o in dirty_orders for f in o._missing_fields))}",
                    affected_ids=[o.order_id for o in dirty_orders],
                )
            )
        dirty_buildings = [b for b in buildings.values() if b.is_dirty]
        if dirty_buildings:
            advices.append(
                Advice(
                    category="脏数据",
                    severity="info",
                    message=f"有 {len(dirty_buildings)} 栋楼地图存在缺失字段",
                    action=f"请补充缺失字段: {', '.join(set(f for b in dirty_buildings for f in b._missing_fields))}",
                    affected_ids=[b.building_id for b in dirty_buildings],
                )
            )
        dirty_shifts = [s for s in shifts.values() if s.is_dirty]
        if dirty_shifts:
            advices.append(
                Advice(
                    category="脏数据",
                    severity="info",
                    message=f"有 {len(dirty_shifts)} 个班次存在缺失字段或晚到标记",
                    action=f"请核实并补充: {', '.join(set(f for s in dirty_shifts for f in s._missing_fields))}",
                    affected_ids=[s.shift_id for s in dirty_shifts],
                )
            )
        return advices
