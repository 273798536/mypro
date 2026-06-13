from collections import defaultdict
from src.config import FAILURE_REASONS


def detect_duplicate_devices(records):
    device_groups = defaultdict(list)
    for rec in records:
        device_id = rec["device_id"]
        if device_id:
            device_groups[device_id].append(rec)

    duplicate_records = []
    normal_records = []

    for device_id, recs in device_groups.items():
        if len(recs) > 1:
            for idx, rec in enumerate(recs):
                rec["is_duplicate_device"] = True
                rec["duplicate_group_size"] = len(recs)
                rec["duplicate_index_in_group"] = idx + 1
                reason = f"{FAILURE_REASONS['device_duplicate']}:设备{device_id}出现{len(recs)}次，本条为第{idx+1}条"
                rec["failure_reasons"].append(reason)
                if rec["processing_status"] == "calculated":
                    rec["processing_status"] = "calculated_but_duplicate"
                elif rec["processing_status"] == "normalized":
                    rec["processing_status"] = "duplicate_before_calc"
                duplicate_records.append(rec)
        else:
            single_rec = recs[0]
            single_rec["is_duplicate_device"] = False
            single_rec["duplicate_group_size"] = 1
            single_rec["duplicate_index_in_group"] = 1
            normal_records.append(single_rec)

    for rec in records:
        if "is_duplicate_device" not in rec:
            rec["is_duplicate_device"] = False
            rec["duplicate_group_size"] = 0
            rec["duplicate_index_in_group"] = 0
            normal_records.append(rec)

    return records, duplicate_records, normal_records


def save_duplicate_report(duplicate_records, output_path):
    import csv
    fieldnames = [
        "record_id",
        "device_id",
        "timestamp",
        "source_file",
        "duplicate_group_size",
        "duplicate_index_in_group",
        "water_flow_m3h",
        "droplet_diameter_mm",
        "water_temperature_degC",
        "heat_dissipation_kW",
        "processing_status",
        "failure_reasons",
    ]
    with open(output_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for rec in duplicate_records:
            n = rec["normalized"]
            c = rec["calculated"]
            writer.writerow({
                "record_id": rec["record_id"],
                "device_id": rec["device_id"],
                "timestamp": rec["timestamp"],
                "source_file": rec["source_file"],
                "duplicate_group_size": rec.get("duplicate_group_size", ""),
                "duplicate_index_in_group": rec.get("duplicate_index_in_group", ""),
                "water_flow_m3h": n.get("water_flow_m3h", ""),
                "droplet_diameter_mm": n.get("droplet_diameter_mm", ""),
                "water_temperature_degC": n.get("water_temperature_degC", ""),
                "heat_dissipation_kW": c.get("heat_dissipation", ""),
                "processing_status": rec["processing_status"],
                "failure_reasons": " | ".join(rec["failure_reasons"]),
            })
