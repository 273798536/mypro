from __future__ import annotations

import copy
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Optional


class OrderStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class DoorStatus(str, Enum):
    OPEN = "open"
    CLOSED = "closed"
    UNKNOWN = "unknown"


@dataclass
class WorkOrder:
    order_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    building_id: str = ""
    task_type: str = ""
    priority: int = 5
    status: OrderStatus = OrderStatus.PENDING
    notes: str = ""
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    assigned_shift_id: Optional[str] = None
    route_node_id: Optional[str] = None
    _raw: Optional[dict] = field(default=None, repr=False)
    _missing_fields: list[str] = field(default_factory=list, repr=False)

    @classmethod
    def from_raw(cls, data: dict[str, Any]) -> WorkOrder:
        raw = copy.deepcopy(data)
        missing: list[str] = []
        order_id = data.get("order_id") or data.get("id") or str(uuid.uuid4())[:8]
        if "order_id" not in data and "id" not in data:
            missing.append("order_id")
        building_id = data.get("building_id", "")
        if not building_id:
            missing.append("building_id")
        task_type = data.get("task_type", "")
        if not task_type:
            missing.append("task_type")
        priority_raw = data.get("priority", 5)
        try:
            priority = int(priority_raw)
        except (ValueError, TypeError):
            priority = 5
            missing.append("priority")
        status_raw = data.get("status", "pending")
        try:
            status = OrderStatus(status_raw)
        except ValueError:
            status = OrderStatus.PENDING
            missing.append("status")
        notes = data.get("notes", "")
        created_at = data.get("created_at", datetime.now().isoformat())
        assigned_shift_id = data.get("assigned_shift_id")
        route_node_id = data.get("route_node_id")
        obj = cls(
            order_id=order_id,
            building_id=building_id,
            task_type=task_type,
            priority=priority,
            status=status,
            notes=notes,
            created_at=created_at,
            assigned_shift_id=assigned_shift_id,
            route_node_id=route_node_id,
            _raw=raw,
            _missing_fields=missing,
        )
        return obj

    @property
    def is_dirty(self) -> bool:
        return len(self._missing_fields) > 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "order_id": self.order_id,
            "building_id": self.building_id,
            "task_type": self.task_type,
            "priority": self.priority,
            "status": self.status.value,
            "notes": self.notes,
            "created_at": self.created_at,
            "assigned_shift_id": self.assigned_shift_id,
            "route_node_id": self.route_node_id,
            "is_dirty": self.is_dirty,
            "missing_fields": self._missing_fields,
        }


@dataclass
class BuildingMap:
    building_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    name: str = ""
    floor_count: Optional[int] = None
    door_status: DoorStatus = DoorStatus.UNKNOWN
    coordinates: Optional[tuple[float, float]] = None
    adjacent_buildings: list[str] = field(default_factory=list)
    edge_weights: dict[str, float] = field(default_factory=dict)
    _raw: Optional[dict] = field(default=None, repr=False)
    _missing_fields: list[str] = field(default_factory=list, repr=False)

    @classmethod
    def from_raw(cls, data: dict[str, Any]) -> BuildingMap:
        raw = copy.deepcopy(data)
        missing: list[str] = []
        building_id = data.get("building_id") or data.get("id") or str(uuid.uuid4())[:8]
        if "building_id" not in data and "id" not in data:
            missing.append("building_id")
        name = data.get("name", "")
        if not name:
            missing.append("name")
        floor_count = data.get("floor_count")
        if floor_count is not None:
            try:
                floor_count = int(floor_count)
            except (ValueError, TypeError):
                missing.append("floor_count")
                floor_count = None
        elif "floor_count" not in data:
            missing.append("floor_count")
        door_status_raw = data.get("door_status", "unknown")
        try:
            door_status = DoorStatus(door_status_raw)
        except ValueError:
            door_status = DoorStatus.UNKNOWN
            missing.append("door_status")
        coordinates = data.get("coordinates")
        if coordinates is None and "coordinates" not in data:
            missing.append("coordinates")
        adjacent_buildings = data.get("adjacent_buildings", [])
        if not isinstance(adjacent_buildings, list):
            adjacent_buildings = []
            missing.append("adjacent_buildings")
        edge_weights = data.get("edge_weights", {})
        if not isinstance(edge_weights, dict):
            edge_weights = {}
            missing.append("edge_weights")
        obj = cls(
            building_id=building_id,
            name=name,
            floor_count=floor_count,
            door_status=door_status,
            coordinates=coordinates,
            adjacent_buildings=adjacent_buildings,
            edge_weights=edge_weights,
            _raw=raw,
            _missing_fields=missing,
        )
        return obj

    @property
    def is_dirty(self) -> bool:
        return len(self._missing_fields) > 0

    @property
    def is_traversable(self) -> bool:
        return self.door_status != DoorStatus.CLOSED

    def to_dict(self) -> dict[str, Any]:
        return {
            "building_id": self.building_id,
            "name": self.name,
            "floor_count": self.floor_count,
            "door_status": self.door_status.value,
            "coordinates": self.coordinates,
            "adjacent_buildings": self.adjacent_buildings,
            "edge_weights": self.edge_weights,
            "is_dirty": self.is_dirty,
            "is_traversable": self.is_traversable,
            "missing_fields": self._missing_fields,
        }


@dataclass
class Shift:
    shift_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    worker_name: str = ""
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    available: bool = True
    late_arrival: bool = False
    skills: list[str] = field(default_factory=list)
    _raw: Optional[dict] = field(default=None, repr=False)
    _missing_fields: list[str] = field(default_factory=list, repr=False)

    @classmethod
    def from_raw(cls, data: dict[str, Any]) -> Shift:
        raw = copy.deepcopy(data)
        missing: list[str] = []
        shift_id = data.get("shift_id") or data.get("id") or str(uuid.uuid4())[:8]
        if "shift_id" not in data and "id" not in data:
            missing.append("shift_id")
        worker_name = data.get("worker_name", "")
        if not worker_name:
            missing.append("worker_name")
        start_time = data.get("start_time")
        if start_time is None:
            missing.append("start_time")
        end_time = data.get("end_time")
        if end_time is None:
            missing.append("end_time")
        available = data.get("available", True)
        late_arrival = data.get("late_arrival", False)
        skills = data.get("skills", [])
        if not isinstance(skills, list):
            skills = []
            missing.append("skills")
        obj = cls(
            shift_id=shift_id,
            worker_name=worker_name,
            start_time=start_time,
            end_time=end_time,
            available=available,
            late_arrival=late_arrival,
            skills=skills,
            _raw=raw,
            _missing_fields=missing,
        )
        return obj

    @property
    def is_dirty(self) -> bool:
        return len(self._missing_fields) > 0 or self.late_arrival

    @property
    def is_effective(self) -> bool:
        return self.available and not self.late_arrival

    def to_dict(self) -> dict[str, Any]:
        return {
            "shift_id": self.shift_id,
            "worker_name": self.worker_name,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "available": self.available,
            "late_arrival": self.late_arrival,
            "skills": self.skills,
            "is_dirty": self.is_dirty,
            "is_effective": self.is_effective,
            "missing_fields": self._missing_fields,
        }
