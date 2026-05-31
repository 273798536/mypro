import uuid
from datetime import datetime
from typing import List, Tuple, Dict, Any
from collections import defaultdict

from ..core.models import (
    TripRecord, VehicleProfile, RangeEstimate,
    FactorContribution, AnomalyType
)
from ..core.config import (
    TEMP_THRESHOLD_LOW,
    TEMP_THRESHOLD_VERY_LOW,
    FAST_CHARGE_THRESHOLD_WEEK,
    FAST_CHARGE_RATIO_THRESHOLD,
    TRIP_SPEED_LOW_THRESHOLD,
    TRIP_SPEED_HIGH_THRESHOLD,
    TRIP_DISTANCE_MIN_THRESHOLD,
    TRIP_CONSUMPTION_HIGH_THRESHOLD,
    TRIP_CONSUMPTION_LOW_THRESHOLD,
    TEMP_EFFECT_COEFFICIENT,
    FAST_CHARGE_EFFECT_COEFFICIENT,
    DRIVING_SPEED_EFFECT_COEFFICIENT,
    ELEVATION_EFFECT_COEFFICIENT
)
from .range_estimator import calculate_trip_consumption
from .data_parser import make_source_ref


class FactorAnalyzer:
    def __init__(self):
        self.temp_coeff = TEMP_EFFECT_COEFFICIENT
        self.fast_charge_coeff = FAST_CHARGE_EFFECT_COEFFICIENT
        self.speed_coeff = DRIVING_SPEED_EFFECT_COEFFICIENT
        self.elevation_coeff = ELEVATION_EFFECT_COEFFICIENT

    def analyze_temperature_effect(
        self,
        trips: List[TripRecord],
        nominal_range_km: float,
        base_consumption: float
    ) -> Tuple[float, float, List[str], List[str]]:
        if not trips:
            return 0.0, 0.0, [], []

        cold_trips = [t for t in trips if t.avg_temp_c < TEMP_THRESHOLD_LOW]
        if not cold_trips:
            return 0.0, 0.0, [], []

        total_impact = 0.0
        total_distance = 0.0
        evidence = []
        source_refs = []

        for trip in cold_trips:
            temp_deficit = max(0, TEMP_THRESHOLD_LOW - trip.avg_temp_c)
            effect_factor = temp_deficit * self.temp_coeff
            trip_consumption = calculate_trip_consumption(trip, 70.0)
            consumption_increase = trip_consumption * effect_factor
            range_impact = (consumption_increase / base_consumption) * nominal_range_km

            total_impact += range_impact * trip.distance_km
            total_distance += trip.distance_km

            severity = "严重" if trip.avg_temp_c < TEMP_THRESHOLD_VERY_LOW else "中等"
            evidence.append(
                f"行程[{trip.trip_id}] 温度{trip.avg_temp_c:.1f}°C, "
                f"预计续航减少{range_impact:.1f}km ({severity})"
            )
            source_refs.append(make_source_ref(trip.source_file, trip.source_line))

        avg_impact = total_impact / total_distance if total_distance > 0 else 0
        contribution = min(50.0, (avg_impact / nominal_range_km) * 100)

        very_cold_count = sum(1 for t in cold_trips if t.avg_temp_c < TEMP_THRESHOLD_VERY_LOW)
        summary_evidence = [
            f"共{len(cold_trips)}次低温行程, 其中{very_cold_count}次极寒(< -10°C)",
            f"平均温度{sum(t.avg_temp_c for t in cold_trips)/len(cold_trips):.1f}°C"
        ]

        return avg_impact, contribution, summary_evidence + evidence, source_refs

    def analyze_fast_charging_effect(
        self,
        trips: List[TripRecord],
        nominal_range_km: float,
        base_consumption: float
    ) -> Tuple[float, float, List[str], List[str]]:
        if not trips:
            return 0.0, 0.0, [], []

        fast_charge_trips = [
            t for t in trips
            if t.fast_charging_count_7d >= FAST_CHARGE_THRESHOLD_WEEK
            or t.fast_charged_before
        ]

        if not fast_charge_trips:
            return 0.0, 0.0, [], []

        total_impact = 0.0
        total_distance = 0.0
        evidence = []
        source_refs = []

        for trip in fast_charge_trips:
            fc_count = trip.fast_charging_count_7d
            if fc_count >= FAST_CHARGE_THRESHOLD_WEEK:
                effect_factor = (fc_count - FAST_CHARGE_THRESHOLD_WEEK + 1) * self.fast_charge_coeff
            else:
                effect_factor = self.fast_charge_coeff * 0.5

            trip_consumption = calculate_trip_consumption(trip, 70.0)
            consumption_increase = trip_consumption * effect_factor
            range_impact = (consumption_increase / base_consumption) * nominal_range_km

            total_impact += range_impact * trip.distance_km
            total_distance += trip.distance_km

            evidence.append(
                f"行程[{trip.trip_id}] 7天快充{fc_count}次, "
                f"预计续航减少{range_impact:.1f}km"
            )
            source_refs.append(make_source_ref(trip.source_file, trip.source_line))

        avg_impact = total_impact / total_distance if total_distance > 0 else 0
        contribution = min(30.0, (avg_impact / nominal_range_km) * 100)

        high_fc_count = sum(
            1 for t in trips
            if t.fast_charging_count_7d >= FAST_CHARGE_THRESHOLD_WEEK
        )
        fc_ratio = len(fast_charge_trips) / len(trips) if trips else 0

        summary_evidence = [
            f"共{high_fc_count}次行程周快充次数≥{FAST_CHARGE_THRESHOLD_WEEK}次",
            f"快充行程占比{fc_ratio*100:.0f}%"
        ]

        return avg_impact, contribution, summary_evidence + evidence, source_refs

    def analyze_driving_habit_effect(
        self,
        trips: List[TripRecord],
        nominal_range_km: float,
        base_consumption: float
    ) -> Tuple[float, float, List[str], List[str]]:
        if not trips:
            return 0.0, 0.0, [], []

        total_impact = 0.0
        total_distance = 0.0
        evidence = []
        source_refs = []
        aggressive_count = 0

        for trip in trips:
            speed_effect = max(0, trip.avg_speed_kmh - 80) * self.speed_coeff
            elevation_effect = (trip.elevation_gain_m or 0) * self.elevation_coeff
            ac_effect = (trip.ac_usage_hours or 0) * 0.01

            total_effect = speed_effect + elevation_effect + ac_effect

            if total_effect > 0.05:
                aggressive_count += 1
                trip_consumption = calculate_trip_consumption(trip, 70.0)
                consumption_increase = trip_consumption * total_effect
                range_impact = (consumption_increase / base_consumption) * nominal_range_km

                total_impact += range_impact * trip.distance_km
                total_distance += trip.distance_km

                factors = []
                if speed_effect > 0:
                    factors.append(f"高速+{speed_effect*100:.1f}%")
                if elevation_effect > 0:
                    factors.append(f"爬坡+{elevation_effect*100:.1f}%")
                if ac_effect > 0:
                    factors.append(f"空调+{ac_effect*100:.1f}%")

                evidence.append(
                    f"行程[{trip.trip_id}] {', '.join(factors)}, "
                    f"预计续航减少{range_impact:.1f}km"
                )
                source_refs.append(make_source_ref(trip.source_file, trip.source_line))

        if total_distance == 0:
            return 0.0, 0.0, [], []

        avg_impact = total_impact / total_distance
        contribution = min(40.0, (avg_impact / nominal_range_km) * 100)

        summary_evidence = [
            f"共{aggressive_count}次行程存在激进驾驶或高能耗因素",
            f"占总行程的{aggressive_count/len(trips)*100:.0f}%"
        ]

        return avg_impact, contribution, summary_evidence + evidence, source_refs

    def analyze_battery_degradation_effect(
        self,
        vehicle_profile: VehicleProfile,
        range_estimate: RangeEstimate
    ) -> Tuple[float, float, List[str], List[str]]:
        health_loss = vehicle_profile.initial_battery_health - range_estimate.battery_health_percent

        if health_loss <= 5:
            return 0.0, 0.0, [], []

        source_refs = [make_source_ref(vehicle_profile.source_file, vehicle_profile.source_line)]

        impact = (health_loss / 100) * range_estimate.nominal_range_km
        contribution = min(40.0, (impact / range_estimate.nominal_range_km) * 100)

        evidence = [
            f"电池健康度从{vehicle_profile.initial_battery_health:.1f}%降至{range_estimate.battery_health_percent:.1f}%",
            f"衰减{health_loss:.1f}%, 影响续航约{impact:.1f}km"
        ]

        return impact, contribution, evidence, source_refs


