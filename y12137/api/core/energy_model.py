import math
import json
from typing import Dict, Any, List, Tuple, Optional
from dataclasses import dataclass

@dataclass
class EnergyModelParams:
    base_power_consumption: float = 800.0
    max_payload: float = 5.0
    max_altitude: float = 500.0
    max_speed: float = 25.0
    max_wind_speed: float = 15.0
    battery_capacity_mah: float = 16000.0
    voltage: float = 48.0

    @property
    def battery_capacity_wh(self):
        return (self.battery_capacity_mah / 1000.0) * self.voltage

class EnergyModel:
    def __init__(self, params: Optional[EnergyModelParams] = None):
        self.params = params or EnergyModelParams()

    def _payload_factor(self, payload_weight: float) -> float:
        ratio = min(payload_weight / self.params.max_payload, 1.0)
        return 1.0 + ratio * 0.6

    def _wind_factor(self, wind_speed: float, wind_direction: float, flight_direction: float = 0.0) -> float:
        wind_angle = math.radians(wind_direction - flight_direction)
        headwind_component = wind_speed * math.cos(wind_angle)
        if headwind_component > 0:
            return 1.0 + (headwind_component / self.params.max_wind_speed) * 0.8
        else:
            tailwind_component = abs(headwind_component)
            return max(0.7, 1.0 - (tailwind_component / self.params.max_wind_speed) * 0.3)

    def _altitude_factor(self, altitude: float) -> float:
        return 1.0 + (altitude / self.params.max_altitude) * 0.3

    def _speed_factor(self, speed: float) -> float:
        ratio = min(speed / self.params.max_speed, 1.0)
        return 1.0 + ratio * 0.4

    def calculate_power_consumption(
        self,
        payload_weight: float,
        wind_speed: float,
        wind_direction: float,
        altitude: float,
        speed: float,
        flight_direction: float = 0.0,
        aging_factor: float = 1.0
    ) -> float:
        payload_f = self._payload_factor(payload_weight)
        wind_f = self._wind_factor(wind_speed, wind_direction, flight_direction)
        altitude_f = self._altitude_factor(altitude)
        speed_f = self._speed_factor(speed)

        power = self.params.base_power_consumption * payload_f * wind_f * altitude_f * speed_f
        power *= aging_factor

        return power

    def calculate_energy_curve(
        self,
        waypoints: List[Dict[str, Any]],
        total_distance: float,
        payload_weight: float,
        wind_field: Dict[str, Any],
        battery_aging_factor: float = 1.0,
        no_fly_zones: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        curve = []
        cumulative_distance = 0.0
        cumulative_energy_wh = 0.0
        battery_remaining = 100.0

        effective_distance = total_distance
        detour_distance = 0.0
        if no_fly_zones:
            for nfz in no_fly_zones:
                detour = nfz.get('detourDistance', 0)
                effective_distance += detour
                detour_distance += detour

        num_segments = max(50, int(effective_distance * 5))
        segment_distance = effective_distance / num_segments

        sudden_change = wind_field.get('suddenChange')
        has_wind_sudden_change = sudden_change is not None
        wind_sudden_change_point = sudden_change.get('point', 0) if sudden_change else None
        base_wind_speed = wind_field.get('baseWindSpeed', 0)
        new_wind_speed = sudden_change.get('windSpeed', 0) if sudden_change else 0
        wind_speed_increase = (new_wind_speed - base_wind_speed) if sudden_change else 0

        avg_altitude = 100.0
        avg_speed_kmh = 54.0
        if waypoints and len(waypoints) > 0:
            avg_altitude = sum(wp.get('altitude', 100) for wp in waypoints) / len(waypoints)
            speeds = [wp.get('speed', 15) for wp in waypoints]
            avg_speed_ms = sum(speeds) / len(speeds)
            avg_speed_kmh = avg_speed_ms * 3.6

        total_battery_wh = self.params.battery_capacity_wh * (1.0 / battery_aging_factor) if battery_aging_factor > 0 else self.params.battery_capacity_wh

        power_values = []

        for i in range(num_segments + 1):
            current_distance = segment_distance * i
            progress = current_distance / effective_distance if effective_distance > 0 else 0

            current_wind_speed = base_wind_speed
            current_wind_direction = 0.0

            if sudden_change:
                change_point = sudden_change.get('point', 0)
                if current_distance >= change_point:
                    current_wind_speed = sudden_change.get('windSpeed', current_wind_speed)
                    current_wind_direction = sudden_change.get('windDirection', current_wind_direction)

            flight_direction = progress * 180.0

            power = self.calculate_power_consumption(
                payload_weight,
                current_wind_speed,
                current_wind_direction,
                avg_altitude,
                avg_speed_kmh,
                flight_direction,
                battery_aging_factor
            )
            power_values.append(power)

            if i > 0:
                time_hours = segment_distance / avg_speed_kmh if avg_speed_kmh > 0 else 0
                energy_segment_wh = power * time_hours
                cumulative_energy_wh += energy_segment_wh
                battery_remaining = max(0, 100.0 - (cumulative_energy_wh / total_battery_wh * 100))

            curve.append({
                'distance': round(current_distance, 2),
                'energy': round(cumulative_energy_wh, 2),
                'battery': round(battery_remaining, 2),
                'power': round(power, 2),
                'windSpeed': round(current_wind_speed, 2)
            })

        total_energy_wh = cumulative_energy_wh
        energy_per_km = total_energy_wh / effective_distance if effective_distance > 0 else 0

        energy_increase_percentage = 0.0
        if has_wind_sudden_change and wind_speed_increase > 0:
            energy_increase_percentage = (wind_speed_increase / base_wind_speed * 30) if base_wind_speed > 0 else 0

        avg_power = sum(power_values) / len(power_values) if power_values else 0
        max_power = max(power_values) if power_values else 0

        result = {
            'basePowerConsumption': self.params.base_power_consumption,
            'payloadFactor': round(self._payload_factor(payload_weight), 4),
            'windFactor': round(self._wind_factor(base_wind_speed, 0), 4),
            'altitudeFactor': round(self._altitude_factor(avg_altitude), 4),
            'speedFactor': round(self._speed_factor(avg_speed_kmh), 4),
            'totalEnergyRequired': round(total_energy_wh, 2),
            'remainingEnergy': round(max(0, total_battery_wh - total_energy_wh), 2),
            'energyPerKm': round(energy_per_km, 2),
            'effectiveDistance': round(effective_distance, 2),
            'averagePower': round(avg_power, 2),
            'maxPower': round(max_power, 2),
            'curve': curve,
            'hasWindSuddenChange': has_wind_sudden_change,
            'windSuddenChangePoint': wind_sudden_change_point,
            'windSpeedIncrease': round(wind_speed_increase, 2),
            'energyIncreasePercentage': round(energy_increase_percentage, 2),
            'detourDistance': round(detour_distance, 2),
        }

        return result

    def calculate_energy_for_sudden_change(
        self,
        base_energy_curve: Dict[str, Any],
        sudden_change: Dict[str, Any],
        payload_weight: float,
        aging_factor: float = 1.0
    ) -> Dict[str, Any]:
        change_point = sudden_change.get('point', 0)
        new_wind_speed = sudden_change.get('windSpeed', 0)
        new_wind_direction = sudden_change.get('windDirection', 0)

        original_curve = base_energy_curve.get('curve', [])
        new_curve = []
        additional_energy = 0.0

        for point in original_curve:
            if point['distance'] >= change_point:
                wind_increase = new_wind_speed - point.get('windSpeed', 0)
                if wind_increase > 0:
                    power_adjustment = wind_increase * 50 * self._payload_factor(payload_weight) * aging_factor
                    additional_energy += power_adjustment * 0.01

            new_point = dict(point)
            if point['distance'] >= change_point:
                new_point['windSpeed'] = new_wind_speed
                new_point['battery'] = max(0, point['battery'] - additional_energy * 10)
            new_curve.append(new_point)

        return {
            'additionalEnergyRequired': round(additional_energy, 2),
            'adjustedCurve': new_curve,
            'impactDistance': change_point
        }
