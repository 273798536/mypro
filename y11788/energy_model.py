import math
from typing import List, Tuple, Optional, Dict
from dataclasses import dataclass
from config import system_config, AircraftConfig
from models import Waypoint, WindCondition, RouteSegment, Anomaly, AnomalyType, AnomalySeverity, SourceLocation
from geo_utils import (
    haversine_distance, calculate_bearing, calculate_wind_component,
    calculate_ground_speed
)

@dataclass
class EnergyCalculationResult:
    air_speed_m_s: float
    ground_speed_m_s: float
    headwind_component: float
    crosswind_component: float
    drag_force: float
    lift_force: float
    power_required: float
    energy_used_wh: float
    flight_time_s: float
    anomalies: List[Anomaly]

class EnergyModel:
    def __init__(self, aircraft_config: AircraftConfig):
        self.aircraft = aircraft_config
        self.anomalies: List[Anomaly] = []
    
    def _get_wind_at_altitude(self, wind_conditions: List[WindCondition], 
                              target_altitude: float) -> Tuple[float, float]:
        if not wind_conditions:
            return 0.0, 0.0
        
        if len(wind_conditions) == 1:
            return wind_conditions[0].speed_m_s, wind_conditions[0].direction_deg
        
        wind_conditions_sorted = sorted(wind_conditions, key=lambda w: w.altitude_m)
        
        if target_altitude <= wind_conditions_sorted[0].altitude_m:
            return wind_conditions_sorted[0].speed_m_s, wind_conditions_sorted[0].direction_deg
        
        if target_altitude >= wind_conditions_sorted[-1].altitude_m:
            return wind_conditions_sorted[-1].speed_m_s, wind_conditions_sorted[-1].direction_deg
        
        for i in range(len(wind_conditions_sorted) - 1):
            w1 = wind_conditions_sorted[i]
            w2 = wind_conditions_sorted[i + 1]
            
            if w1.altitude_m <= target_altitude <= w2.altitude_m:
                alt_diff = w2.altitude_m - w1.altitude_m
                if alt_diff < 1e-6:
                    return w1.speed_m_s, w1.direction_deg
                ratio = (target_altitude - w1.altitude_m) / alt_diff
                speed = w1.speed_m_s + (w2.speed_m_s - w1.speed_m_s) * ratio
                direction = w1.direction_deg + (w2.direction_deg - w1.direction_deg) * ratio
                return speed, direction
        
        return wind_conditions_sorted[0].speed_m_s, wind_conditions_sorted[0].direction_deg
    
    def calculate_segment_energy(
        self,
        wp_start: Waypoint,
        wp_end: Waypoint,
        wind_conditions: List[WindCondition],
        source: Optional[SourceLocation] = None
    ) -> EnergyCalculationResult:
        anomalies = []
        
        distance_m = haversine_distance(
            wp_start.latitude, wp_start.longitude,
            wp_end.latitude, wp_end.longitude
        )
        
        avg_altitude = (wp_start.altitude_m + wp_end.altitude_m) / 2
        heading = calculate_bearing(
            wp_start.latitude, wp_start.longitude,
            wp_end.latitude, wp_end.longitude
        )
        
        wind_speed, wind_direction = self._get_wind_at_altitude(wind_conditions, avg_altitude)
        headwind_component, crosswind_component = calculate_wind_component(
            wind_speed, wind_direction, heading
        )
        
        if headwind_component > self.aircraft.cruise_speed_m_s * 0.5:
            anomalies.append(Anomaly(
                anomaly_type=AnomalyType.HEADWIND_EXCESSIVE,
                severity=AnomalySeverity.WARNING,
                message=f"强逆风: 航段 {wp_start.name} -> {wp_end.name} 逆风分量 {headwind_component:.1f} m/s",
                source=source,
                details={
                    "headwind_component": headwind_component,
                    "wind_speed": wind_speed,
                    "wind_direction": wind_direction,
                    "heading": heading
                }
            ))
        
        air_speed = self.aircraft.cruise_speed_m_s
        ground_speed = calculate_ground_speed(air_speed, headwind_component, crosswind_component)
        
        if ground_speed < self.aircraft.min_speed_m_s * 0.5:
            anomalies.append(Anomaly(
                anomaly_type=AnomalyType.SPEED_VIOLATION,
                severity=AnomalySeverity.CRITICAL,
                message=f"地速过低: {ground_speed:.1f} m/s 可能无法保持飞行",
                source=source,
                details={"ground_speed": ground_speed, "air_speed": air_speed}
            ))
        
        effective_airspeed = air_speed + headwind_component
        dynamic_pressure = 0.5 * system_config.AIR_DENSITY_KG_M3 * effective_airspeed ** 2
        
        lift_force = self.aircraft.mass_kg * system_config.GRAVITY_M_S2
        drag_force = dynamic_pressure * self.aircraft.wing_area_m2 * self.aircraft.drag_coefficient
        
        altitude_change = wp_end.altitude_m - wp_start.altitude_m
        if altitude_change > 0:
            climb_power = lift_force * (altitude_change / (distance_m / max(ground_speed, 0.1)))
        else:
            climb_power = 0
        
        thrust_power = drag_force * effective_airspeed
        total_power = (thrust_power + climb_power) / self.aircraft.propeller_efficiency
        
        flight_time_s = distance_m / max(ground_speed, 0.1)
        energy_used_wh = (total_power * flight_time_s) / 3600.0
        
        if self.aircraft.hover_power_w and (wp_start.stay_time_s > 0 or wp_end.stay_time_s > 0):
            hover_time = wp_start.stay_time_s + wp_end.stay_time_s
            hover_energy = (self.aircraft.hover_power_w * hover_time) / 3600.0
            energy_used_wh += hover_energy
        
        return EnergyCalculationResult(
            air_speed_m_s=air_speed,
            ground_speed_m_s=ground_speed,
            headwind_component=headwind_component,
            crosswind_component=crosswind_component,
            drag_force=drag_force,
            lift_force=lift_force,
            power_required=total_power,
            energy_used_wh=energy_used_wh,
            flight_time_s=flight_time_s,
            anomalies=anomalies
        )
    
    def create_route_segment(
        self,
        wp_start: Waypoint,
        wp_end: Waypoint,
        wind_conditions: List[WindCondition]
    ) -> RouteSegment:
        source = wp_start.source
        energy_result = self.calculate_segment_energy(wp_start, wp_end, wind_conditions, source)
        
        distance_m = haversine_distance(
            wp_start.latitude, wp_start.longitude,
            wp_end.latitude, wp_end.longitude
        )
        
        heading = calculate_bearing(
            wp_start.latitude, wp_start.longitude,
            wp_end.latitude, wp_end.longitude
        )
        
        wind_speed, wind_direction = self._get_wind_at_altitude(
            wind_conditions, (wp_start.altitude_m + wp_end.altitude_m) / 2
        )
        wind_angle = (heading - wind_direction + 360) % 360
        
        return RouteSegment(
            start_waypoint_id=wp_start.waypoint_id,
            end_waypoint_id=wp_end.waypoint_id,
            distance_m=distance_m,
            ground_speed_m_s=energy_result.ground_speed_m_s,
            air_speed_m_s=energy_result.air_speed_m_s,
            heading_deg=heading,
            wind_angle_deg=wind_angle,
            wind_component_m_s=energy_result.headwind_component,
            flight_time_s=energy_result.flight_time_s,
            energy_used_wh=energy_result.energy_used_wh,
            anomalies=energy_result.anomalies
        )
