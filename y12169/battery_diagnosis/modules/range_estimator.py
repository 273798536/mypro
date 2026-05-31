import uuid
from datetime import datetime
from typing import List, Optional, Tuple
import math

from ..core.models import (
    DataPacket, VehicleProfile, TripRecord, DiagnosisReport,
    RangeEstimate
)
from ..core.config import (
    BASE_CONSUMPTION_KWH_100KM,
    MIN_TRIPS_FOR_RELIABLE_ESTIMATE,
    DEFAULT_ESTIMATE_METHOD
)
from .data_parser import make_source_ref


def calculate_trip_consumption(trip: TripRecord, battery_capacity_kwh: float) -> float:
    if trip.distance_km <= 0:
        return BASE_CONSUMPTION_KWH_100KM

    soc_used = max(0.1, trip.start_soc - trip.end_soc)
    energy_used = (soc_used / 100.0) * battery_capacity_kwh
    consumption = (energy_used / trip.distance_km) * 100.0

    return max(5.0, min(50.0, consumption))


def calculate_weighted_moving_average(
    trips: List[TripRecord],
    battery_capacity_kwh: float,
    window_size: int = 10
) -> Tuple[float, float]:
    if not trips:
        return BASE_CONSUMPTION_KWH_100KM, 0.0

    sorted_trips = sorted(trips, key=lambda t: t.end_time, reverse=True)
    recent_trips = sorted_trips[:window_size]

    consumptions = []
    weights = []

    for i, trip in enumerate(recent_trips):
        consumption = calculate_trip_consumption(trip, battery_capacity_kwh)
        weight = 1.0 / (i + 1)

        if trip.distance_km >= 10:
            weight *= 2.0

        consumptions.append(consumption)
        weights.append(weight)

    if not consumptions:
        return BASE_CONSUMPTION_KWH_100KM, 0.0

    total_weight = sum(weights)
    weighted_avg = sum(c * w for c, w in zip(consumptions, weights)) / total_weight

    if len(consumptions) > 1:
        variance = sum(w * (c - weighted_avg) ** 2 for c, w in zip(consumptions, weights)) / total_weight
        std_dev = math.sqrt(variance)
        cv = std_dev / weighted_avg if weighted_avg > 0 else 1.0
        confidence = max(0.3, 1.0 - cv)
    else:
        confidence = 0.5

    return weighted_avg, confidence


def estimate_battery_health(
    vehicle_profile: VehicleProfile,
    trips: List[TripRecord],
    diagnosis_reports: List[DiagnosisReport]
) -> Tuple[float, List[str]]:
    source_refs = []

    if diagnosis_reports:
        latest_report = max(diagnosis_reports, key=lambda r: r.report_date)
        source_refs.append(make_source_ref(latest_report.source_file, latest_report.source_line))
        return latest_report.current_battery_health, source_refs

    source_refs.append(make_source_ref(vehicle_profile.source_file, vehicle_profile.source_line))

    if not trips:
        return vehicle_profile.initial_battery_health, source_refs

    total_distance = sum(t.distance_km for t in trips)
    if vehicle_profile.total_odometer_km:
        total_distance = max(total_distance, vehicle_profile.total_odometer_km)

    degradation_rate = 0.02 / 10000.0
    estimated_degradation = total_distance * degradation_rate
    estimated_health = max(70.0, vehicle_profile.initial_battery_health - estimated_degradation)

    return estimated_health, source_refs


def adjust_consumption_for_conditions(
    base_consumption: float,
    trips: List[TripRecord]
) -> Tuple[float, List[str]]:
    adjusted = base_consumption
    notes = []

    if not trips:
        return adjusted, notes

    recent_trips = sorted(trips, key=lambda t: t.end_time, reverse=True)[:5]

    avg_temp = sum(t.avg_temp_c for t in recent_trips) / len(recent_trips)
    if avg_temp < 0:
        temp_factor = 1.0 + (abs(avg_temp) * 0.015)
        adjusted *= temp_factor
        notes.append(f"低温环境({avg_temp:.1f}°C)导致能耗增加约{((temp_factor-1)*100):.1f}%")

    avg_speed = sum(t.avg_speed_kmh for t in recent_trips) / len(recent_trips)
    if avg_speed > 80:
        speed_factor = 1.0 + ((avg_speed - 80) * 0.005)
        adjusted *= speed_factor
        notes.append(f"高速行驶({avg_speed:.1f}km/h)导致能耗增加约{((speed_factor-1)*100):.1f}%")

    fast_charge_ratio = sum(1 for t in recent_trips if t.fast_charged_before) / len(recent_trips)
    if fast_charge_ratio > 0.5:
        fc_factor = 1.0 + (fast_charge_ratio * 0.05)
        adjusted *= fc_factor
        notes.append(f"频繁快充({fast_charge_ratio*100:.0f}%行程前快充)导致能耗增加约{((fc_factor-1)*100):.1f}%")

    ac_hours = sum(t.ac_usage_hours or 0 for t in recent_trips)
    if ac_hours > 0:
        ac_factor = 1.0 + (ac_hours * 0.02)
        adjusted *= ac_factor
        notes.append(f"空调使用({ac_hours:.1f}h)导致能耗增加约{((ac_factor-1)*100):.1f}%")

    return adjusted, notes


