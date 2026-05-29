from __future__ import annotations

import math
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional, Tuple


class IssueSeverity(Enum):
    HEADWIND_MISS = "headwind_miss"
    NOFLY_BREACH = "nofly_breach"
    BATTERY_LOW = "battery_low"


@dataclass
class Waypoint:
    id: str
    name: str
    lat: float
    lon: float

    def bearing_to(self, other: Waypoint) -> float:
        lat1, lon1 = math.radians(self.lat), math.radians(self.lon)
        lat2, lon2 = math.radians(other.lat), math.radians(other.lon)
        dlon = lon2 - lon1
        x = math.sin(dlon) * math.cos(lat2)
        y = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
        bearing = math.degrees(math.atan2(x, y))
        return (bearing + 360.0) % 360.0

    def distance_to(self, other: Waypoint) -> float:
        R = 6371000.0
        lat1, lon1 = math.radians(self.lat), math.radians(self.lon)
        lat2, lon2 = math.radians(other.lat), math.radians(other.lon)
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c


@dataclass
class Wind:
    direction_deg: float
    speed_ms: float
    source: str = ""

    def headwind_component(self, travel_bearing_deg: float) -> float:
        relative = math.radians(travel_bearing_deg - self.direction_deg)
        return self.speed_ms * math.cos(relative)

    def crosswind_component(self, travel_bearing_deg: float) -> float:
        relative = math.radians(travel_bearing_deg - self.direction_deg)
        return self.speed_ms * math.sin(relative)

    def is_headwind(self, travel_bearing_deg: float, threshold_deg: float = 90.0) -> bool:
        relative = abs((travel_bearing_deg - self.direction_deg + 180) % 360 - 180)
        return relative < threshold_deg


@dataclass
class NoFlyZone:
    id: str
    name: str
    polygon: List[Tuple[float, float]]
    source: str = ""

    def contains_point(self, lat: float, lon: float) -> bool:
        n = len(self.polygon)
        inside = False
        j = n - 1
        for i in range(n):
            yi, xi = self.polygon[i]
            yj, xj = self.polygon[j]
            if ((yi > lat) != (yj > lat)) and (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi):
                inside = not inside
            j = i
        return inside

    def segment_intersects(self, lat1: float, lon1: float, lat2: float, lon2: float) -> bool:
        steps = max(int(self._haversine(lat1, lon1, lat2, lon2) / 10), 2)
        for i in range(steps + 1):
            t = i / steps
            lat = lat1 + (lat2 - lat1) * t
            lon = lon1 + (lon2 - lon1) * t
            if self.contains_point(lat, lon):
                return True
        return False

    @staticmethod
    def _haversine(lat1, lon1, lat2, lon2) -> float:
        R = 6371000.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat / 2) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


@dataclass
class BatterySpec:
    capacity_wh: float
    safe_margin_pct: float = 20.0
    source: str = ""

    @property
    def usable_wh(self) -> float:
        return self.capacity_wh * (1.0 - self.safe_margin_pct / 100.0)


@dataclass
class AircraftSpec:
    cruise_speed_ms: float
    power_w: float
    source: str = ""


@dataclass
class ValidationIssue:
    severity: IssueSeverity
    leg_index: int
    from_wp: str
    to_wp: str
    message: str
    step: str
    detail: dict = field(default_factory=dict)


@dataclass
class LegResult:
    from_wp: str
    to_wp: str
    distance_m: float
    bearing_deg: float
    wind_headwind_ms: float
    wind_crosswind_ms: float
    ground_speed_ms: float
    flight_time_s: float
    energy_wh: float
    cumulative_energy_wh: float
    headwind_missed: bool
    nofly_breaches: List[str]
    source: str


@dataclass
class PlanResult:
    waypoints: List[Waypoint]
    legs: List[LegResult]
    total_distance_m: float
    total_energy_wh: float
    total_time_s: float
    battery_spec: BatterySpec
    aircraft_spec: AircraftSpec
    wind: Wind
    nofly_zones: List[NoFlyZone]
    issues: List[ValidationIssue]
    source: str = ""
