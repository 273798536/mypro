from dataclasses import dataclass, field
from typing import List, Optional, Dict
from enum import Enum
import math


class RoadStatus(Enum):
    OPEN = "open"
    CLOSED = "closed"


@dataclass
class Stop:
    stop_id: str
    name: str
    lat: float
    lng: float
    student_count: int = 0

    def distance_to(self, other: "Stop") -> float:
        return math.sqrt(
            (self.lat - other.lat) ** 2 + (self.lng - other.lng) ** 2)

    def is_valid_coordinate(self) -> bool:
        return (-90 <= self.lat <= 90) and (-180 <= self.lng <= 180)

    def __hash__(self):
        return hash(self.stop_id)

    def __eq__(self, other):
        if not isinstance(other, Stop):
            return False
        return self.stop_id == other.stop_id


@dataclass
class Road:
    road_id: str
    from_stop_id: str
    to_stop_id: str
    duration_minutes: float
    status: RoadStatus = RoadStatus.OPEN
    note: str = ""

    @property
    def is_closed(self) -> bool:
        return self.status == RoadStatus.CLOSED


@dataclass
class Vehicle:
    vehicle_id: str
    capacity: int
    description: str = ""

    def __hash__(self):
        return hash(self.vehicle_id)

    def __eq__(self, other):
        if not isinstance(other, Vehicle):
            return False
        return self.vehicle_id == other.vehicle_id


@dataclass
class Route:
    route_id: str
    vehicle: Vehicle
    stops: List[Stop] = field(default_factory=list)
    total_duration: float = 0.0

    @property
    def total_students(self) -> int:
        return sum(stop.student_count for stop in self.stops)

    @property
    def is_overloaded(self) -> bool:
        return self.total_students > self.vehicle.capacity

    @property
    def load_ratio(self) -> float:
        if self.vehicle.capacity == 0:
            return float('inf')
        return self.total_students / self.vehicle.capacity


@dataclass
class ScheduleInput:
    school: Stop
    stops: List[Stop] = field(default_factory=list)
    roads: List[Road] = field(default_factory=list)
    vehicles: List[Vehicle] = field(default_factory=list)

    def get_stop(self, stop_id: str) -> Optional[Stop]:
        for stop in self.stops + [self.school]:
            if stop.stop_id == stop_id:
                return stop
        return None

    def get_roads_from(self, stop_id: str) -> List[Road]:
        return [r for r in self.roads if r.from_stop_id == stop_id]

    def get_roads_to(self, stop_id: str) -> List[Road]:
        return [r for r in self.roads if r.to_stop_id == stop_id]


@dataclass
class ValidationIssue:
    level: str
    code: str
    message: str
    details: Dict = field(default_factory=dict)

    def __str__(self) -> str:
        detail_str = ", ".join(f"{k}={v}" for k, v in self.details.items())
        return f"[{self.level}] {self.code}: {self.message}" + (f" ({detail_str})" if detail_str else "")


@dataclass
class ScheduleOutput:
    routes: List[Route] = field(default_factory=list)
    issues: List[ValidationIssue] = field(default_factory=list)
    total_distance: float = 0.0
    total_students: int = 0

    @property
    def has_errors(self) -> bool:
        return any(issue.level == "ERROR" for issue in self.issues)

    @property
    def has_warnings(self) -> bool:
        return any(issue.level == "WARNING" for issue in self.issues)
