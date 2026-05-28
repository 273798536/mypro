import math
from typing import List, Tuple, Optional
from shapely.geometry import Polygon, LineString
from config import system_config
from models import Waypoint, NoFlyZone, Anomaly, AnomalyType, AnomalySeverity, SourceLocation

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    lon1_rad = math.radians(lon1)
    lon2_rad = math.radians(lon2)
    
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    
    return c * system_config.EARTH_RADIUS_KM * 1000

def calculate_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    lon1_rad = math.radians(lon1)
    lon2_rad = math.radians(lon2)
    
    dlon = lon2_rad - lon1_rad
    
    x = math.sin(dlon) * math.cos(lat2_rad)
    y = math.cos(lat1_rad) * math.sin(lat2_rad) - math.sin(lat1_rad) * math.cos(lat2_rad) * math.cos(dlon)
    
    initial_bearing = math.atan2(x, y)
    initial_bearing = math.degrees(initial_bearing)
    compass_bearing = (initial_bearing + 360) % 360
    
    return compass_bearing

def calculate_wind_component(wind_speed: float, wind_direction: float, heading: float) -> Tuple[float, float]:
    wind_angle = math.radians((heading - wind_direction + 360) % 360)
    
    headwind_component = -wind_speed * math.cos(wind_angle)
    crosswind_component = wind_speed * math.sin(wind_angle)
    
    return headwind_component, crosswind_component

def calculate_ground_speed(air_speed: float, headwind_component: float, crosswind_component: float) -> float:
    effective_air_speed = air_speed + headwind_component
    ground_speed = math.sqrt(effective_air_speed ** 2 + crosswind_component ** 2)
    return max(0, ground_speed)

def check_no_fly_zone_crossing(
    wp1: Waypoint, wp2: Waypoint, no_fly_zones: List[NoFlyZone]
) -> Tuple[bool, List[Anomaly]]:
    anomalies = []
    line = LineString([(wp1.longitude, wp1.latitude), (wp2.longitude, wp2.latitude)])
    avg_altitude = (wp1.altitude_m + wp2.altitude_m) / 2
    
    for zone in no_fly_zones:
        polygon = Polygon([(lon, lat) for lat, lon in zone.polygon_coordinates])
        
        if zone.min_altitude_m <= avg_altitude <= zone.max_altitude_m:
            if line.intersects(polygon) or line.within(polygon):
                intersection = line.intersection(polygon)
                source = SourceLocation(
                    file_name=wp1.source.file_name if wp1.source else "unknown",
                    line_number=wp1.source.line_number if wp1.source else None
                )
                anomaly = Anomaly(
                    anomaly_type=AnomalyType.NO_FLY_ZONE_CROSSING,
                    severity=AnomalySeverity.CRITICAL,
                    message=f"航线 {wp1.name} -> {wp2.name} 穿越禁飞区: {zone.name}",
                    source=source,
                    details={
                        "zone_id": zone.zone_id,
                        "zone_name": zone.name,
                        "intersection_type": intersection.geom_type,
                        "avg_altitude": avg_altitude
                    }
                )
                anomalies.append(anomaly)
    
    return len(anomalies) > 0, anomalies

def interpolate_waypoint(wp1: Waypoint, wp2: Waypoint, ratio: float) -> Tuple[float, float]:
    lat = wp1.latitude + (wp2.latitude - wp1.latitude) * ratio
    lon = wp1.longitude + (wp2.longitude - wp1.longitude) * ratio
    return lat, lon

def calculate_path_points(wp1: Waypoint, wp2: Waypoint, num_points: int = 10) -> List[Tuple[float, float]]:
    points = []
    for i in range(num_points + 1):
        ratio = i / num_points
        lat, lon = interpolate_waypoint(wp1, wp2, ratio)
        points.append((lat, lon))
    return points
