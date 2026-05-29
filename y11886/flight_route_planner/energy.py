from __future__ import annotations

import math
from typing import List, Tuple

from .models import (
    AircraftSpec,
    BatterySpec,
    LegResult,
    NoFlyZone,
    Waypoint,
    Wind,
)


class EnergyModel:
    def __init__(
        self,
        aircraft: AircraftSpec,
        battery: BatterySpec,
        wind: Wind,
        nofly_zones: List[NoFlyZone],
    ):
        self.aircraft = aircraft
        self.battery = battery
        self.wind = wind
        self.nofly_zones = nofly_zones

    def compute_leg(
        self,
        wp_from: Waypoint,
        wp_to: Waypoint,
        cumulative_energy_wh: float,
        leg_index: int,
        ignore_wind: bool = False,
    ) -> Tuple[LegResult, bool]:
        distance_m = wp_from.distance_to(wp_to)
        bearing_deg = wp_from.bearing_to(wp_to)

        if ignore_wind:
            hw = 0.0
            cw = 0.0
        else:
            hw = self.wind.headwind_component(bearing_deg)
            cw = self.wind.crosswind_component(bearing_deg)

        ground_speed = self.aircraft.cruise_speed_ms - hw
        if ground_speed <= 0:
            ground_speed = 0.5

        flight_time_s = distance_m / ground_speed
        power = self.aircraft.power_w
        if not ignore_wind and self.wind.is_headwind(bearing_deg):
            power *= 1.0 + 0.15 * (hw / max(self.aircraft.cruise_speed_ms, 0.1))

        energy_wh = power * flight_time_s / 3600.0
        new_cumulative = cumulative_energy_wh + energy_wh

        headwind_missed = False
        if ignore_wind and self.wind.is_headwind(bearing_deg):
            headwind_missed = True

        breaches = []
        for nfz in self.nofly_zones:
            if nfz.segment_intersects(wp_from.lat, wp_from.lon, wp_to.lat, wp_to.lon):
                breaches.append(nfz.id)

        wind_info = f"wind={self.wind.direction_deg}°@{self.wind.speed_ms}m/s"
        if self.wind.source:
            wind_info += f" [{self.wind.source}]"
        source = f"leg[{leg_index}] {wp_from.id}->{wp_to.id} dist={distance_m:.1f}m bearing={bearing_deg:.1f}° {wind_info}"

        leg = LegResult(
            from_wp=wp_from.id,
            to_wp=wp_to.id,
            distance_m=distance_m,
            bearing_deg=bearing_deg,
            wind_headwind_ms=hw,
            wind_crosswind_ms=cw,
            ground_speed_ms=ground_speed,
            flight_time_s=flight_time_s,
            energy_wh=energy_wh,
            cumulative_energy_wh=new_cumulative,
            headwind_missed=headwind_missed,
            nofly_breaches=breaches,
            source=source,
        )

        battery_exceeded = new_cumulative > self.battery.usable_wh
        return leg, battery_exceeded

    def compute_route(
        self,
        waypoints: List[Waypoint],
        ignore_wind: bool = False,
    ) -> List[LegResult]:
        legs = []
        cumulative = 0.0
        for i in range(len(waypoints) - 1):
            leg, _ = self.compute_leg(
                waypoints[i], waypoints[i + 1], cumulative, i, ignore_wind
            )
            legs.append(leg)
            cumulative = leg.cumulative_energy_wh
        return legs

    def leg_cost(
        self,
        wp_from: Waypoint,
        wp_to: Waypoint,
        cumulative_energy_wh: float,
        leg_index: int,
    ) -> float:
        distance_m = wp_from.distance_to(wp_to)
        bearing_deg = wp_from.bearing_to(wp_to)
        hw = self.wind.headwind_component(bearing_deg)
        ground_speed = self.aircraft.cruise_speed_ms - hw
        if ground_speed <= 0:
            ground_speed = 0.5
        flight_time_s = distance_m / ground_speed
        power = self.aircraft.power_w
        if self.wind.is_headwind(bearing_deg):
            power *= 1.0 + 0.15 * (hw / max(self.aircraft.cruise_speed_ms, 0.1))
        energy_wh = power * flight_time_s / 3600.0

        cost = energy_wh
        if cumulative_energy_wh + energy_wh > self.battery.usable_wh:
            cost += 1e6

        for nfz in self.nofly_zones:
            if nfz.segment_intersects(wp_from.lat, wp_from.lon, wp_to.lat, wp_to.lon):
                cost += 5e5

        if self.wind.is_headwind(bearing_deg):
            cost += hw * 10.0

        return cost
