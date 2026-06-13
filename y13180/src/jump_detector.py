from src.config import THRESHOLDS, FAILURE_REASONS


def _sorted_by_device_and_time(records):
    valid = [
        r for r in records
        if r.get("calculated", {}).get("calculation_success") is True
    ]
    valid.sort(key=lambda r: (r["device_id"], r["timestamp"]))
    return valid


def detect_jumps(records):
    valid_sorted = _sorted_by_device_and_time(records)
    jump_records = []
    device_prev = {}

    for rec in valid_sorted:
        device_id = rec["device_id"]
        curr_val = rec["calculated"]["heat_dissipation"]

        if device_id in device_prev:
            prev_rec = device_prev[device_id]
            prev_val = prev_rec["calculated"]["heat_dissipation"]
            ratio = curr_val / prev_val if prev_val != 0 else float("inf")
            abs_diff = abs(curr_val - prev_val)

            is_jump = ratio >= THRESHOLDS["jump_ratio"] or (1 / ratio) >= THRESHOLDS["jump_ratio"]

            if is_jump:
                cause = _attribute_jump_cause(prev_rec, rec)
                rec["has_jump"] = True
                rec["jump_from_record"] = prev_rec["record_id"]
                rec["jump_previous_value"] = prev_val
                rec["jump_current_value"] = curr_val
                rec["jump_ratio"] = round(ratio, 4)
                rec["jump_cause"] = cause
                jump_records.append(rec)
            else:
                rec["has_jump"] = False
        else:
            rec["has_jump"] = False

        device_prev[device_id] = rec

    for rec in records:
        if "has_jump" not in rec:
            rec["has_jump"] = False

    return records, jump_records


def _attribute_jump_cause(prev_rec, curr_rec):
    causes = []
    n_prev = prev_rec["normalized"]
    n_curr = curr_rec["normalized"]

    flow_prev = n_prev.get("water_flow_m3h", 0) or 0
    flow_curr = n_curr.get("water_flow_m3h", 0) or 0
    if flow_prev > 0:
        flow_ratio = flow_curr / flow_prev
        if flow_ratio >= 1.5 or flow_ratio <= 0.67:
            causes.append(
                f"水流量跳变({flow_prev:.2f}→{flow_curr:.2f}m³/h, 倍率{flow_ratio:.2f}x)"
            )

    temp_prev = n_prev.get("water_temperature_degC", 0) or 0
    temp_curr = n_curr.get("water_temperature_degC", 0) or 0
    if temp_prev > 0:
        temp_ratio = temp_curr / temp_prev
        if temp_ratio >= 1.3 or temp_ratio <= 0.77:
            causes.append(
                f"水温跳变({temp_prev:.2f}→{temp_curr:.2f}℃, 倍率{temp_ratio:.2f}x)"
            )

    diam_prev = n_prev.get("droplet_diameter_mm", 0) or 0
    diam_curr = n_curr.get("droplet_diameter_mm", 0) or 0
    if diam_prev > 0:
        diam_ratio = diam_curr / diam_prev
        if diam_ratio >= 1.5 or diam_ratio <= 0.67:
            causes.append(
                f"水滴直径跳变({diam_prev:.2f}→{diam_curr:.2f}mm, 倍率{diam_ratio:.2f}x)"
            )

    prev_reasons = [r for r in prev_rec["failure_reasons"] if "阈值" in r or "单位" in r]
    curr_reasons = [r for r in curr_rec["failure_reasons"] if "阈值" in r or "单位" in r]
    if prev_reasons or curr_reasons:
        causes.append("存在阈值/单位异常记录参与比较")

    if not causes:
        causes.append("正常波动范围内的跳变（非异常因素）")

    return "；".join(causes)


def save_jump_report(jump_records, output_path):
    import csv
    fieldnames = [
        "record_id",
        "device_id",
        "timestamp",
        "source_file",
        "jump_from_record",
        "jump_previous_value_kW",
        "jump_current_value_kW",
        "jump_ratio",
        "jump_cause",
        "water_flow_m3h",
        "droplet_diameter_mm",
        "water_temperature_degC",
        "processing_status",
        "failure_reasons",
    ]
    with open(output_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for rec in jump_records:
            n = rec["normalized"]
            writer.writerow({
                "record_id": rec["record_id"],
                "device_id": rec["device_id"],
                "timestamp": rec["timestamp"],
                "source_file": rec["source_file"],
                "jump_from_record": rec.get("jump_from_record", ""),
                "jump_previous_value_kW": rec.get("jump_previous_value", ""),
                "jump_current_value_kW": rec.get("jump_current_value", ""),
                "jump_ratio": rec.get("jump_ratio", ""),
                "jump_cause": rec.get("jump_cause", ""),
                "water_flow_m3h": n.get("water_flow_m3h", ""),
                "droplet_diameter_mm": n.get("droplet_diameter_mm", ""),
                "water_temperature_degC": n.get("water_temperature_degC", ""),
                "processing_status": rec["processing_status"],
                "failure_reasons": " | ".join(rec["failure_reasons"]),
            })
