import csv
import json
from datetime import date, datetime, time
from pathlib import Path
from typing import Optional

from .models import DataSource, Observation, WeatherCondition


def _parse_weather(value: str) -> WeatherCondition:
    mapping = {
        "clear": WeatherCondition.CLEAR,
        "晴": WeatherCondition.CLEAR,
        "sunny": WeatherCondition.CLEAR,
        "partly_cloudy": WeatherCondition.PARTLY_CLOUDY,
        "多云": WeatherCondition.PARTLY_CLOUDY,
        "overcast": WeatherCondition.OVERCAST,
        "阴天": WeatherCondition.OVERCAST,
        "cloudy": WeatherCondition.OVERCAST,
        "unknown": WeatherCondition.UNKNOWN,
        "未知": WeatherCondition.UNKNOWN,
    }
    return mapping.get(value.strip().lower(), WeatherCondition.UNKNOWN)


def _build_source(file_path: str, version: str = "") -> DataSource:
    p = Path(file_path)
    ts = datetime.now().isoformat()
    return DataSource(
        name=p.name,
        version=version or p.stat().st_mtime.__str__(),
        imported_at=ts,
    )


def _make_observation(row: dict, source: DataSource) -> Observation:
    obs_date = row.get("obs_date") or row.get("date") or ""
    obs_time = row.get("obs_time") or row.get("time") or ""

    if isinstance(obs_date, str):
        obs_date = date.fromisoformat(obs_date.strip())
    if isinstance(obs_time, str):
        parts = obs_time.strip().split(":")
        obs_time = time(int(parts[0]), int(parts[1]), int(parts[2]) if len(parts) > 2 else 0)

    shadow = row.get("shadow_length") or row.get("shadow") or None
    pole = row.get("pole_height") or row.get("pole") or None

    weather_str = row.get("weather", "unknown")
    tz = row.get("timezone_offset", row.get("tz_offset", 0))

    return Observation(
        site_name=str(row.get("site_name", row.get("name", "unknown"))).strip(),
        latitude=float(row.get("latitude", row.get("lat", 0))),
        longitude=float(row.get("longitude", row.get("lon", row.get("lng", 0)))),
        obs_date=obs_date,
        obs_time=obs_time,
        timezone_offset=float(tz),
        shadow_length=float(shadow) if shadow is not None and shadow != "" else None,
        pole_height=float(pole) if pole is not None and pole != "" else None,
        weather=_parse_weather(str(weather_str)),
        source=source,
        notes=str(row.get("notes", "")),
    )


def import_csv(file_path: str, version: str = "") -> list[Observation]:
    source = _build_source(file_path, version)
    observations = []
    with open(file_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                obs = _make_observation(dict(row), source)
                observations.append(obs)
            except (ValueError, KeyError, IndexError) as exc:
                observations.append(
                    Observation(
                        site_name="_import_error",
                        latitude=0,
                        longitude=0,
                        obs_date=date.today(),
                        obs_time=time(0, 0),
                        timezone_offset=0,
                        source=source,
                        notes=f"导入失败: {exc}",
                    )
                )
    return observations


def import_json(file_path: str, version: str = "") -> list[Observation]:
    source = _build_source(file_path, version)
    with open(file_path, encoding="utf-8") as f:
        data = json.load(f)

    items = data if isinstance(data, list) else data.get("observations", [data])
    observations = []
    for row in items:
        try:
            obs = _make_observation(row, source)
            observations.append(obs)
        except (ValueError, KeyError, IndexError) as exc:
            observations.append(
                Observation(
                    site_name="_import_error",
                    latitude=0,
                    longitude=0,
                    obs_date=date.today(),
                    obs_time=time(0, 0),
                    timezone_offset=0,
                    source=source,
                    notes=f"导入失败: {exc}",
                )
            )
    return observations


def import_file(file_path: str, version: str = "") -> list[Observation]:
    p = Path(file_path)
    if p.suffix.lower() == ".csv":
        return import_csv(file_path, version)
    elif p.suffix.lower() == ".json":
        return import_json(file_path, version)
    else:
        raise ValueError(f"不支持的文件格式: {p.suffix}，仅支持 .csv 和 .json")
