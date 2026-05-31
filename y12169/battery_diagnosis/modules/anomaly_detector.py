import uuid
from datetime import datetime
from typing import List, Dict, Any, Tuple
from collections import defaultdict

from ..core.models import (
    TripRecord, VehicleProfile, DiagnosisReport,
    AnomalyInstance, AnomalyType, RangeEstimate, FactorContribution
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
    TRIP_CONSUMPTION_LOW_THRESHOLD
)
from .range_estimator import calculate_trip_consumption
from .data_parser import make_source_ref


def get_severity(score: float) -> str:
    if score >= 0.8:
        return "critical"
    elif score >= 0.6:
        return "high"
    elif score >= 0.3:
        return "medium"
    else:
        return "low"


class AnomalyDetector:
    def __init__(self):
        self.anomaly_trip_groups: Dict[str, List[str]] = defaultdict(list)

    def _is_valid_trip(self, trip: TripRecord) -> Tuple[bool, List[str]]:
        issues = []

        if trip.distance_km < TRIP_DISTANCE_MIN_THRESHOLD:
            issues.append(f"行程距离过短({trip.distance_km:.1f}km < {TRIP_DISTANCE_MIN_THRESHOLD}km)")

        if trip.avg_speed_kmh < TRIP_SPEED_LOW_THRESHOLD:
            issues.append(f"平均速度过低({trip.avg_speed_kmh:.1f}km/h)")

        if trip.avg_speed_kmh > TRIP_SPEED_HIGH_THRESHOLD:
            issues.append(f"平均速度过高({trip.avg_speed_kmh:.1f}km/h)")

        if trip.start_soc <= trip.end_soc:
            issues.append(f"SOC未下降({trip.start_soc:.1f}% -> {trip.end_soc:.1f}%)")

        return len(issues) == 0, issues

    def detect_low_temperature_anomalies(
        self,
        trips: List[TripRecord],
        nominal_range_km: float,
        base_consumption: float
    ) -> List[AnomalyInstance]:
        anomalies = []

        cold_trips = sorted(
            [t for t in trips if t.avg_temp_c < TEMP_THRESHOLD_LOW],
            key=lambda t: t.avg_temp_c
        )

        if not cold_trips:
            return anomalies

        grouped_by_week = defaultdict(list)
        for trip in cold_trips:
            week_key = trip.start_time.strftime("%Y-%W")
            grouped_by_week[week_key].append(trip)

        for week_key, week_trips in grouped_by_week.items():
            if len(week_trips) < 2:
                continue

            avg_temp = sum(t.avg_temp_c for t in week_trips) / len(week_trips)
            very_cold_count = sum(1 for t in week_trips if t.avg_temp_c < TEMP_THRESHOLD_VERY_LOW)

            severity_score = 0.3 + (abs(avg_temp) / 30) * 0.5 + (very_cold_count / len(week_trips)) * 0.2
            severity = get_severity(severity_score)

            total_impact = 0.0
            evidence = []
            source_refs = []
            trip_ids = []

            for trip in week_trips:
                valid, issues = self._is_valid_trip(trip)
                if not valid:
                    continue

                temp_deficit = max(0, TEMP_THRESHOLD_LOW - trip.avg_temp_c)
                effect_factor = temp_deficit * 0.005
                trip_consumption = calculate_trip_consumption(trip, 70.0)
                consumption_increase = trip_consumption * effect_factor
                range_impact = (consumption_increase / base_consumption) * nominal_range_km
                total_impact += range_impact

                evidence.append({
                    "trip_id": trip.trip_id,
                    "date": trip.start_time.strftime("%Y-%m-%d"),
                    "temp_c": round(trip.avg_temp_c, 1),
                    "consumption_kwh_100km": round(trip_consumption, 1),
                    "range_impact_km": round(range_impact, 1)
                })
                source_refs.append(make_source_ref(trip.source_file, trip.source_line))
                trip_ids.append(trip.trip_id)

            if trip_ids:
                group_key = f"low_temp_{week_key}"
                self.anomaly_trip_groups[group_key] = trip_ids

                anomalies.append(AnomalyInstance(
                    anomaly_id=str(uuid.uuid4()),
                    anomaly_type=AnomalyType.LOW_TEMPERATURE,
                    severity=severity,
                    description=(
                        f"{week_key} 期间共{len(week_trips)}次低温行驶, "
                        f"平均温度{avg_temp:.1f}°C, "
                        f"其中{very_cold_count}次极寒天气(< -10°C)"
                    ),
                    detected_at=max(t.end_time for t in week_trips),
                    affected_range_km=round(total_impact / len(trip_ids), 1),
                    evidence=evidence,
                    source_refs=list(set(source_refs))[:5],
                    trip_ids=trip_ids
                ))

        return anomalies

    def detect_fast_charging_anomalies(
        self,
        trips: List[TripRecord],
        nominal_range_km: float,
        base_consumption: float
    ) -> List[AnomalyInstance]:
        anomalies = []

        fc_trips = [
            t for t in trips
            if t.fast_charging_count_7d >= FAST_CHARGE_THRESHOLD_WEEK
            or t.fast_charged_before
        ]

        if not fc_trips:
            return anomalies

        grouped_by_week = defaultdict(list)
        for trip in fc_trips:
            week_key = trip.start_time.strftime("%Y-%W")
            grouped_by_week[week_key].append(trip)

        for week_key, week_trips in grouped_by_week.items():
            high_fc_trips = [t for t in week_trips if t.fast_charging_count_7d >= FAST_CHARGE_THRESHOLD_WEEK]

            if len(high_fc_trips) < 2:
                continue

            all_trips_week = [t for t in trips if t.start_time.strftime("%Y-%W") == week_key]
            fc_ratio = len(week_trips) / len(all_trips_week) if all_trips_week else 0

            severity_score = 0.3 + (len(high_fc_trips) / 5) * 0.4 + (fc_ratio / 0.8) * 0.3
            severity = get_severity(severity_score)

            total_impact = 0.0
            evidence = []
            source_refs = []
            trip_ids = []

            for trip in high_fc_trips:
                valid, issues = self._is_valid_trip(trip)
                if not valid:
                    continue

                fc_count = trip.fast_charging_count_7d
                effect_factor = (fc_count - FAST_CHARGE_THRESHOLD_WEEK + 1) * 0.02
                trip_consumption = calculate_trip_consumption(trip, 70.0)
                consumption_increase = trip_consumption * effect_factor
                range_impact = (consumption_increase / base_consumption) * nominal_range_km
                total_impact += range_impact

                evidence.append({
                    "trip_id": trip.trip_id,
                    "date": trip.start_time.strftime("%Y-%m-%d"),
                    "fast_charging_count_7d": fc_count,
                    "fast_charged_before": trip.fast_charged_before,
                    "range_impact_km": round(range_impact, 1)
                })
                source_refs.append(make_source_ref(trip.source_file, trip.source_line))
                trip_ids.append(trip.trip_id)

            if trip_ids:
                group_key = f"fast_charge_{week_key}"
                existing_trips = set(self.anomaly_trip_groups.get("low_temp_" + week_key, []))
                unique_trips = [t for t in trip_ids if t not in existing_trips]

                if unique_trips:
                    self.anomaly_trip_groups[group_key] = unique_trips

                    anomalies.append(AnomalyInstance(
                        anomaly_id=str(uuid.uuid4()),
                        anomaly_type=AnomalyType.FAST_CHARGING_EXCESS,
                        severity=severity,
                        description=(
                            f"{week_key} 期间{len(high_fc_trips)}次行程周快充≥{FAST_CHARGE_THRESHOLD_WEEK}次, "
                            f"快充行程占比{fc_ratio*100:.0f}%"
                        ),
                        detected_at=max(t.end_time for t in high_fc_trips),
                        affected_range_km=round(total_impact / len(trip_ids), 1),
                        evidence=evidence,
                        source_refs=list(set(source_refs))[:5],
                        trip_ids=unique_trips
                    ))

        return anomalies

    def detect_abnormal_trip_anomalies(
        self,
        trips: List[TripRecord],
        nominal_range_km: float,
        base_consumption: float
    ) -> List[AnomalyInstance]:
        anomalies = []
        abnormal_trips = []

        for trip in trips:
            valid, issues = self._is_valid_trip(trip)
            if valid:
                consumption = calculate_trip_consumption(trip, 70.0)
                if consumption > TRIP_CONSUMPTION_HIGH_THRESHOLD or consumption < TRIP_CONSUMPTION_LOW_THRESHOLD:
                    issues.append(f"能耗异常({consumption:.1f}kWh/100km)")
                    valid = False

            if not valid and trip.distance_km >= TRIP_DISTANCE_MIN_THRESHOLD:
                abnormal_trips.append((trip, issues))

        if not abnormal_trips:
            return anomalies

        used_trip_ids = set()
        for trips_list in self.anomaly_trip_groups.values():
            used_trip_ids.update(trips_list)

        unique_abnormal = [
            (t, issues) for t, issues in abnormal_trips
            if t.trip_id not in used_trip_ids
        ]

        if not unique_abnormal:
            return anomalies

        high_consumption = [
            (t, issues) for t, issues in unique_abnormal
            if any("能耗异常" in i for i in issues)
        ]

        if high_consumption:
            total_impact = 0.0
            evidence = []
            source_refs = []
            trip_ids = []

            for trip, issues in high_consumption:
                consumption = calculate_trip_consumption(trip, 70.0)
                excess = consumption - TRIP_CONSUMPTION_HIGH_THRESHOLD
                range_impact = (excess / base_consumption) * nominal_range_km
                total_impact += max(0, range_impact)

                evidence.append({
                    "trip_id": trip.trip_id,
                    "date": trip.start_time.strftime("%Y-%m-%d"),
                    "issues": issues,
                    "consumption_kwh_100km": round(consumption, 1),
                    "speed_kmh": round(trip.avg_speed_kmh, 1),
                    "range_impact_km": round(max(0, range_impact), 1)
                })
                source_refs.append(make_source_ref(trip.source_file, trip.source_line))
                trip_ids.append(trip.trip_id)

            if trip_ids:
                severity_score = 0.4 + (len(trip_ids) / 10) * 0.4
                severity = get_severity(severity_score)

                group_key = f"abnormal_trip_high_consumption"
                self.anomaly_trip_groups[group_key] = trip_ids

                anomalies.append(AnomalyInstance(
                    anomaly_id=str(uuid.uuid4()),
                    anomaly_type=AnomalyType.ABNORMAL_TRIP,
                    severity=severity,
                    description=(
                        f"检测到{len(trip_ids)}次行程能耗异常偏高, "
                        f"超过阈值{TRIP_CONSUMPTION_HIGH_THRESHOLD}kWh/100km"
                    ),
                    detected_at=max(t.end_time for t, _ in high_consumption),
                    affected_range_km=round(total_impact / len(trip_ids), 1),
                    evidence=evidence,
                    source_refs=list(set(source_refs))[:5],
                    trip_ids=trip_ids
                ))

        other_abnormal = [
            (t, issues) for t, issues in unique_abnormal
            if t.trip_id not in used_trip_ids and not any("能耗异常" in i for i in issues)
        ]

        if other_abnormal:
            evidence = []
            source_refs = []
            trip_ids = []

            for trip, issues in other_abnormal:
                evidence.append({
                    "trip_id": trip.trip_id,
                    "date": trip.start_time.strftime("%Y-%m-%d"),
                    "issues": issues,
                    "distance_km": round(trip.distance_km, 1),
                    "speed_kmh": round(trip.avg_speed_kmh, 1)
                })
                source_refs.append(make_source_ref(trip.source_file, trip.source_line))
                trip_ids.append(trip.trip_id)

            if trip_ids:
                severity = "low"

                group_key = f"abnormal_trip_quality"
                self.anomaly_trip_groups[group_key] = trip_ids

                anomalies.append(AnomalyInstance(
                    anomaly_id=str(uuid.uuid4()),
                    anomaly_type=AnomalyType.ABNORMAL_TRIP,
                    severity=severity,
                    description=(
                        f"检测到{len(trip_ids)}次行程数据质量问题, "
                        f"可能影响续航估算准确性"
                    ),
                    detected_at=max(t.end_time for t, _ in other_abnormal),
                    affected_range_km=0.0,
                    evidence=evidence,
                    source_refs=list(set(source_refs))[:5],
                    trip_ids=trip_ids
                ))

        return anomalies

    def detect_all_anomalies(
        self,
        vehicle_profile: VehicleProfile,
        trips: List[TripRecord],
        range_estimate: RangeEstimate,
        factor_breakdown: List[FactorContribution]
    ) -> List[AnomalyInstance]:
        self.anomaly_trip_groups.clear()

        nominal_range = range_estimate.nominal_range_km
        base_consumption = range_estimate.base_consumption_kwh_100km

        all_anomalies = []

        temp_anomalies = self.detect_low_temperature_anomalies(
            trips, nominal_range, base_consumption
        )
        all_anomalies.extend(temp_anomalies)

        fc_anomalies = self.detect_fast_charging_anomalies(
            trips, nominal_range, base_consumption
        )
        all_anomalies.extend(fc_anomalies)

        trip_anomalies = self.detect_abnormal_trip_anomalies(
            trips, nominal_range, base_consumption
        )
        all_anomalies.extend(trip_anomalies)

        if range_estimate.battery_health_percent < 90:
            bd_factor = next(
                (f for f in factor_breakdown if f.factor == AnomalyType.BATTERY_DEGRADATION),
                None
            )
            if bd_factor:
                severity_score = (100 - range_estimate.battery_health_percent) / 30
                severity = get_severity(severity_score)

                all_anomalies.append(AnomalyInstance(
                    anomaly_id=str(uuid.uuid4()),
                    anomaly_type=AnomalyType.BATTERY_DEGRADATION,
                    severity=severity,
                    description=(
                        f"电池健康度{range_estimate.battery_health_percent:.1f}%, "
                        f"较初始值衰减{100 - range_estimate.battery_health_percent:.1f}%"
                    ),
                    detected_at=datetime.now(),
                    affected_range_km=bd_factor.impact_range_km,
                    evidence=[{
                        "initial_health": vehicle_profile.initial_battery_health,
                        "current_health": range_estimate.battery_health_percent,
                        "degradation_percent": round(100 - range_estimate.battery_health_percent, 1)
                    }],
                    source_refs=[make_source_ref(vehicle_profile.source_file, vehicle_profile.source_line)],
                    trip_ids=[]
                ))

        return all_anomalies


def detect_anomalies(
    vehicle_profile: VehicleProfile,
    trips: List[TripRecord],
    range_estimate: RangeEstimate,
    factor_breakdown: List[FactorContribution]
) -> List[AnomalyInstance]:
    detector = AnomalyDetector()
    return detector.detect_all_anomalies(vehicle_profile, trips, range_estimate, factor_breakdown)
