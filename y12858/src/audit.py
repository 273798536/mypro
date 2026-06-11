import pandas as pd
from datetime import datetime
from typing import List, Dict, Any, Optional

from src.models import AuditLog, SupplySchedule, DataStore


def log_change(schedule_id: str, field_name: str, old_value: Any, new_value: Any,
               operator: str = "场长", operation: str = "修改", remark: str = "") -> AuditLog:
    log = AuditLog(
        schedule_id=schedule_id,
        field_name=field_name,
        old_value=str(old_value) if old_value is not None else "",
        new_value=str(new_value) if new_value is not None else "",
        operator=operator,
        operation=operation,
        remark=remark,
    )
    DataStore.append("audit_logs", [log])
    return log


def approve_schedule(schedule_id: str, reviewer: str = "场长", note: str = "") -> Optional[SupplySchedule]:
    df = DataStore.load_df("supply_schedules")
    if df.empty or schedule_id not in df["schedule_id"].values:
        return None

    idx = df[df["schedule_id"] == schedule_id].index[0]
    old_status = df.at[idx, "status"]
    old_note = df.at[idx, "review_note"] if "review_note" in df.columns else ""

    df.at[idx, "status"] = "approved"
    df.at[idx, "reviewer"] = reviewer
    df.at[idx, "reviewed_at"] = datetime.now().isoformat()
    new_note = old_note
    if note:
        new_note = (old_note + "；" if old_note else "") + f"复核意见: {note}"
    df.at[idx, "review_note"] = new_note

    _save_schedules_df(df)

    log_change(
        schedule_id=schedule_id,
        field_name="status",
        old_value=old_status,
        new_value="approved",
        operator=reviewer,
        operation="复核通过",
        remark=note,
    )

    return _row_to_schedule(df.loc[idx])


def reject_schedule(schedule_id: str, reviewer: str = "场长", note: str = "") -> Optional[SupplySchedule]:
    df = DataStore.load_df("supply_schedules")
    if df.empty or schedule_id not in df["schedule_id"].values:
        return None

    idx = df[df["schedule_id"] == schedule_id].index[0]
    old_status = df.at[idx, "status"]

    df.at[idx, "status"] = "rejected"
    df.at[idx, "reviewer"] = reviewer
    df.at[idx, "reviewed_at"] = datetime.now().isoformat()
    if note:
        old_note = df.at[idx, "review_note"] if "review_note" in df.columns else ""
        df.at[idx, "review_note"] = (old_note + "；" if old_note else "") + f"驳回原因: {note}"

    _save_schedules_df(df)

    log_change(
        schedule_id=schedule_id,
        field_name="status",
        old_value=old_status,
        new_value="rejected",
        operator=reviewer,
        operation="复核驳回",
        remark=note,
    )

    return _row_to_schedule(df.loc[idx])


def update_schedule_field(schedule_id: str, field_name: str, new_value: Any,
                          operator: str = "场长", remark: str = "") -> Optional[SupplySchedule]:
    df = DataStore.load_df("supply_schedules")
    if df.empty or schedule_id not in df["schedule_id"].values:
        return None

    idx = df[df["schedule_id"] == schedule_id].index[0]
    old_value = df.at[idx, field_name] if field_name in df.columns else ""

    if str(old_value) == str(new_value):
        return _row_to_schedule(df.loc[idx])

    df.at[idx, field_name] = new_value
    _save_schedules_df(df)

    log_change(
        schedule_id=schedule_id,
        field_name=field_name,
        old_value=old_value,
        new_value=new_value,
        operator=operator,
        operation="字段修改",
        remark=remark,
    )

    return _row_to_schedule(df.loc[idx])


def get_audit_trail(schedule_id: str) -> pd.DataFrame:
    df = DataStore.load_df("audit_logs")
    if df.empty:
        return pd.DataFrame()
    filtered = df[df["schedule_id"] == schedule_id].copy()
    if "timestamp" in filtered.columns:
        filtered["timestamp"] = pd.to_datetime(filtered["timestamp"], errors="coerce")
        filtered = filtered.sort_values("timestamp", ascending=False)
    return filtered.reset_index(drop=True)


def get_change_summary(schedule_id: str) -> List[Dict[str, Any]]:
    trail = get_audit_trail(schedule_id)
    if trail.empty:
        return []

    changes: List[Dict[str, Any]] = []
    for _, row in trail.iterrows():
        changes.append({
            "时间": row.get("timestamp", ""),
            "操作人": row.get("operator", ""),
            "操作": row.get("operation", ""),
            "字段": row.get("field_name", ""),
            "原值": row.get("old_value", ""),
            "新值": row.get("new_value", ""),
            "备注": row.get("remark", ""),
        })
    return changes


def _save_schedules_df(df: pd.DataFrame) -> None:
    records = df.to_dict(orient="records")
    with open(DataStore._path("supply_schedules"), "w", encoding="utf-8") as f:
        import json
        json.dump(records, f, ensure_ascii=False, indent=2)


def _row_to_schedule(row: pd.Series) -> SupplySchedule:
    s = SupplySchedule()
    for col in s.__dict__.keys():
        if col in row.index:
            val = row[col]
            if pd.isna(val):
                continue
            if col in ["supply_time", "reviewed_at", "created_at"] and isinstance(val, str):
                from datetime import datetime as _dt
                try:
                    val = _dt.fromisoformat(val)
                except Exception:
                    pass
            setattr(s, col, val)
    return s
