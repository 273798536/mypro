"""数据导入模块：风浪预报、水质数据、巡检任务、船舶轨迹"""

import json
import csv
import os
from datetime import datetime
from .db import get_conn, log_processing


def import_wave_forecast(data, source_file=None, data_source="manual"):
    """导入风浪预报数据
    data: dict 或 list of dict
    """
    if isinstance(data, dict):
        data = [data]

    results = []
    with get_conn() as conn:
        for item in data:
            is_delayed = item.get("is_delayed", 0)
            cur = conn.execute("""
                INSERT INTO wave_forecasts
                (forecast_date, wind_farm, wave_height, wind_speed, wind_direction,
                 forecast_time, is_delayed, source_file, data_source)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                item["forecast_date"], item["wind_farm"],
                item.get("wave_height"), item.get("wind_speed"),
                item.get("wind_direction"), item.get("forecast_time"),
                is_delayed, source_file or item.get("source_file"),
                data_source
            ))
            wf_id = cur.lastrowid
            log_processing(
                conn,
                operation="import_wave_forecast",
                entity_type="wave_forecast",
                entity_id=wf_id,
                source_ref=source_file or data_source,
                result_ref=str(wf_id),
                details=f"风浪预报导入: {item['wind_farm']} {item['forecast_date']}"
                        f"{' [预报晚到]' if is_delayed else ''}"
            )
            results.append({"id": wf_id, **item})
    return results


def import_water_quality(data, source_file=None):
    """导入水质监测数据"""
    if isinstance(data, dict):
        data = [data]

    results = []
    with get_conn() as conn:
        for item in data:
            cur = conn.execute("""
                INSERT INTO water_quality
                (sample_date, wind_farm, ph, turbidity, dissolved_oxygen,
                 temperature, sample_location, source_file)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                item["sample_date"], item["wind_farm"],
                item.get("ph"), item.get("turbidity"),
                item.get("dissolved_oxygen"), item.get("temperature"),
                item.get("sample_location"), source_file or item.get("source_file")
            ))
            wq_id = cur.lastrowid
            log_processing(
                conn,
                operation="import_water_quality",
                entity_type="water_quality",
                entity_id=wq_id,
                source_ref=source_file,
                result_ref=str(wq_id),
                details=f"水质数据导入: {item['wind_farm']} {item['sample_date']}"
            )
            results.append({"id": wq_id, **item})
    return results


def create_inspection_task(task_code, wind_farm, planned_date,
                           tide_window_start=None, tide_window_end=None,
                           ship_name=None):
    """创建巡检任务"""
    with get_conn() as conn:
        cur = conn.execute("""
            INSERT INTO inspection_tasks
            (task_code, wind_farm, planned_date, tide_window_start, tide_window_end, ship_name)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (task_code, wind_farm, planned_date,
              tide_window_start, tide_window_end, ship_name))
        task_id = cur.lastrowid
        log_processing(
            conn,
            operation="create_task",
            entity_type="inspection_task",
            entity_id=task_id,
            result_ref=task_code,
            details=f"创建巡检任务: {task_code} 风场={wind_farm} 计划日期={planned_date}"
        )
        return {"id": task_id, "task_code": task_code}


def import_ship_track(task_id, tracks, ship_name=None, source=None):
    """导入船舶轨迹"""
    if isinstance(tracks, dict):
        tracks = [tracks]

    results = []
    with get_conn() as conn:
        if not ship_name and task_id:
            row = conn.execute("SELECT ship_name FROM inspection_tasks WHERE id = ?",
                               (task_id,)).fetchone()
            if row:
                ship_name = row["ship_name"]

        for t in tracks:
            cur = conn.execute("""
                INSERT INTO ship_tracks
                (task_id, ship_name, timestamp, lon, lat, speed, heading, source)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                task_id, ship_name or t.get("ship_name"),
                t["timestamp"], t["lon"], t["lat"],
                t.get("speed"), t.get("heading"), source or t.get("source")
            ))
            track_id = cur.lastrowid
            results.append({"id": track_id, **t})

        log_processing(
            conn,
            operation="import_ship_track",
            entity_type="ship_track",
            entity_id=task_id,
            source_ref=source,
            result_ref=str(len(tracks)),
            details=f"导入船舶轨迹 {len(tracks)} 条, 任务ID={task_id}"
        )
    return results


def import_json_file(filepath, data_type):
    """从 JSON 文件导入数据"""
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    source_file = os.path.basename(filepath)

    if data_type == "wave_forecast":
        first = data[0] if isinstance(data, list) else data
        data_source = first.get("data_source", f"file:{source_file}")
        return import_wave_forecast(data, source_file=source_file, data_source=data_source)
    elif data_type == "water_quality":
        return import_water_quality(data, source_file=source_file)
    else:
        raise ValueError(f"不支持的数据类型: {data_type}")