class RangeEstimator:
    def __init__(self, method: str = DEFAULT_ESTIMATE_METHOD):
        self.method = method

    def estimate(
        self,
        vehicle_profile: VehicleProfile,
        trips: List[TripRecord],
        diagnosis_reports: Optional[List[DiagnosisReport]] = None
    ) -> RangeEstimate:
        diagnosis_reports = diagnosis_reports or []
        source_refs = []

        source_refs.append(make_source_ref(vehicle_profile.source_file, vehicle_profile.source_line))
        for trip in trips[:5]:
            source_refs.append(make_source_ref(trip.source_file, trip.source_line))
        for report in diagnosis_reports[:2]:
            source_refs.append(make_source_ref(report.source_file, report.source_line))

        battery_health, bh_sources = estimate_battery_health(
            vehicle_profile, trips, diagnosis_reports
        )
        source_refs.extend(bh_sources)

        if self.method == "weighted_moving_average" and trips:
            base_consumption, confidence = calculate_weighted_moving_average(
                trips, vehicle_profile.battery_capacity_kwh
            )
        elif self.method == "physics_based":
            base_consumption, confidence = self._physics_based_estimate(trips, vehicle_profile)
        else:
            base_consumption = BASE_CONSUMPTION_KWH_100KM
            confidence = 0.3 if len(trips) < MIN_TRIPS_FOR_RELIABLE_ESTIMATE else 0.6

        adjusted_consumption, _ = adjust_consumption_for_conditions(
            base_consumption, trips
        )

        available_energy = vehicle_profile.battery_capacity_kwh * (battery_health / 100.0)
        nominal_consumption = vehicle_profile.battery_capacity_kwh / vehicle_profile.nominal_range_km * 100

        actual_range = (available_energy / adjusted_consumption) * 100
        nominal_range = (vehicle_profile.battery_capacity_kwh / nominal_consumption) * 100

        if len(trips) >= MIN_TRIPS_FOR_RELIABLE_ESTIMATE:
            confidence = min(1.0, confidence + 0.2)
        else:
            confidence = max(0.3, confidence - 0.2)

        return RangeEstimate(
            vin=vehicle_profile.vin,
            nominal_range_km=round(nominal_range, 1),
            actual_estimated_range_km=round(actual_range, 1),
            battery_health_percent=round(battery_health, 1),
            base_consumption_kwh_100km=round(base_consumption, 2),
            adjusted_consumption_kwh_100km=round(adjusted_consumption, 2),
            confidence_score=round(confidence, 2),
            method=self.method,
            source_refs=list(set(source_refs))[:10]
        )

    def _physics_based_estimate(
        self,
        trips: List[TripRecord],
        vehicle_profile: VehicleProfile
    ) -> Tuple[float, float]:
        if not trips:
            return BASE_CONSUMPTION_KWH_100KM, 0.3

        total_energy = 0
        total_distance = 0

        for trip in trips:
            consumption = calculate_trip_consumption(trip, vehicle_profile.battery_capacity_kwh)
            total_energy += consumption * trip.distance_km / 100
            total_distance += trip.distance_km

        if total_distance > 0:
            avg_consumption = (total_energy / total_distance) * 100
        else:
            avg_consumption = BASE_CONSUMPTION_KWH_100KM

        confidence = min(1.0, len(trips) / MIN_TRIPS_FOR_RELIABLE_ESTIMATE) * 0.8

        return avg_consumption, confidence


def estimate_range(
    packet: DataPacket,
    method: str = DEFAULT_ESTIMATE_METHOD
) -> RangeEstimate:
    if not packet.vehicle_profile:
        raise ValueError("No vehicle profile available for range estimation")

    estimator = RangeEstimator(method=method)
    return estimator.estimate(
        packet.vehicle_profile,
        packet.trip_records,
        packet.diagnosis_reports
    )
