from dataclasses import dataclass, field
from typing import Dict, List, Optional
from enum import Enum


class StationStatus(Enum):
    ACTIVE = "active"
    CLOSED = "closed"
    PENDING = "pending"


class AssignmentStatus(Enum):
    CONFIRMED = "confirmed"
    OVERFLOW = "overflow_pending"
    DUPLICATE = "duplicate_pending"
    REASSIGNED = "reassigned"


class ChangeAction(Enum):
    ADDED = "added"
    MODIFIED = "modified"
    REMOVED = "removed"


@dataclass
class Employee:
    id: str
    name: str
    address: str
    candidate_stations: List[str] = field(default_factory=list)

    def __hash__(self):
        return hash(self.id)


@dataclass
class Station:
    id: str
    name: str
    location: str
    status: StationStatus = StationStatus.ACTIVE
    fixed_cost: float = 1.0

    def __hash__(self):
        return hash(self.id)


@dataclass
class Vehicle:
    id: str
    plate: str
    capacity: int

    def __hash__(self):
        return hash(self.id)


@dataclass
class Schedule:
    id: str
    station_id: str
    vehicle_id: str
    departure_time: str = ""
    route_order: int = 0

    def __hash__(self):
        return hash(self.id)


@dataclass
class Assignment:
    employee_id: str
    station_id: str
    schedule_id: Optional[str] = None
    status: AssignmentStatus = AssignmentStatus.CONFIRMED
    overflow_reason: str = ""
    next_action: str = ""

    def __hash__(self):
        return hash((self.employee_id, self.station_id))


@dataclass
class ChangeRecord:
    entity_type: str
    entity_id: str
    action: ChangeAction
    field_name: str
    old_value: str
    new_value: str
    affected_conclusions: List[str] = field(default_factory=list)
    timestamp: str = ""


@dataclass
class DispatchResult:
    assignments: List[Assignment] = field(default_factory=list)
    selected_stations: List[str] = field(default_factory=list)
    station_bus_count: Dict[str, int] = field(default_factory=dict)
    station_employee_count: Dict[str, int] = field(default_factory=dict)
    total_cost: float = 0.0
    is_feasible: bool = True
    overflow_stations: List[str] = field(default_factory=list)
    infeasibility_reason: str = ""


@dataclass
class DispatchSnapshot:
    employees: List[Employee] = field(default_factory=list)
    stations: List[Station] = field(default_factory=list)
    vehicles: List[Vehicle] = field(default_factory=list)
    schedules: List[Schedule] = field(default_factory=list)
    result: Optional[DispatchResult] = None
    change_log: List[ChangeRecord] = field(default_factory=list)
