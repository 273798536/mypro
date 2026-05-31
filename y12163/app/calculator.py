import math
from typing import Optional
from app.models import RiskLevel, WarningDetail

BEARING_COEFFICIENT = 16.0

PERSON_WEIGHT_KG = 75.0

SPARSE_POINT_THRESHOLD = 3

TEMP_SPIKE_THRESHOLD_C = 5.0
TEMP_SPIKE_WINDOW_HOURS = 24

THICKNESS_RISK_THRESHOLDS = [
    (5.0, RiskLevel.DANGER),
    (10.0, RiskLevel.HIGH_RISK),
    (15.0, RiskLevel.MODERATE),
    (20.0, RiskLevel.LOW_RISK),
    (float("inf"), RiskLevel.SAFE),
]

TEMP_DEGRADATION_FACTORS = {
    (0.0, 0.3),
    (5.0, 0.5),
    (10.0, 0.7),
    (20.0, 0.85),
}


def calc_safe_load(thickness_cm: float) -> float:
    return BEARING_COEFFICIENT * thickness_cm * thickness_cm


def calc_risk_level(thickness_cm: float) -> RiskLevel:
    for threshold, level in THICKNESS_RISK_THRESHOLDS:
        if thickness_cm < threshold:
            return level
    return RiskLevel.SAFE


def calc_temp_degradation(spike_magnitude_c: float) -> float:
    for threshold, factor in sorted(TEMP_DEGRADATION_FACTORS, reverse=True):
        if spike_magnitude_c >= threshold:
            return factor
    return 1.0


def check_sparse_points(measurement_count: int, zone_name: str) -> Optional[WarningDetail]:
    if measurement_count < SPARSE_POINT_THRESHOLD:
        return WarningDetail(
            code="SPARSE_POINTS",
            message=f"zone '{zone_name}' only has {measurement_count} measurement point(s), below minimum {SPARSE_POINT_THRESHOLD}",
            suggestion=f"add at least {SPARSE_POINT_THRESHOLD - measurement_count} more measurement point(s) in zone '{zone_name}'; prioritize areas near shore, mid-lake, and known thin-ice zones before making any activity decision"
        )
    return None


def check_temperature_spike(
    spike_magnitude_c: float, zone_name: str, current_thickness: float
) -> Optional[WarningDetail]:
    if spike_magnitude_c < TEMP_SPIKE_THRESHOLD_C:
        return None
    degradation = calc_temp_degradation(spike_magnitude_c)
    effective_thickness = current_thickness * (1.0 - degradation)
    return WarningDetail(
        code="TEMPERATURE_SPIKE",
        message=f"temperature rose {spike_magnitude_c:.1f}C in {TEMP_SPIKE_WINDOW_HOURS}h, ice effective bearing degrades by {degradation*100:.0f}%",
        suggestion=(
            f"effective ice thickness estimated at {effective_thickness:.1f}cm (down from {current_thickness:.1f}cm); "
            f"reduce activity to below {calc_safe_load(effective_thickness):.0f}kg total load; "
            f"re-measure ice thickness within 6 hours; "
            f"if air temperature stays above 0C for another 12h, consider suspending all on-ice activity in zone '{zone_name}'"
        )
    )


def check_overcapacity(
    planned_count: int, max_safe_load_kg: float, zone_name: str
) -> Optional[WarningDetail]:
    planned_load = planned_count * PERSON_WEIGHT_KG
    if planned_load <= max_safe_load_kg:
        return None
    max_safe_people = math.floor(max_safe_load_kg / PERSON_WEIGHT_KG)
    return WarningDetail(
        code="OVERCAPACITY",
        message=f"zone '{zone_name}' planned {planned_count} people ({planned_load:.0f}kg) exceeds safe load {max_safe_load_kg:.0f}kg",
        suggestion=(
            f"reduce headcount to {max_safe_people} people or fewer for zone '{zone_name}'; "
            f"alternatively, split activity across multiple zones; "
            f"if headcount cannot be reduced, add supplemental ice thickness measurements and re-assess before proceeding"
        )
    )


