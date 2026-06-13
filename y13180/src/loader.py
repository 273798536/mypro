import csv
import copy
from src.config import INPUT_FILE


def load_raw_records(input_file=None):
    if input_file is None:
        input_file = INPUT_FILE
    records = []
    with open(input_file, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader, start=1):
            record = {
                "raw_row_number": idx,
                "raw_data": copy.deepcopy(row),
                "record_id": row.get("record_id", ""),
                "device_id": row.get("device_id", ""),
                "timestamp": row.get("timestamp", ""),
                "source_file": row.get("source_file", ""),
                "processing_status": "pending",
                "failure_reasons": [],
                "normalized": {},
                "calculated": {},
            }
            records.append(record)
    return records


def save_raw_backup(records, output_path):
    fieldnames = [
        "raw_row_number",
        "record_id",
        "device_id",
        "timestamp",
        "source_file",
        "raw_water_flow",
        "raw_flow_unit",
        "raw_droplet_diameter",
        "raw_diameter_unit",
        "raw_water_temperature",
        "raw_temp_unit",
        "raw_air_velocity",
        "raw_velocity_unit",
    ]
    with open(output_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for rec in records:
            raw = rec["raw_data"]
            writer.writerow({
                "raw_row_number": rec["raw_row_number"],
                "record_id": rec["record_id"],
                "device_id": rec["device_id"],
                "timestamp": rec["timestamp"],
                "source_file": rec["source_file"],
                "raw_water_flow": raw.get("water_flow", ""),
                "raw_flow_unit": raw.get("flow_unit", ""),
                "raw_droplet_diameter": raw.get("droplet_diameter", ""),
                "raw_diameter_unit": raw.get("diameter_unit", ""),
                "raw_water_temperature": raw.get("water_temperature", ""),
                "raw_temp_unit": raw.get("temp_unit", ""),
                "raw_air_velocity": raw.get("air_velocity", ""),
                "raw_velocity_unit": raw.get("velocity_unit", ""),
            })
