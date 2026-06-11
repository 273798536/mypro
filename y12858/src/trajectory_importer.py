import pandas as pd
import numpy as np
from datetime import datetime
from typing import List, Tuple, Dict, Any, Optional
import hashlib
import re

from src.models import VesselTrajectory, DataStore, SupplySchedule


def _compute_fingerprint(vessel_id: str, vessel_name: str, arrival_time: Any,
                        departure_time: Any, water_demand: Any, route: str) -> str:
    arrival_str = str(arrival_time).strip() if arrival_time is not None and not pd.isna(arrival_time) else ""
    departure_str = str(departure_time).strip() if departure_time is not None and not pd.isna(departure_time) else ""
    demand_str = str(water_demand).strip() if water_demand is not None and not pd.isna(water_demand) else ""
    vid = (str(vessel_id).strip() if vessel_id is not None and not pd.isna(vessel_id) else "").upper()
    vname = (str(vessel_name).strip() if vessel_name is not None and not pd.isna(vessel_name) else "").upper()
    route_str = str(route).strip() if route is not None and not pd.isna(route) else ""

    raw = f"{vid}|{vname}|{arrival_str}|{departure_str}|{demand_str}|{route_str}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


def _parse_datetime(val: Any) -> Optional[datetime]:
    if val is None or (isinstance(val, float) and np.isnan(val)) or str(val).strip() == "":
        return None
    s = str(val).strip()
    formats = [
        "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M",
        "%Y/%m/%d %H:%M:%S", "%Y/%m/%d %H:%M",
        "%Y年%m月%d日 %H:%M",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    try:
        dt = pd.to_datetime(s).to_pydatetime()
        return dt.replace(tzinfo=None) if dt.tzinfo else dt
    except Exception:
        return None


def _guess_trajectory_columns(columns) -> Dict[str, str]:
    col_map = {
        "vessel_name": "", "vessel_id": "", "arrival_time": "",
        "departure_time": "", "water_demand": "", "route": "", "remark": ""
    }
    col_lower = {str(c).lower(): c for c in columns}

    patterns = {
        "vessel_name": ["vessel", "ship", "船名", "船舶"],
        "vessel_id": ["id", "编号", "呼号", "mmsi"],
        "arrival_time": ["arrival", "arrive", "到港", "到达", "进港"],
        "departure_time": ["depart", "离港", "离开", "出港"],
        "water_demand": ["water", "demand", "淡水", "用水", "补给量"],
        "route": ["route", "航线", "航路", "路径"],
        "remark": ["remark", "note", "备注", "说明"],
    }
    for key, pats in patterns.items():
        for pat in pats:
            for col_name, orig in col_lower.items():
                if pat in col_name:
                    col_map[key] = orig
                    break
            if col_map[key]:
                break

    defaults = ["vessel_name", "vessel_id", "arrival_time", "departure_time", "water_demand", "route", "remark"]
    for i, d in enumerate(defaults):
        if not col_map[d] and len(columns) > i:
            col_map[d] = columns[i]

    return col_map


def import_vessel_trajectories(raw_df: pd.DataFrame, source_batch: str = "") -> Tuple[List[VesselTrajectory], pd.DataFrame, List[str]]:
    messages: List[str] = []
    trajectories: List[VesselTrajectory] = []
    report_rows: List[Dict[str, Any]] = []

    if raw_df.empty:
        return trajectories, pd.DataFrame(), ["无数据可导入"]

    existing_df = DataStore.load_df("vessel_trajectories")
    existing_fingerprints = set(existing_df["fingerprint"].tolist()) if "fingerprint" in existing_df.columns else set()
    existing_ids = set(existing_df["trajectory_id"].tolist()) if "trajectory_id" in existing_df.columns else set()

    col_map = _guess_trajectory_columns(raw_df.columns)

    new_count = 0
    dup_count = 0

    for idx, row in raw_df.iterrows():
        vessel_name = str(row.get(col_map["vessel_name"], "")).strip()
        vessel_id = str(row.get(col_map["vessel_id"], "")).strip()
        arrival_time = _parse_datetime(row.get(col_map["arrival_time"]))
        departure_time = _parse_datetime(row.get(col_map["departure_time"]))
        route = str(row.get(col_map["route"], "")).strip()
        remark = str(row.get(col_map["remark"], "")).strip()

        demand_raw = row.get(col_map["water_demand"])
        try:
            water_demand = float(demand_raw) if demand_raw is not None and not pd.isna(demand_raw) else 0.0
        except (ValueError, TypeError):
            water_demand = 0.0

        fingerprint = _compute_fingerprint(vessel_id, vessel_name, arrival_time, departure_time, water_demand, route)

        is_duplicate = fingerprint in existing_fingerprints
        status_text = "新增"
        if is_duplicate:
            dup_count += 1
            status_text = "重复(已跳过)"

        traj = VesselTrajectory(
            vessel_name=vessel_name,
            vessel_id=vessel_id,
            arrival_time=arrival_time,
            departure_time=departure_time,
            water_demand=water_demand,
            route=route,
            remark=remark,
            source_batch=source_batch,
            fingerprint=fingerprint,
        )

        if not is_duplicate:
            new_count += 1
            trajectories.append(traj)
            existing_fingerprints.add(fingerprint)
            existing_ids.add(traj.trajectory_id)

        report_rows.append({
            "行号": idx + 1,
            "船名": vessel_name,
            "船舶编号": vessel_id,
            "到港时间": arrival_time.strftime("%Y-%m-%d %H:%M") if arrival_time else "",
            "离港时间": departure_time.strftime("%Y-%m-%d %H:%M") if departure_time else "",
            "淡水需求(吨)": water_demand,
            "航线": route,
            "状态": status_text,
        })

    if trajectories:
        DataStore.append("vessel_trajectories", trajectories)

    messages.append(f"导入完成: 新增{new_count}条, 跳过重复{dup_count}条")
    report_df = pd.DataFrame(report_rows)
    return trajectories, report_df, messages


def get_trajectories_without_schedule() -> pd.DataFrame:
    traj_df = DataStore.load_df("vessel_trajectories")
    sched_df = DataStore.load_df("supply_schedules")

    if traj_df.empty:
        return traj_df

    if sched_df.empty or "trajectory_id" not in sched_df.columns:
        return traj_df

    scheduled_ids = set(sched_df["trajectory_id"].dropna().tolist())
    return traj_df[~traj_df["trajectory_id"].isin(scheduled_ids)].reset_index(drop=True)
