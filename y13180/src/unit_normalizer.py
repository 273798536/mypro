from src.config import (
    FLOW_UNIT_TO_M3H,
    DIAMETER_UNIT_TO_MM,
    TEMP_UNIT_TO_DEGC,
    VELOCITY_UNIT_TO_MS,
    THRESHOLDS,
    FAILURE_REASONS,
)


def _parse_float(value_str):
    if value_str is None or str(value_str).strip() == "":
        return None
    try:
        return float(str(value_str).strip())
    except (ValueError, TypeError):
        return None


def _convert_unit(value, unit_str, unit_map, value_name):
    if value is None:
        return None, [f"{FAILURE_REASONS['field_missing']}:{value_name}数值缺失"]
    if unit_str is None or str(unit_str).strip() == "":
        return None, [f"{FAILURE_REASONS['field_missing']}:{value_name}单位缺失"]
    unit_key = str(unit_str).strip()
    factor = unit_map.get(unit_key)
    if factor is None:
        return None, [f"{FAILURE_REASONS['unit_unknown']}:{value_name}单位'{unit_key}'无法识别"]
    converted = value * factor
    return converted, []


def normalize_units(records):
    for rec in records:
        raw = rec["raw_data"]
        reasons = []
        normalized = {}

        flow_val = _parse_float(raw.get("water_flow", ""))
        flow_unit = raw.get("flow_unit", "")
        flow_norm, flow_errs = _convert_unit(flow_val, flow_unit, FLOW_UNIT_TO_M3H, "水流量")
        if flow_norm is not None:
            normalized["water_flow_m3h"] = flow_norm
            if not (THRESHOLDS["water_flow_min"] <= flow_norm <= THRESHOLDS["water_flow_max"]):
                reasons.append(
                    f"{FAILURE_REASONS['threshold_flow_out']}:{flow_norm:.2f}m³/h超出[{THRESHOLDS['water_flow_min']},{THRESHOLDS['water_flow_max']}]"
                )
            if flow_unit and flow_unit.strip() not in ["m3/h", "m^3/h"]:
                normalized["flow_conversion_from"] = f"{flow_val}{flow_unit}"
                normalized["flow_conversion_factor"] = FLOW_UNIT_TO_M3H.get(flow_unit.strip(), "?")
        reasons.extend(flow_errs)

        diam_val = _parse_float(raw.get("droplet_diameter", ""))
        diam_unit = raw.get("diameter_unit", "")
        diam_norm, diam_errs = _convert_unit(diam_val, diam_unit, DIAMETER_UNIT_TO_MM, "水滴直径")
        if diam_norm is not None:
            normalized["droplet_diameter_mm"] = diam_norm
            if not (THRESHOLDS["droplet_diameter_min"] <= diam_norm <= THRESHOLDS["droplet_diameter_max"]):
                reasons.append(
                    f"{FAILURE_REASONS['threshold_diameter_out']}:{diam_norm:.2f}mm超出[{THRESHOLDS['droplet_diameter_min']},{THRESHOLDS['droplet_diameter_max']}]"
                )
        reasons.extend(diam_errs)

        temp_val = _parse_float(raw.get("water_temperature", ""))
        temp_unit = raw.get("temp_unit", "")
        temp_norm, temp_errs = _convert_unit(temp_val, temp_unit, TEMP_UNIT_TO_DEGC, "水温")
        if temp_norm is not None:
            normalized["water_temperature_degC"] = temp_norm
            if not (THRESHOLDS["water_temp_min"] <= temp_norm <= THRESHOLDS["water_temp_max"]):
                reasons.append(
                    f"{FAILURE_REASONS['threshold_temp_out']}:{temp_norm:.2f}℃超出[{THRESHOLDS['water_temp_min']},{THRESHOLDS['water_temp_max']}]"
                )
        reasons.extend(temp_errs)

        vel_val = _parse_float(raw.get("air_velocity", ""))
        vel_unit = raw.get("velocity_unit", "")
        vel_norm, vel_errs = _convert_unit(vel_val, vel_unit, VELOCITY_UNIT_TO_MS, "风速")
        if vel_norm is not None:
            normalized["air_velocity_ms"] = vel_norm
            if not (THRESHOLDS["air_velocity_min"] <= vel_norm <= THRESHOLDS["air_velocity_max"]):
                reasons.append(
                    f"{FAILURE_REASONS['threshold_velocity_out']}:{vel_norm:.2f}m/s超出[{THRESHOLDS['air_velocity_min']},{THRESHOLDS['air_velocity_max']}]"
                )
        reasons.extend(vel_errs)

        rec["normalized"] = normalized
        rec["failure_reasons"].extend(reasons)
        if reasons:
            rec["processing_status"] = "unit_or_threshold_issue"
        else:
            rec["processing_status"] = "normalized"

    return records


def save_normalized_report(records, output_path):
    import csv
    fieldnames = [
        "record_id",
        "device_id",
        "timestamp",
        "source_file",
        "water_flow_m3h",
        "flow_conversion_from",
        "flow_conversion_factor",
        "droplet_diameter_mm",
        "water_temperature_degC",
        "air_velocity_ms",
        "processing_status",
        "failure_reasons",
    ]
    with open(output_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for rec in records:
            n = rec["normalized"]
            writer.writerow({
                "record_id": rec["record_id"],
                "device_id": rec["device_id"],
                "timestamp": rec["timestamp"],
                "source_file": rec["source_file"],
                "water_flow_m3h": n.get("water_flow_m3h", ""),
                "flow_conversion_from": n.get("flow_conversion_from", ""),
                "flow_conversion_factor": n.get("flow_conversion_factor", ""),
                "droplet_diameter_mm": n.get("droplet_diameter_mm", ""),
                "water_temperature_degC": n.get("water_temperature_degC", ""),
                "air_velocity_ms": n.get("air_velocity_ms", ""),
                "processing_status": rec["processing_status"],
                "failure_reasons": " | ".join(rec["failure_reasons"]),
            })
