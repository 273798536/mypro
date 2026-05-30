from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from models import BuildingMap, DoorStatus, Shift, WorkOrder


class DataCategory(str, Enum):
    NORMAL = "normal"
    BOUNDARY = "boundary"
    BAD = "bad"


@dataclass
class ClassifiedItem:
    category: DataCategory
    item: Any
    reason: str = ""


@dataclass
class ClassifiedBatch:
    normal: list[ClassifiedItem] = field(default_factory=list)
    boundary: list[ClassifiedItem] = field(default_factory=list)
    bad: list[ClassifiedItem] = field(default_factory=list)

    def summary(self) -> dict[str, int]:
        return {
            "normal": len(self.normal),
            "boundary": len(self.boundary),
            "bad": len(self.bad),
            "total": len(self.normal) + len(self.boundary) + len(self.bad),
        }

    def to_dict(self) -> dict[str, Any]:
        return {
            "normal": [ci.item.to_dict() if hasattr(ci.item, "to_dict") else ci.item for ci in self.normal],
            "boundary": [
                {
                    "item": ci.item.to_dict() if hasattr(ci.item, "to_dict") else ci.item,
                    "reason": ci.reason,
                }
                for ci in self.boundary
            ],
            "bad": [
                {
                    "item": ci.item.to_dict() if hasattr(ci.item, "to_dict") else ci.item,
                    "reason": ci.reason,
                }
                for ci in self.bad
            ],
            "summary": self.summary(),
        }


class DataClassifier:
    def classify_orders(self, orders: list[WorkOrder]) -> ClassifiedBatch:
        batch = ClassifiedBatch()
        for order in orders:
            cat, reason = self._classify_order(order)
            ci = ClassifiedItem(category=cat, item=order, reason=reason)
            if cat == DataCategory.NORMAL:
                batch.normal.append(ci)
            elif cat == DataCategory.BOUNDARY:
                batch.boundary.append(ci)
            else:
                batch.bad.append(ci)
        return batch

    def classify_buildings(self, buildings: list[BuildingMap]) -> ClassifiedBatch:
        batch = ClassifiedBatch()
        for b in buildings:
            cat, reason = self._classify_building(b)
            ci = ClassifiedItem(category=cat, item=b, reason=reason)
            if cat == DataCategory.NORMAL:
                batch.normal.append(ci)
            elif cat == DataCategory.BOUNDARY:
                batch.boundary.append(ci)
            else:
                batch.bad.append(ci)
        return batch

    def classify_shifts(self, shifts: list[Shift]) -> ClassifiedBatch:
        batch = ClassifiedBatch()
        for s in shifts:
            cat, reason = self._classify_shift(s)
            ci = ClassifiedItem(category=cat, item=s, reason=reason)
            if cat == DataCategory.NORMAL:
                batch.normal.append(ci)
            elif cat == DataCategory.BOUNDARY:
                batch.boundary.append(ci)
            else:
                batch.bad.append(ci)
        return batch

    def _classify_order(self, order: WorkOrder) -> tuple[DataCategory, str]:
        reasons: list[str] = []
        if not order.order_id:
            return DataCategory.BAD, "工单ID缺失"
        if not order.building_id:
            return DataCategory.BAD, "楼栋ID缺失，无法定位"
        if order.priority < 1 or order.priority > 10:
            reasons.append(f"优先级越界({order.priority})，已钳位到[1,10]")
        if order.is_dirty:
            reasons.append(f"脏数据，缺失字段: {order._missing_fields}")
        if not order.task_type:
            reasons.append("任务类型为空")
        if reasons:
            if any("缺失" in r for r in reasons):
                return DataCategory.BAD, "; ".join(reasons)
            return DataCategory.BOUNDARY, "; ".join(reasons)
        return DataCategory.NORMAL, ""

    def _classify_building(self, b: BuildingMap) -> tuple[DataCategory, str]:
        reasons: list[str] = []
        if not b.building_id:
            return DataCategory.BAD, "楼栋ID缺失"
        if b.door_status == DoorStatus.CLOSED:
            reasons.append("门禁关闭，不可通行")
        if b.coordinates is None:
            reasons.append("坐标缺失")
        if not b.adjacent_buildings:
            reasons.append("无邻接楼栋(孤立节点)")
        if b.is_dirty:
            reasons.append(f"脏数据，缺失字段: {b._missing_fields}")
        if b.door_status == DoorStatus.UNKNOWN:
            reasons.append("门禁状态未知")
        if reasons:
            if b.door_status == DoorStatus.CLOSED:
                return DataCategory.BOUNDARY, "; ".join(reasons)
            if not b.adjacent_buildings and b.coordinates is None:
                return DataCategory.BAD, "孤立节点且坐标缺失，无法参与路径计算"
            return DataCategory.BOUNDARY, "; ".join(reasons)
        return DataCategory.NORMAL, ""

    def _classify_shift(self, s: Shift) -> tuple[DataCategory, str]:
        reasons: list[str] = []
        if not s.shift_id:
            return DataCategory.BAD, "班次ID缺失"
        if not s.worker_name:
            reasons.append("维修员姓名缺失")
        if s.start_time is None or s.end_time is None:
            return DataCategory.BAD, "班次时间缺失，无法排程"
        if s.late_arrival:
            reasons.append("维修员晚到")
        if not s.available:
            reasons.append("维修员不可用")
        if s.is_dirty and "skills" in s._missing_fields:
            reasons.append("技能标签字段异常")
        if reasons:
            if not s.available and s.late_arrival:
                return DataCategory.BAD, "; ".join(reasons)
            return DataCategory.BOUNDARY, "; ".join(reasons)
        return DataCategory.NORMAL, ""

    def classify_all(
        self,
        orders: list[WorkOrder],
        buildings: list[BuildingMap],
        shifts: list[Shift],
    ) -> dict[str, ClassifiedBatch]:
        return {
            "orders": self.classify_orders(orders),
            "buildings": self.classify_buildings(buildings),
            "shifts": self.classify_shifts(shifts),
        }
