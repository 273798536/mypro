from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from enum import Enum
import uuid
from datetime import datetime


class RoadStatus(Enum):
    OPEN = "open"
    BLOCKED = "blocked"


class VehicleStatus(Enum):
    AVAILABLE = "available"
    IN_SERVICE = "in_service"


class DemandStatus(Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    FULFILLED = "fulfilled"
    FAILED = "failed"


class ErrorType(Enum):
    ROAD_BLOCKED = "road_blocked"
    DUPLICATE_DEMAND = "duplicate_demand"
    VEHICLE_OVERLOAD = "vehicle_overload"


@dataclass
class Warehouse:
    warehouse_id: str
    name: str
    location: str
    x: float
    y: float
    inventory: Dict[str, int] = field(default_factory=dict)

    def update_inventory(self, item: str, quantity: int):
        if item in self.inventory:
            self.inventory[item] += quantity
        else:
            self.inventory[item] = quantity

    def has_inventory(self, item: str, quantity: int) -> bool:
        return self.inventory.get(item, 0) >= quantity


@dataclass
class Road:
    road_id: str
    from_location: str
    to_location: str
    distance: float
    status: RoadStatus = RoadStatus.OPEN

    @property
    def is_open(self) -> bool:
        return self.status == RoadStatus.OPEN


@dataclass
class Vehicle:
    vehicle_id: str
    plate_number: str
    capacity: int
    current_load: int = 0
    status: VehicleStatus = VehicleStatus.AVAILABLE
    current_location: Optional[str] = None

    @property
    def available_capacity(self) -> int:
        return self.capacity - self.current_load

    def can_load(self, quantity: int) -> bool:
        return self.available_capacity >= quantity


@dataclass
class Demand:
    demand_id: str
    location: str
    x: float
    y: float
    items: Dict[str, int] = field(default_factory=dict)
    priority: int = 1
    status: DemandStatus = DemandStatus.PENDING
    assigned_vehicle: Optional[str] = None

    @property
    def total_items(self) -> int:
        return sum(self.items.values())


@dataclass
class DispatchError:
    error_id: str
    error_type: ErrorType
    source_file: str
    location: str
    details: Dict[str, Any]
    next_step: str
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class DispatchContext:
    context_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    warehouses: Dict[str, Warehouse] = field(default_factory=dict)
    roads: Dict[str, Road] = field(default_factory=dict)
    vehicles: Dict[str, Vehicle] = field(default_factory=dict)
    demands: Dict[str, Demand] = field(default_factory=dict)
    errors: List[DispatchError] = field(default_factory=list)
