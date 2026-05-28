from dataclasses import dataclass
from typing import Optional

@dataclass
class SystemConfig:
    EARTH_RADIUS_KM: float = 6371.0
    DEFAULT_ALTITUDE_M: float = 100.0
    GRAVITY_M_S2: float = 9.81
    AIR_DENSITY_KG_M3: float = 1.225
    
    ENERGY_TOLERANCE: float = 0.95
    NO_FLY_ZONE_MARGIN_M: float = 50.0
    
    MAX_ROUTE_CANDIDATES: int = 10
    TSP_OPTIMIZATION_ITERATIONS: int = 1000
    
    REPORT_TEMPLATE_PATH: str = "templates/report_template.html"
    OUTPUT_DIR: str = "output"
    
@dataclass
class AircraftConfig:
    model_name: str = "DefaultAircraft"
    mass_kg: float = 2.5
    wing_area_m2: float = 0.5
    drag_coefficient: float = 0.03
    lift_coefficient: float = 0.5
    propeller_efficiency: float = 0.75
    max_speed_m_s: float = 30.0
    cruise_speed_m_s: float = 15.0
    min_speed_m_s: float = 8.0
    battery_capacity_wh: float = 500.0
    battery_voltage_v: float = 14.8
    hover_power_w: Optional[float] = None

system_config = SystemConfig()
