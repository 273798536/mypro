import math
from typing import Dict, Any, Optional, List
from dataclasses import dataclass

@dataclass
class ThresholdParams:
    safe_return_margin: float = 15.0
    critical_battery_level: float = 15.0
    low_battery_level: float = 30.0
    max_flight_time: float = 60.0
    hover_power_ratio: float = 1.2
    descent_energy_saving: float = 0.8
    battery_capacity_mah: float = 16000.0
    voltage: float = 48.0

    @property
    def battery_capacity_wh(self):
        return (self.battery_capacity_mah / 1000.0) * self.voltage

class ReturnThresholdCalculator:
    def __init__(self, params: Optional[ThresholdParams] = None):
        self.params = params or ThresholdParams()

    def calculate_return_threshold(
        self,
        energy_model_result: Dict[str, Any],
        total_distance: float,
        current_position: float = 0.0,
        battery_remaining: float = 100.0,
        battery_aging_factor: float = 1.0,
        no_fly_zones: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        total_energy_required = energy_model_result.get('totalEnergyRequired', 0)
        energy_per_km = energy_model_result.get('energyPerKm', 0)
        effective_distance = energy_model_result.get('effectiveDistance', total_distance)

        return_distance_km = effective_distance / 2.0
        remaining_distance_km = effective_distance / 2.0

        battery_capacity_wh = self.params.battery_capacity_wh
        current_energy_wh = (battery_remaining / 100.0) * battery_capacity_wh

        energy_to_return = return_distance_km * energy_per_km if energy_per_km > 0 else 0
        energy_to_continue = remaining_distance_km * energy_per_km if energy_per_km > 0 else 0

        margin_energy = (self.params.safe_return_margin / 100.0) * current_energy_wh
        hover_energy_reserve = total_energy_required * 0.1

        min_battery_for_return = self._calculate_min_battery(
            return_distance_km,
            energy_per_km,
            battery_capacity_wh,
            battery_aging_factor
        )

        max_safe_distance = self._calculate_max_safe_distance(
            current_energy_wh,
            energy_per_km,
            battery_aging_factor
        )

        distance_margin = max(0, max_safe_distance - effective_distance)
        battery_margin = max(0, battery_remaining - min_battery_for_return)

        return {
            'minBatteryLevel': round(min_battery_for_return, 1),
            'maxSafeDistance': round(max_safe_distance, 2),
            'maxFlightTime': round(self.params.max_flight_time * (1 - self.params.safe_return_margin / 100.0), 1),
            'safeReturnMargin': self.params.safe_return_margin,
            'criticalBatteryLevel': self.params.critical_battery_level,
            'lowBatteryLevel': self.params.low_battery_level,
            'currentEnergyWh': round(current_energy_wh, 2),
            'energyToReturn': round(energy_to_return, 2),
            'energyToContinue': round(energy_to_continue, 2),
            'marginEnergy': round(margin_energy, 2),
            'effectiveDistance': round(effective_distance, 2),
            'distanceMargin': round(distance_margin, 2),
            'batteryMargin': round(battery_margin, 1),
            'shouldReturnNow': self._should_return_now(
                current_energy_wh,
                energy_to_return,
                margin_energy,
                hover_energy_reserve,
                battery_remaining
            ),
            'returnUrgency': self._calculate_return_urgency(
                current_energy_wh,
                energy_to_return,
                energy_to_continue,
                battery_remaining
            ),
            'windAdjustmentFactor': 1.0,
        }

    def _calculate_min_battery(
        self,
        return_distance_km: float,
        energy_per_km: float,
        battery_capacity_wh: float,
        aging_factor: float
    ) -> float:
        if return_distance_km <= 0:
            return self.params.critical_battery_level

        energy_needed = return_distance_km * energy_per_km * self.params.hover_power_ratio
        energy_with_margin = energy_needed * (1 + self.params.safe_return_margin / 100.0)

        effective_capacity = battery_capacity_wh
        min_battery = (energy_with_margin / effective_capacity) * 100.0

        return max(self.params.critical_battery_level, min_battery)

    def _calculate_max_safe_distance(
        self,
        current_energy_wh: float,
        energy_per_km: float,
        aging_factor: float
    ) -> float:
        if energy_per_km <= 0:
            return 0.0

        usable_energy = current_energy_wh * (1 - self.params.safe_return_margin / 100.0)
        usable_energy *= self.params.descent_energy_saving

        max_distance_km = usable_energy / energy_per_km * 0.5
        return round(max_distance_km, 2)

    def _should_return_now(
        self,
        current_energy_wh: float,
        energy_to_return: float,
        margin_energy: float,
        hover_energy_reserve: float,
        battery_remaining: float
    ) -> bool:
        total_needed = energy_to_return + margin_energy + hover_energy_reserve
        return current_energy_wh <= total_needed or battery_remaining <= self.params.critical_battery_level

    def _calculate_return_urgency(
        self,
        current_energy_wh: float,
        energy_to_return: float,
        energy_to_continue: float,
        battery_remaining: float
    ) -> str:
        if battery_remaining <= self.params.critical_battery_level:
            return 'critical'
        if battery_remaining <= self.params.low_battery_level:
            return 'high'

        energy_margin = current_energy_wh - energy_to_return - energy_to_continue
        margin_ratio = energy_margin / current_energy_wh if current_energy_wh > 0 else 0

        if margin_ratio < 0.1:
            return 'high'
        elif margin_ratio < 0.25:
            return 'medium'
        else:
            return 'low'

    def calculate_dynamic_threshold(
        self,
        energy_model_result: Dict[str, Any],
        wind_sudden_change: Optional[Dict[str, Any]] = None,
        battery_aging_factor: float = 1.0
    ) -> Dict[str, Any]:
        base_threshold = self.calculate_return_threshold(
            energy_model_result,
            energy_model_result.get('effectiveDistance', 0),
            battery_aging_factor=battery_aging_factor
        )

        if wind_sudden_change:
            impact_distance = wind_sudden_change.get('point', 0)
            base_wind = energy_model_result.get('windFactor', 1.0)
            new_wind_speed = wind_sudden_change.get('windSpeed', 0)
            base_wind_speed = energy_model_result.get('basePowerConsumption', 800) / 800

            if new_wind_speed > 0:
                wind_increase = new_wind_speed - 5
                energy_multiplier = 1.0 + (wind_increase / 15.0) * 0.6
                base_threshold['minBatteryLevel'] = round(base_threshold['minBatteryLevel'] * energy_multiplier, 1)
                base_threshold['maxSafeDistance'] = round(base_threshold['maxSafeDistance'] / energy_multiplier, 2)
                base_threshold['energyToReturn'] = round(base_threshold['energyToReturn'] * energy_multiplier, 2)
                if base_threshold['returnUrgency'] in ['low', 'medium']:
                    base_threshold['returnUrgency'] = 'high'
                base_threshold['windAdjustmentFactor'] = round(energy_multiplier, 3)
                base_threshold['impactPoint'] = impact_distance

        return base_threshold

    def calculate_safety_margins(
        self,
        threshold: Dict[str, Any],
        energy_model_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        total_energy = energy_model_result.get('totalEnergyRequired', 0)
        current_energy = threshold.get('currentEnergyWh', 0)

        energy_safety_margin = ((current_energy - total_energy) / total_energy * 100) if total_energy > 0 else 0
        battery_safety_margin = threshold.get('batteryMargin', 15)

        return {
            'energySafetyMargin': round(energy_safety_margin, 2),
            'batterySafetyMargin': round(battery_safety_margin, 2),
            'distanceSafetyMargin': round(threshold.get('distanceMargin', 0), 2),
            'overallScore': self._calculate_overall_safety_score(
                energy_safety_margin,
                battery_safety_margin,
                threshold.get('returnUrgency', 'low')
            )
        }

    def _calculate_overall_safety_score(
        self,
        energy_margin: float,
        battery_margin: float,
        urgency: str
    ) -> int:
        score = 100
        score -= max(0, -energy_margin * 2)
        score -= max(0, -battery_margin * 1.5)

        urgency_penalty = {'low': 0, 'medium': 15, 'high': 30, 'critical': 50}
        score -= urgency_penalty.get(urgency, 0)

        return max(0, min(100, int(score)))
