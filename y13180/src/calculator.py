from src.config import CALCULATION_FORMULAS, THRESHOLDS, FAILURE_REASONS


def calculate_heat_dissipation(records):
    k = CALCULATION_FORMULAS["k_value"]
    formula = CALCULATION_FORMULAS["heat_dissipation"]

    for rec in records:
        n = rec["normalized"]
        calculated = {
            "formula_used": formula,
            "k_value": k,
        }

        flow = n.get("water_flow_m3h")
        temp = n.get("water_temperature_degC")
        diam = n.get("droplet_diameter_mm")

        missing_params = []
        if flow is None:
            missing_params.append("water_flow")
        if temp is None:
            missing_params.append("water_temperature")
        if diam is None:
            missing_params.append("droplet_diameter")

        if missing_params:
            reason = f"{FAILURE_REASONS['formula_param_missing']}:缺少参数{','.join(missing_params)}"
            rec["failure_reasons"].append(reason)
            if rec["processing_status"] in ["normalized", "calculation_failed", "pending"]:
                rec["processing_status"] = "calculation_failed"
            calculated["calculation_success"] = False
            rec["calculated"] = calculated
            continue

        if diam == 0:
            reason = f"{FAILURE_REASONS['formula_divide_by_zero']}:水滴直径为零"
            rec["failure_reasons"].append(reason)
            if rec["processing_status"] in ["normalized", "calculation_failed", "pending"]:
                rec["processing_status"] = "calculation_failed"
            calculated["calculation_success"] = False
            rec["calculated"] = calculated
            continue

        try:
            result = k * flow * temp / diam
            calculated["heat_dissipation"] = round(result, 4)
            calculated["calculation_success"] = True

            if not (THRESHOLDS["heat_dissipation_min"] <= result <= THRESHOLDS["heat_dissipation_max"]):
                reason = (
                    f"{FAILURE_REASONS['threshold_result_out']}:"
                    f"散热功率{result:.2f}kW超出[{THRESHOLDS['heat_dissipation_min']},"
                    f"{THRESHOLDS['heat_dissipation_max']}]"
                )
                rec["failure_reasons"].append(reason)
                if rec["processing_status"] in ["normalized", "calculation_failed", "pending"]:
                    rec["processing_status"] = "result_out_of_threshold"
            else:
                if rec["processing_status"] in ["normalized", "calculation_failed", "pending"]:
                    rec["processing_status"] = "calculated"

        except Exception as e:
            reason = f"{FAILURE_REASONS['formula_param_missing']}:计算异常{str(e)}"
            rec["failure_reasons"].append(reason)
            if rec["processing_status"] in ["normalized", "calculation_failed", "pending"]:
                rec["processing_status"] = "calculation_failed"
            calculated["calculation_success"] = False

        rec["calculated"] = calculated

    return records


def save_calculation_report(records, output_path):
    import csv
    fieldnames = [
        "record_id",
        "device_id",
        "timestamp",
        "source_file",
        "water_flow_m3h",
        "droplet_diameter_mm",
        "water_temperature_degC",
        "k_value",
        "heat_dissipation_kW",
        "calculation_success",
        "processing_status",
        "failure_reasons",
    ]
    with open(output_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for rec in records:
            n = rec["normalized"]
            c = rec["calculated"]
            writer.writerow({
                "record_id": rec["record_id"],
                "device_id": rec["device_id"],
                "timestamp": rec["timestamp"],
                "source_file": rec["source_file"],
                "water_flow_m3h": n.get("water_flow_m3h", ""),
                "droplet_diameter_mm": n.get("droplet_diameter_mm", ""),
                "water_temperature_degC": n.get("water_temperature_degC", ""),
                "k_value": c.get("k_value", ""),
                "heat_dissipation_kW": c.get("heat_dissipation", ""),
                "calculation_success": c.get("calculation_success", False),
                "processing_status": rec["processing_status"],
                "failure_reasons": " | ".join(rec["failure_reasons"]),
            })