def assess_zone(
    zone_name: str,
    measurements: list[dict],
    temp_spike_magnitude: float,
    planned_count: int,
) -> dict:
    count = len(measurements)
    sparse_warning = check_sparse_points(count, zone_name)

    if count == 0:
        return {
            "zone_name": zone_name,
            "risk_level": RiskLevel.DANGER,
            "avg_thickness_cm": None,
            "min_thickness_cm": None,
            "max_safe_load_kg": 0.0,
            "current_load_kg": planned_count * PERSON_WEIGHT_KG if planned_count else 0.0,
            "safety_margin": None,
            "measurement_count": 0,
            "sparse_point_warning": sparse_warning or WarningDetail(
                code="SPARSE_POINTS",
                message=f"zone '{zone_name}' has no measurement data",
                suggestion=f"do not allow any activity in zone '{zone_name}' until at least {SPARSE_POINT_THRESHOLD} measurement points are recorded"
            ),
            "temperature_warning": None,
            "overcapacity_warning": WarningDetail(
                code="OVERCAPACITY",
                message=f"zone '{zone_name}' cannot be assessed for load without measurement data",
                suggestion=f"do not permit entry to zone '{zone_name}' until ice thickness is measured"
            ) if planned_count > 0 else None,
            "recommendations": [
                f"zone '{zone_name}' has no ice thickness data — treat as DANGER until measured",
                f"record at least {SPARSE_POINT_THRESHOLD} measurement points before any activity"
            ],
        }

    thicknesses = [m["ice_thickness_cm"] for m in measurements]
    avg_thickness = sum(thicknesses) / len(thicknesses)
    min_thickness = min(thicknesses)

    temp_warning = check_temperature_spike(temp_spike_magnitude, zone_name, min_thickness)

    effective_min = min_thickness
    if temp_spike_magnitude >= TEMP_SPIKE_THRESHOLD_C:
        degradation = calc_temp_degradation(temp_spike_magnitude)
        effective_min = min_thickness * (1.0 - degradation)

    risk_level = calc_risk_level(effective_min)
    max_safe_load = calc_safe_load(effective_min)
    current_load = planned_count * PERSON_WEIGHT_KG if planned_count else 0.0
    safety_margin = (max_safe_load - current_load) / max_safe_load if max_safe_load > 0 else -1.0

    overcap_warning = check_overcapacity(planned_count, max_safe_load, zone_name) if planned_count > 0 else None

    recs = []
    if sparse_warning:
        recs.append(sparse_warning.suggestion)
    if temp_warning:
        recs.append(temp_warning.suggestion)
    if overcap_warning:
        recs.append(overcap_warning.suggestion)
    if not recs:
        if risk_level == RiskLevel.SAFE:
            recs.append(f"zone '{zone_name}' is assessed as SAFE for current planned activity; continue monitoring ice conditions")
        elif risk_level == RiskLevel.LOW_RISK:
            recs.append(f"zone '{zone_name}' has low risk; maintain current precautions and re-check thickness every 4 hours")
        else:
            recs.append(f"zone '{zone_name}' risk level is {risk_level.value}; consider additional safety measures before proceeding")

    return {
        "zone_name": zone_name,
        "risk_level": risk_level,
        "avg_thickness_cm": round(avg_thickness, 2),
        "min_thickness_cm": round(min_thickness, 2),
        "max_safe_load_kg": round(max_safe_load, 2),
        "current_load_kg": round(current_load, 2),
        "safety_margin": round(safety_margin, 4),
        "measurement_count": count,
        "sparse_point_warning": sparse_warning,
        "temperature_warning": temp_warning,
        "overcapacity_warning": overcap_warning,
        "recommendations": recs,
    }
