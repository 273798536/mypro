import json
import os
import glob
from typing import List, Tuple

from .models import (
    EquipmentNameplate,
    LateAttachment,
    SupplementaryNote,
    TorqueReading,
    TorqueDirection,
)


def _parse_direction(raw: str) -> TorqueDirection:
    if not raw:
        return TorqueDirection.UNKNOWN
    r = raw.strip().upper()
    if r in ("CW", "CLOCKWISE", "→", "正向"):
        return TorqueDirection.CLOCKWISE
    if r in ("CCW", "COUNTERCLOCKWISE", "←", "反向"):
        return TorqueDirection.COUNTERCLOCKWISE
    return TorqueDirection.UNKNOWN


def _load_json_files(pattern: str):
    results = []
    for fp in sorted(glob.glob(pattern)):
        try:
            with open(fp, "r", encoding="utf-8") as f:
                results.append(json.load(f))
        except Exception as e:
            print(f"[WARN] 加载 {fp} 失败: {e}")
    return results


def load_nameplates(input_dir: str) -> List[EquipmentNameplate]:
    pattern = os.path.join(input_dir, "nameplates", "*.json")
    raws = _load_json_files(pattern)
    out = []
    for d in raws:
        out.append(
            EquipmentNameplate(
                equipment_id=d["equipment_id"],
                model=d.get("model", "未知型号"),
                rated_torque_nm=float(d["rated_torque_nm"]),
                max_torque_nm=float(d.get("max_torque_nm", d["rated_torque_nm"] * 1.5)),
                warning_threshold_pct=float(d.get("warning_threshold_pct", 80.0)),
                critical_threshold_pct=float(d.get("critical_threshold_pct", 110.0)),
                manufacturer=d.get("manufacturer", "未知厂商"),
                install_date=d.get("install_date", "未知"),
                rated_speed_rpm=float(d.get("rated_speed_rpm", 1500.0)),
                notes=d.get("notes", ""),
            )
        )
    return out


def load_attachments(input_dir: str) -> List[LateAttachment]:
    pattern = os.path.join(input_dir, "attachments", "*.json")
    raws = _load_json_files(pattern)
    out = []
    for d in raws:
        readings = []
        for r in d.get("readings", []):
            readings.append(
                TorqueReading(
                    timestamp=r["timestamp"],
                    value_nm=float(r["value_nm"]),
                    direction=_parse_direction(r.get("direction", "")),
                    sensor_id=r.get("sensor_id", "S-UNKNOWN"),
                    rpm=float(r.get("rpm", 0.0)),
                    temperature_c=float(r.get("temperature_c", 25.0)),
                )
            )
        out.append(
            LateAttachment(
                attachment_id=d["attachment_id"],
                equipment_id=d["equipment_id"],
                file_name=d.get("file_name", "未命名附件"),
                upload_time=d.get("upload_time", "未知"),
                content_summary=d.get("content_summary", ""),
                readings=readings,
            )
        )
    return out


def load_notes(input_dir: str) -> List[SupplementaryNote]:
    pattern = os.path.join(input_dir, "notes", "*.json")
    raws = _load_json_files(pattern)
    out = []
    for d in raws:
        out.append(
            SupplementaryNote(
                note_id=d["note_id"],
                equipment_id=d["equipment_id"],
                author=d.get("author", "匿名"),
                created_at=d.get("created_at", "未知"),
                content=d.get("content", ""),
                overrides_threshold=bool(d.get("overrides_threshold", False)),
                override_threshold_pct=(
                    float(d["override_threshold_pct"])
                    if d.get("override_threshold_pct") is not None
                    else None
                ),
            )
        )
    return out


def load_base_readings(input_dir: str) -> dict:
    pattern = os.path.join(input_dir, "readings", "*.json")
    raws = _load_json_files(pattern)
    by_eq = {}
    for d in raws:
        eid = d["equipment_id"]
        readings = []
        for r in d.get("readings", []):
            readings.append(
                TorqueReading(
                    timestamp=r["timestamp"],
                    value_nm=float(r["value_nm"]),
                    direction=_parse_direction(r.get("direction", "")),
                    sensor_id=r.get("sensor_id", "S-UNKNOWN"),
                    rpm=float(r.get("rpm", 0.0)),
                    temperature_c=float(r.get("temperature_c", 25.0)),
                )
            )
        by_eq.setdefault(eid, []).extend(readings)
    return by_eq


def load_all_materials(input_dir: str) -> Tuple[List[EquipmentNameplate], List[LateAttachment], List[SupplementaryNote], dict]:
    nameplates = load_nameplates(input_dir)
    attachments = load_attachments(input_dir)
    notes = load_notes(input_dir)
    base_readings = load_base_readings(input_dir)
    return nameplates, attachments, notes, base_readings