def decompose_factors(
    vehicle_profile: VehicleProfile,
    trips: List[TripRecord],
    range_estimate: RangeEstimate
) -> List[FactorContribution]:
    analyzer = FactorAnalyzer()
    base_consumption = range_estimate.base_consumption_kwh_100km
    nominal_range = range_estimate.nominal_range_km

    factors = []

    temp_impact, temp_contrib, temp_evidence, temp_sources = analyzer.analyze_temperature_effect(
        trips, nominal_range, base_consumption
    )
    if temp_contrib > 1:
        factors.append(FactorContribution(
            factor=AnomalyType.LOW_TEMPERATURE,
            contribution_percent=round(temp_contrib, 1),
            impact_range_km=round(temp_impact, 1),
            evidence=temp_evidence,
            source_refs=temp_sources[:5]
        ))

    fc_impact, fc_contrib, fc_evidence, fc_sources = analyzer.analyze_fast_charging_effect(
        trips, nominal_range, base_consumption
    )
    if fc_contrib > 1:
        factors.append(FactorContribution(
            factor=AnomalyType.FAST_CHARGING_EXCESS,
            contribution_percent=round(fc_contrib, 1),
            impact_range_km=round(fc_impact, 1),
            evidence=fc_evidence,
            source_refs=fc_sources[:5]
        ))

    dh_impact, dh_contrib, dh_evidence, dh_sources = analyzer.analyze_driving_habit_effect(
        trips, nominal_range, base_consumption
    )
    if dh_contrib > 1:
        factors.append(FactorContribution(
            factor=AnomalyType.DRIVING_HABIT,
            contribution_percent=round(dh_contrib, 1),
            impact_range_km=round(dh_impact, 1),
            evidence=dh_evidence,
            source_refs=dh_sources[:5]
        ))

    bd_impact, bd_contrib, bd_evidence, bd_sources = analyzer.analyze_battery_degradation_effect(
        vehicle_profile, range_estimate
    )
    if bd_contrib > 1:
        factors.append(FactorContribution(
            factor=AnomalyType.BATTERY_DEGRADATION,
            contribution_percent=round(bd_contrib, 1),
            impact_range_km=round(bd_impact, 1),
            evidence=bd_evidence,
            source_refs=bd_sources
        ))

    total_contrib = sum(f.contribution_percent for f in factors)
    if total_contrib > 0 and total_contrib != 100:
        scale = 100 / total_contrib
        for f in factors:
            f.contribution_percent = round(f.contribution_percent * scale, 1)

    factors.sort(key=lambda x: x.contribution_percent, reverse=True)

    return factors
