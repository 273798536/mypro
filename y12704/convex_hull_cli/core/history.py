import json
import os
import pickle
from datetime import datetime
from typing import List, Optional, Dict, Any
from .models import HistorySnapshot, CalculationResult


class HistoryManager:
    def __init__(self, history_dir: str = "./history"):
        self.history_dir = history_dir
        self.index_file = os.path.join(history_dir, "index.json")
        os.makedirs(history_dir, exist_ok=True)
        self._init_index()

    def _init_index(self):
        if not os.path.exists(self.index_file):
            with open(self.index_file, "w", encoding="utf-8") as f:
                json.dump({"snapshots": [], "current_version": None}, f, ensure_ascii=False, indent=2)

    def _load_index(self) -> Dict[str, Any]:
        with open(self.index_file, "r", encoding="utf-8") as f:
            return json.load(f)

    def _save_index(self, index: Dict[str, Any]):
        with open(self.index_file, "w", encoding="utf-8") as f:
            json.dump(index, f, ensure_ascii=False, indent=2, default=str)

    def _next_version(self) -> str:
        index = self._load_index()
        n = len(index["snapshots"]) + 1
        return f"v{n:03d}"

    def save_snapshot(self, result: CalculationResult, chart_path: Optional[str] = None,
                      change_reason: str = "") -> HistorySnapshot:
        version = self._next_version()
        timestamp = datetime.now()
        snapshot = HistorySnapshot(
            version=version,
            timestamp=timestamp,
            result=result,
            chart_path=chart_path,
            change_reason=change_reason
        )

        snap_file = os.path.join(self.history_dir, f"{version}.pkl")
        with open(snap_file, "wb") as f:
            pickle.dump(snapshot, f)

        index = self._load_index()
        index["snapshots"].append({
            "version": version,
            "timestamp": timestamp.isoformat(),
            "result_id": result.result_id,
            "chart_path": chart_path,
            "change_reason": change_reason,
            "is_valid": result.is_valid,
            "raw_area": result.raw_area,
            "parameter_version": result.parameter_version
        })
        index["current_version"] = version
        self._save_index(index)
        return snapshot

    def list_snapshots(self) -> List[Dict[str, Any]]:
        return self._load_index()["snapshots"]

    def load_snapshot(self, version: str) -> Optional[HistorySnapshot]:
        snap_file = os.path.join(self.history_dir, f"{version}.pkl")
        if not os.path.exists(snap_file):
            return None
        with open(snap_file, "rb") as f:
            return pickle.load(f)

    def get_latest(self) -> Optional[HistorySnapshot]:
        index = self._load_index()
        if index["snapshots"]:
            latest_version = index["snapshots"][-1]["version"]
            return self.load_snapshot(latest_version)
        return None

    def compare(self, version_a: str, version_b: str) -> Dict[str, Any]:
        a = self.load_snapshot(version_a)
        b = self.load_snapshot(version_b)
        if not a or not b:
            return {"error": "找不到指定版本快照"}

        affected = a.affected_conclusions(b)
        return {
            "version_a": version_a,
            "version_b": version_b,
            "timestamp_a": a.timestamp.isoformat(),
            "timestamp_b": b.timestamp.isoformat(),
            "affected_conclusions": affected,
            "area_a": a.result.raw_area,
            "area_b": b.result.raw_area,
            "area_diff": b.result.raw_area - a.result.raw_area,
            "unit_a": a.result.unit,
            "unit_b": b.result.unit,
            "param_a": a.result.parameter_version,
            "param_b": b.result.parameter_version,
            "anomalies_a_blocking": len(a.result.blocking_anomalies),
            "anomalies_b_blocking": len(b.result.blocking_anomalies),
            "change_reason_a": a.change_reason,
            "change_reason_b": b.change_reason
        }

    def has_pending_parameter_update(self, expected_version: str) -> bool:
        latest = self.get_latest()
        if not latest:
            return False
        return (latest.result.parameter_version is not None
                and latest.result.parameter_version != expected_version)
