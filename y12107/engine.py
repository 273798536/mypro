from __future__ import annotations

import heapq
from dataclasses import dataclass, field
from typing import Any, Optional

from models import BuildingMap, DoorStatus, Shift, WorkOrder


@dataclass
class ScheduleStep:
    order_id: str
    building_id: str
    shift_id: str
    priority: int
    distance: float
    path: list[str]
    notes: str = ""


@dataclass
class ScheduleResult:
    version: int
    steps: list[ScheduleStep]
    total_distance: float
    unreachable_orders: list[str]
    closed_door_buildings: list[str]
    unassigned_orders: list[str]
    warnings: list[str]
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "version": self.version,
            "total_distance": self.total_distance,
            "steps": [
                {
                    "order_id": s.order_id,
                    "building_id": s.building_id,
                    "shift_id": s.shift_id,
                    "priority": s.priority,
                    "distance": s.distance,
                    "path": s.path,
                    "notes": s.notes,
                }
                for s in self.steps
            ],
            "unreachable_orders": self.unreachable_orders,
            "closed_door_buildings": self.closed_door_buildings,
            "unassigned_orders": self.unassigned_orders,
            "warnings": self.warnings,
            "metadata": self.metadata,
        }


class SchedulingEngine:
    def __init__(self) -> None:
        self._buildings: dict[str, BuildingMap] = {}
        self._orders: dict[str, WorkOrder] = {}
        self._shifts: dict[str, Shift] = {}
        self._adj: dict[str, list[tuple[str, float]]] = {}
        self._version: int = 0

    def load_buildings(self, buildings: list[BuildingMap]) -> None:
        self._buildings.clear()
        self._adj.clear()
        for b in buildings:
            self._buildings[b.building_id] = b
        self._rebuild_graph()

    def load_orders(self, orders: list[WorkOrder]) -> None:
        self._orders.clear()
        for o in orders:
            self._orders[o.order_id] = o

    def load_shifts(self, shifts: list[Shift]) -> None:
        self._shifts.clear()
        for s in shifts:
            self._shifts[s.shift_id] = s

    def _rebuild_graph(self) -> None:
        self._adj.clear()
        for bid, b in self._buildings.items():
            self._adj[bid] = []
            for adj_bid in b.adjacent_buildings:
                weight = b.edge_weights.get(adj_bid, 1.0)
                self._adj[bid].append((adj_bid, weight))

    def update_building(self, building: BuildingMap) -> None:
        self._buildings[building.building_id] = building
        self._rebuild_graph()

    def insert_order(self, order: WorkOrder) -> None:
        self._orders[order.order_id] = order

    def remove_order(self, order_id: str) -> bool:
        if order_id in self._orders:
            del self._orders[order_id]
            return True
        return False

    def dijkstra(self, start: str, end: str) -> tuple[float, list[str]]:
        if start not in self._adj or end not in self._adj:
            return float("inf"), []
        dist: dict[str, float] = {start: 0.0}
        prev: dict[str, Optional[str]] = {start: None}
        pq: list[tuple[float, str]] = [(0.0, start)]
        visited: set[str] = set()
        while pq:
            d, u = heapq.heappop(pq)
            if u in visited:
                continue
            visited.add(u)
            if u == end:
                path: list[str] = []
                cur: Optional[str] = end
                while cur is not None:
                    path.append(cur)
                    cur = prev[cur]
                path.reverse()
                return d, path
            if u not in self._adj:
                continue
            b = self._buildings.get(u)
            if b and b.door_status == DoorStatus.CLOSED:
                continue
            for v, w in self._adj[u]:
                if v in visited:
                    continue
                nb = self._buildings.get(v)
                if nb and nb.door_status == DoorStatus.CLOSED:
                    continue
                nd = d + w
                if nd < dist.get(v, float("inf")):
                    dist[v] = nd
                    prev[v] = u
                    heapq.heappush(pq, (nd, v))
        return float("inf"), []

    def schedule(self, start_building: Optional[str] = None) -> ScheduleResult:
        self._version += 1
        version = self._version
        steps: list[ScheduleStep] = []
        unreachable: list[str] = []
        closed_doors: list[str] = []
        unassigned: list[str] = []
        warnings: list[str] = []

        effective_shifts = [s for s in self._shifts.values() if s.is_effective]
        if not effective_shifts:
            effective_shifts = list(self._shifts.values())
            if effective_shifts:
                warnings.append("所有维修员班次均非有效(晚到/不可用)，已降级使用全部班次")
            else:
                warnings.append("无可用维修员班次")

        sorted_orders = sorted(
            [o for o in self._orders.values() if o.status.value != "cancelled"],
            key=lambda o: (-o.priority, o.created_at),
        )

        current_pos = start_building
        if current_pos is None and self._buildings:
            current_pos = next(iter(self._buildings))

        shift_idx = 0
        for order in sorted_orders:
            target = order.building_id
            if target not in self._buildings:
                unreachable.append(order.order_id)
                continue
            tb = self._buildings[target]
            if tb.door_status == DoorStatus.CLOSED:
                closed_doors.append(target)
                continue
            if not current_pos:
                unreachable.append(order.order_id)
                continue
            dist, path = self.dijkstra(current_pos, target)
            if dist == float("inf"):
                unreachable.append(order.order_id)
                continue
            if not effective_shifts:
                unassigned.append(order.order_id)
                continue
            assigned_shift = effective_shifts[shift_idx % len(effective_shifts)]
            step = ScheduleStep(
                order_id=order.order_id,
                building_id=target,
                shift_id=assigned_shift.shift_id,
                priority=order.priority,
                distance=dist,
                path=path,
                notes=order.notes,
            )
            steps.append(step)
            current_pos = target
            shift_idx += 1

        remaining_ids = set(self._orders.keys()) - {s.order_id for s in steps}
        for rid in remaining_ids:
            if rid not in unreachable and rid not in closed_doors:
                if self._orders.get(rid, WorkOrder()).status.value != "cancelled":
                    unassigned.append(rid)

        total_dist = sum(s.distance for s in steps)

        return ScheduleResult(
            version=version,
            steps=steps,
            total_distance=total_dist,
            unreachable_orders=unreachable,
            closed_door_buildings=closed_doors,
            unassigned_orders=unassigned,
            warnings=warnings,
        )

    def reschedule_with_insert(
        self,
        new_order: WorkOrder,
        start_building: Optional[str] = None,
    ) -> ScheduleResult:
        self.insert_order(new_order)
        return self.schedule(start_building)

    def reschedule_with_priority_change(
        self,
        order_id: str,
        new_priority: int,
        start_building: Optional[str] = None,
    ) -> ScheduleResult:
        if order_id in self._orders:
            self._orders[order_id].priority = max(1, min(10, new_priority))
        return self.schedule(start_building)
