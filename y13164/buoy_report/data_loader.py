"""数据加载和校验模块."""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

import pandas as pd

from .models import BuoyData, CalculationParams, ConfirmationRequest, MaintenanceNote


def load_buoy_data(data_dir: str) -> tuple[list[BuoyData], list[ConfirmationRequest]]:
    """加载浮标数据，执行去重和校验."""
    buoy_list: list[BuoyData] = []
    confirmations: list[ConfirmationRequest] = []
    seen_keys: dict[str, list[str]] = {}
    source_files = list(Path(data_dir).glob("*.csv")) + list(Path(data_dir).glob("*.xlsx"))

    for file_path in sorted(source_files):
        df = _read_file(file_path)

        for _, row in df.iterrows():
            device_id = str(row["device_id"]).strip()
            ts = pd.to_datetime(row["timestamp"]).to_pydatetime()
            key = f"{device_id}_{ts.isoformat()}"

            if key in seen_keys:
                seen_keys[key].append(file_path.name)
                confirmations.append(
                    ConfirmationRequest(
                        request_id=uuid4().hex[:8],
                        device_id=device_id,
                        reason=f"设备编号+时间戳重复，来源：{', '.join(seen_keys[key])}",
                        next_step="请确认哪份数据为准，或合并后重新导出",
                        affected_data_count=len(seen_keys[key]),
                    )
                )
                continue

            seen_keys[key] = [file_path.name]
            buoy_list.append(
                BuoyData(
                    device_id=device_id,
                    timestamp=ts,
                    longitude=float(row["longitude"]),
                    latitude=float(row["latitude"]),
                    wave_height=float(row["wave_height"]),
                    wave_period=float(row["wave_period"]),
                    wave_direction=float(row["wave_direction"]),
                    water_temperature=float(row["water_temperature"]),
                    wind_speed=float(row["wind_speed"]),
                    wind_direction=float(row["wind_direction"]),
                    air_pressure=float(row["air_pressure"]),
                    source_file=file_path.name,
                )
            )

    return buoy_list, confirmations


def load_maintenance_notes(data_dir: str) -> tuple[list[MaintenanceNote], list[ConfirmationRequest]]:
    """加载维修备注，支持多版本，禁止无声覆盖."""
    notes: list[MaintenanceNote] = []
    confirmations: list[ConfirmationRequest] = []
    device_notes: dict[str, list[MaintenanceNote]] = {}
    note_files = list(Path(data_dir).glob("*notes*.json")) + list(Path(data_dir).glob("*notes*.csv"))

    for file_path in sorted(note_files):
        raw_notes = _read_notes_file(file_path)

        for raw in raw_notes:
            device_id = str(raw["device_id"]).strip()
            note = MaintenanceNote(
                note_id=raw.get("note_id", uuid4().hex[:8]),
                device_id=device_id,
                timestamp=pd.to_datetime(raw["timestamp"]).to_pydatetime(),
                content=str(raw["content"]).strip(),
                author=str(raw.get("author", "未知")).strip(),
                version=int(raw.get("version", 1)),
                is_original=bool(raw.get("is_original", True)),
                replaced_by=raw.get("replaced_by"),
            )

            existing = device_notes.get(device_id, [])
            same_time = [n for n in existing if n.timestamp == note.timestamp]

            if same_time:
                old_note = same_time[0]
                if old_note.content != note.content:
                    old_note.is_original = False
                    old_note.replaced_by = note.note_id
                    note.version = old_note.version + 1
                    note.is_original = True
                    confirmations.append(
                        ConfirmationRequest(
                            request_id=uuid4().hex[:8],
                            device_id=device_id,
                            reason=f"维修备注已更新（版本 {old_note.version} → {note.version}），"
                            f"原内容：「{old_note.content[:30]}...」→ 新内容：「{note.content[:30]}...」",
                            next_step="请确认备注更新无误，如需回退请使用历史版本重新导出",
                            affected_data_count=1,
                        )
                    )
                existing.remove(old_note)
                notes.remove(old_note)

            existing.append(note)
            device_notes[device_id] = existing
            notes.append(note)

    return notes, confirmations


def load_params(params_path: str | None = None) -> CalculationParams:
    """加载计算参数，默认使用标准配置."""
    params = CalculationParams(param_id=uuid4().hex[:8])

    if params_path and os.path.exists(params_path):
        with open(params_path) as f:
            data = json.load(f)
        for k, v in data.items():
            if hasattr(params, k):
                setattr(params, k, v)

    return params


def save_params(params: CalculationParams, output_path: str) -> None:
    """保存参数配置."""
    data = {
        k: v for k, v in params.__dict__.items() if not k.startswith("_") and k != "created_at"
    }
    with open(output_path, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def _read_file(file_path: Path) -> pd.DataFrame:
    """读取CSV或Excel文件."""
    if file_path.suffix.lower() == ".csv":
        return pd.read_csv(file_path)
    return pd.read_excel(file_path)


def _read_notes_file(file_path: Path) -> list[dict[str, Any]]:
    """读取备注文件."""
    if file_path.suffix.lower() == ".json":
        with open(file_path) as f:
            return json.load(f)
    df = pd.read_csv(file_path)
    return df.to_dict("records")


def to_buoy_dataframe(buoys: list[BuoyData]) -> pd.DataFrame:
    """转换为DataFrame便于分析."""
    return pd.DataFrame(
        [
            {
                "device_id": b.device_id,
                "timestamp": b.timestamp,
                "longitude": b.longitude,
                "latitude": b.latitude,
                "wave_height": b.wave_height,
                "wave_period": b.wave_period,
                "wave_direction": b.wave_direction,
                "water_temperature": b.water_temperature,
                "wind_speed": b.wind_speed,
                "wind_direction": b.wind_direction,
                "air_pressure": b.air_pressure,
                "source_file": b.source_file,
                "raw_id": b.raw_id,
            }
            for b in buoys
        ]
    )
