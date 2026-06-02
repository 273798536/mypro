from __future__ import annotations

import csv
import json
from datetime import datetime
from pathlib import Path
from typing import Optional

from models import (
    AnomalySource,
    DataSource,
    EquipmentInfo,
    MaintenanceRecord,
    VibrationSample,
)


def _parse_datetime(s: str) -> datetime:
    s = s.strip()
    for fmt in (
        "%Y-%m-%d %H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d",
    ):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    raise ValueError(f"无法解析日期时间: {s}")


def _parse_source(s: str) -> DataSource:
    s = s.strip().lower()
    if s in ("backfill", "补录"):
        return DataSource.BACKFILL
    return DataSource.ORIGINAL


def _parse_anomaly_source(s: str) -> Optional[AnomalySource]:
    s = s.strip().lower()
    if s in ("backfill", "补录"):
        return AnomalySource.BACKFILL
    if s in ("original", "原始", "原始材料"):
        return AnomalySource.ORIGINAL
    return None


def import_vibration_csv(path: str | Path) -> list[VibrationSample]:
    path = Path(path)
    samples: list[VibrationSample] = []
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            ts = _parse_datetime(row["timestamp"])
            value = float(row.get("value", 0) or 0)
            is_missing = row.get("is_missing_sample", "").strip().lower() in (
                "true", "1", "是",
            )
            anomaly_src = _parse_anomaly_source(
                row.get("anomaly_source", ""),
            )
            is_spike = row.get("is_anomaly_spike", "").strip().lower() in (
                "true", "1", "是",
            )
            source = _parse_source(row.get("source", "original"))
            samples.append(
                VibrationSample(
                    equipment_id=row["equipment_id"].strip(),
                    timestamp=ts,
                    value=value,
                    is_missing_sample=is_missing,
                    anomaly_source=anomaly_src,
                    is_anomaly_spike=is_spike,
                    source=source,
                    note=row.get("note", "").strip(),
                ),
            )
    return samples


def import_vibration_json(path: str | Path) -> list[VibrationSample]:
    path = Path(path)
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    samples: list[VibrationSample] = []
    for item in data:
        ts = _parse_datetime(item["timestamp"])
        value = float(item.get("value", 0) or 0)
        is_missing = item.get("is_missing_sample", False) is True
        anomaly_src = _parse_anomaly_source(
            item.get("anomaly_source", ""),
        )
        is_spike = item.get("is_anomaly_spike", False) is True
        source = _parse_source(item.get("source", "original"))
        samples.append(
            VibrationSample(
                equipment_id=item["equipment_id"].strip(),
                timestamp=ts,
                value=value,
                is_missing_sample=is_missing,
                anomaly_source=anomaly_src,
                is_anomaly_spike=is_spike,
                source=source,
                note=item.get("note", ""),
            ),
        )
    return samples


def import_maintenance_csv(path: str | Path) -> list[MaintenanceRecord]:
    path = Path(path)
    records: list[MaintenanceRecord] = []
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            dt = _parse_datetime(row["date"])
            source = _parse_source(row.get("source", "original"))
            records.append(
                MaintenanceRecord(
                    equipment_id=row["equipment_id"].strip(),
                    date=dt,
                    maintenance_type=row.get("maintenance_type", "").strip(),
                    description=row.get("description", "").strip(),
                    source=source,
                    note=row.get("note", "").strip(),
                ),
            )
    return records


def import_maintenance_json(path: str | Path) -> list[MaintenanceRecord]:
    path = Path(path)
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    records: list[MaintenanceRecord] = []
    for item in data:
        dt = _parse_datetime(item["date"])
        source = _parse_source(item.get("source", "original"))
        records.append(
            MaintenanceRecord(
                equipment_id=item["equipment_id"].strip(),
                date=dt,
                maintenance_type=item.get("maintenance_type", ""),
                description=item.get("description", ""),
                source=source,
                note=item.get("note", ""),
            ),
        )
    return records


def import_equipment_csv(path: str | Path) -> list[EquipmentInfo]:
    path = Path(path)
    equipments: list[EquipmentInfo] = []
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            model_backfilled = row.get("model_backfilled", "").strip().lower() in (
                "true", "1", "是",
            )
            backfill_time = None
            if model_backfilled and row.get("model_backfill_time", "").strip():
                backfill_time = _parse_datetime(row["model_backfill_time"])
            install_date = None
            if row.get("installation_date", "").strip():
                install_date = _parse_datetime(row["installation_date"])
            equipments.append(
                EquipmentInfo(
                    equipment_id=row["equipment_id"].strip(),
                    model=row.get("model", "").strip(),
                    model_backfilled=model_backfilled,
                    model_backfill_time=backfill_time,
                    installation_date=install_date,
                    location=row.get("location", "").strip(),
                ),
            )
    return equipments


def import_equipment_json(path: str | Path) -> list[EquipmentInfo]:
    path = Path(path)
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    equipments: list[EquipmentInfo] = []
    for item in data:
        model_backfilled = item.get("model_backfilled", False) is True
        backfill_time = None
        if model_backfilled and item.get("model_backfill_time"):
            backfill_time = _parse_datetime(item["model_backfill_time"])
        install_date = None
        if item.get("installation_date"):
            install_date = _parse_datetime(item["installation_date"])
        equipments.append(
            EquipmentInfo(
                equipment_id=item["equipment_id"].strip(),
                model=item.get("model", ""),
                model_backfilled=model_backfilled,
                model_backfill_time=backfill_time,
                installation_date=install_date,
                location=item.get("location", ""),
            ),
        )
    return equipments


def auto_import(directory: str | Path) -> dict:
    directory = Path(directory)
    result: dict = {
        "vibration": [],
        "maintenance": [],
        "equipment": [],
    }
    if not directory.is_dir():
        return result

    for fp in sorted(directory.iterdir()):
        name_lower = fp.name.lower()
        if "vibration" in name_lower or "振动" in name_lower:
            if name_lower.endswith(".csv"):
                result["vibration"].extend(import_vibration_csv(fp))
            elif name_lower.endswith(".json"):
                result["vibration"].extend(import_vibration_json(fp))
        elif "maintenance" in name_lower or "维修" in name_lower:
            if name_lower.endswith(".csv"):
                result["maintenance"].extend(import_maintenance_csv(fp))
            elif name_lower.endswith(".json"):
                result["maintenance"].extend(import_maintenance_json(fp))
        elif "equipment" in name_lower or "设备" in name_lower:
            if name_lower.endswith(".csv"):
                result["equipment"].extend(import_equipment_csv(fp))
            elif name_lower.endswith(".json"):
                result["equipment"].extend(import_equipment_json(fp))

    return result
