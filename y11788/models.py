from dataclasses import dataclass, field
from typing import List, Tuple, Optional, Dict, Any
from enum import Enum
import uuid
from datetime import datetime

class WaypointType(Enum):
    START = "start"
    WAYPOINT = "waypoint"
    END = "end"
    LANDING = "landing"

class AnomalyType(Enum):
    HEADWIND_EXCESSIVE = "headwind_excessive"
    NO_FLY_ZONE_CROSSING = "no_fly_zone_crossing"
    INSUFFICIENT_BATTERY = "insufficient_battery"
    WAYPOINT_MISSING = "waypoint_missing"
    INVALID_COORDINATES = "invalid_coordinates"
    SPEED_VIOLATION = "speed_violation"
    ALTITUDE_VIOLATION = "altitude_violation"
    GENERAL_INFO = "general_info"

class AnomalySeverity(Enum):
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"

@dataclass
class SourceLocation:
    file_name: str
    line_number: Optional[int] = None
    column: Optional[int] = None
    sheet_name: Optional[str] = None
    raw_value: Optional[str] = None

@dataclass
class Anomaly:
    anomaly_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    anomaly_type: AnomalyType = AnomalyType.GENERAL_INFO
    severity: AnomalySeverity = AnomalySeverity.INFO
    message: str = ""
    source: Optional[SourceLocation] = None
    route_segment: Optional[Tuple[int, int]] = None
    details: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)

@dataclass
class Waypoint:
    waypoint_id: str
    name: str
    latitude: float
    longitude: float
    altitude_m: float
    waypoint_type: WaypointType = WaypointType.WAYPOINT
    order: Optional[int] = None
    source: Optional[SourceLocation] = None
    stay_time_s: float = 0.0

@dataclass
class WindCondition:
    altitude_m: float
    speed_m_s: float
    direction_deg: float
    source: Optional[SourceLocation] = None

@dataclass
class NoFlyZone:
    zone_id: str
    name: str
    polygon_coordinates: List[Tuple[float, float]]
    min_altitude_m: float = 0.0
    max_altitude_m: float = float('inf')
    source: Optional[SourceLocation] = None

@dataclass
class RouteSegment:
    start_waypoint_id: str
    end_waypoint_id: str
    distance_m: float
    ground_speed_m_s: float
    air_speed_m_s: float
    heading_deg: float
    wind_angle_deg: float
    wind_component_m_s: float
    flight_time_s: float
    energy_used_wh: float
    anomalies: List[Anomaly] = field(default_factory=list)

@dataclass
class Route:
    route_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    waypoint_order: List[str] = field(default_factory=list)
    segments: List[RouteSegment] = field(default_factory=list)
    total_distance_m: float = 0.0
    total_flight_time_s: float = 0.0
    total_energy_wh: float = 0.0
    remaining_battery_wh: float = 0.0
    anomalies: List[Anomaly] = field(default_factory=list)
    is_valid: bool = True
    creation_time: datetime = field(default_factory=datetime.now)

@dataclass
class CalculationResult:
    result_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    input_hash: str = ""
    optimal_route: Optional[Route] = None
    candidate_routes: List[Route] = field(default_factory=list)
    all_anomalies: List[Anomaly] = field(default_factory=list)
    calculation_time_ms: float = 0.0
    version: str = "1.0.0"
    timestamp: datetime = field(default_factory=datetime.now)
    data_sources: Dict[str, Any] = field(default_factory=dict)
    change_history: List[Dict[str, Any]] = field(default_factory=list)
