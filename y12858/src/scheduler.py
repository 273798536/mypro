import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Tuple, Dict, Any

from src.models import TideRecord, VesselTrajectory, SupplySchedule, DataStore


MIN_TIDE_HEIGHT = 2.5
IDEAL_TIDE_HEIGHT = 3.5


def _load_clean_tides() -> pd.DataFrame:
    df = DataStore.load_df("tide_records")
    if df.empty:
        return df
    if "is_clean" in df.columns:
        df = df[df["is_clean"] == True]
    if "tide_time" in df.columns:
        df["tide_time"] = pd.to_datetime(df["tide_time"])
    return df


def _load_trajectories() -> pd.DataFrame:
    df = DataStore.load_df("vessel_trajectories")
    if df.empty:
        return df
    for col in ["arrival_time", "departure_time"]:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce")
    return df


def _find_supply_window(traj_row: pd.Series, tides_df: pd.DataFrame) -> Dict[str, Any]:
    arrival = traj_row["arrival_time"]
    departure = traj_row["departure_time"]
    if pd.isna(arrival):
        return {"found": False, "reason": "到港时间缺失"}

    if pd.isna(departure):
        departure = arrival + timedelta(hours=12)

    window_start = arrival - timedelta(hours=2)
    window_end = departure

    candidate_tides = tides_df[
        (tides_df["tide_time"] >= window_start) &
        (tides_df["tide_time"] <= window_end)
    ].copy()

    if candidate_tides.empty:
        extended_end = window_end + timedelta(hours=12)
        candidate_tides = tides_df[
            (tides_df["tide_time"] >= window_start) &
            (tides_df["tide_time"] <= extended_end)
        ].copy()
        if candidate_tides.empty:
            return {"found": False, "reason": f"{arrival.strftime('%m-%d')}前后无可用潮汐数据"}

    candidate_tides = candidate_tides.sort_values("tide_time")

    if "tide_type" in candidate_tides.columns:
        high_tides = candidate_tides[candidate_tides["tide_type"] == "高潮"]
        if not high_tides.empty:
            candidate_tides = high_tides

    if "tide_height" in candidate_tides.columns:
        qualified = candidate_tides[candidate_tides["tide_height"] >= MIN_TIDE_HEIGHT]
        if not qualified.empty:
            candidate_tides = qualified

    best = candidate_tides.iloc[0]
    tide_h = float(best.get("tide_height", 0.0))

    if tide_h >= IDEAL_TIDE_HEIGHT:
        confidence = 0.9
    elif tide_h >= MIN_TIDE_HEIGHT:
        confidence = 0.7
    else:
        confidence = 0.4

    supply_time = best["tide_time"]
    if isinstance(supply_time, str):
        supply_time = pd.to_datetime(supply_time).to_pydatetime()
    elif hasattr(supply_time, "to_pydatetime"):
        supply_time = supply_time.to_pydatetime()

    return {
        "found": True,
        "supply_time": supply_time,
        "tide_height": tide_h,
        "confidence": confidence,
        "reason": "",
    }


def generate_supply_schedules() -> Tuple[List[SupplySchedule], pd.DataFrame, List[str]]:
    messages: List[str] = []
    schedules: List[SupplySchedule] = []
    report_rows: List[Dict[str, Any]] = []

    tides_df = _load_clean_tides()
    if tides_df.empty:
        return schedules, pd.DataFrame(), ["无干净的潮汐数据，请先导入并清洗潮汐表"]

    unscheduled = _get_unscheduled_trajectories()
    if unscheduled.empty:
        return schedules, pd.DataFrame(), ["无待调度的船舶轨迹"]

    existing_sched_df = DataStore.load_df("supply_schedules")
    scheduled_traj_ids = set()
    if not existing_sched_df.empty and "trajectory_id" in existing_sched_df.columns:
        scheduled_traj_ids = set(existing_sched_df["trajectory_id"].dropna().tolist())

    created = 0
    skipped = 0

    for _, traj in unscheduled.iterrows():
        traj_id = traj["trajectory_id"]
        if traj_id in scheduled_traj_ids:
            skipped += 1
            continue

        result = _find_supply_window(traj, tides_df)
        status = "pending"
        note = result.get("reason", "")

        if not result["found"]:
            status = "failed"
            note = result.get("reason", "调度失败")
            messages.append(f"[{traj.get('vessel_name', '未知')}] {note}")

        water_amount = float(traj.get("water_demand", 0.0))
        if water_amount <= 0:
            water_amount = 50.0
            note = (note + "；" if note else "") + "淡水需求缺失，按默认50吨计"

        sched = SupplySchedule(
            trajectory_id=traj_id,
            vessel_name=traj.get("vessel_name", ""),
            vessel_id=traj.get("vessel_id", ""),
            supply_time=result.get("supply_time") if result.get("found") else None,
            water_amount=water_amount,
            base_tide_height=result.get("tide_height") if result.get("found") else None,
            confidence=result.get("confidence", 0.0),
            status=status,
            review_note=note,
        )
        schedules.append(sched)
        created += 1

        report_rows.append({
            "调度编号": sched.schedule_id,
            "船名": sched.vessel_name,
            "船舶编号": sched.vessel_id,
            "补给时间": sched.supply_time.strftime("%Y-%m-%d %H:%M") if sched.supply_time else "",
            "补水量(吨)": sched.water_amount,
            "对应潮高(米)": sched.base_tide_height if sched.base_tide_height else "",
            "置信度": f"{int(sched.confidence * 100)}%",
            "状态": _status_label(sched.status),
            "备注": sched.review_note,
        })

    if schedules:
        DataStore.append("supply_schedules", schedules)

    messages.append(f"调度完成: 新增{created}条, 跳过{skipped}条(已有调度)")
    report_df = pd.DataFrame(report_rows)
    return schedules, report_df, messages


def _get_unscheduled_trajectories() -> pd.DataFrame:
    traj_df = _load_trajectories()
    if traj_df.empty:
        return traj_df

    sched_df = DataStore.load_df("supply_schedules")
    if sched_df.empty or "trajectory_id" not in sched_df.columns:
        return traj_df

    scheduled_ids = set(sched_df["trajectory_id"].dropna().tolist())
    return traj_df[~traj_df["trajectory_id"].isin(scheduled_ids)].reset_index(drop=True)


def _status_label(s: str) -> str:
    return {
        "pending": "待确认",
        "approved": "已通过",
        "rejected": "已驳回",
        "failed": "调度失败",
    }.get(s, s)


def get_schedules_with_summary() -> pd.DataFrame:
    df = DataStore.load_df("supply_schedules")
    if df.empty:
        return df
    df["状态显示"] = df["status"].apply(_status_label)
    if "supply_time" in df.columns:
        df["supply_time_dt"] = pd.to_datetime(df["supply_time"], errors="coerce")
        df = df.sort_values("supply_time_dt", na_position="last").drop(columns=["supply_time_dt"])
    return df.reset_index(drop=True)
