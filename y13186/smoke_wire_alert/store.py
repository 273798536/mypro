from __future__ import annotations

import json
import os
import shutil
from datetime import datetime
from typing import List, Optional, Dict, Any

from .models import WindTunnelSmokeAlert


class AlertStore:

    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.alerts_dir = os.path.join(data_dir, "alerts")
        self.reports_dir = os.path.join(data_dir, "reports")
        self.backup_dir = os.path.join(data_dir, "backups")
        self.index_path = os.path.join(data_dir, "index.json")
        os.makedirs(self.alerts_dir, exist_ok=True)
        os.makedirs(self.reports_dir, exist_ok=True)
        os.makedirs(self.backup_dir, exist_ok=True)

    def _read_index(self) -> List[str]:
        if not os.path.exists(self.index_path):
            return []
        try:
            with open(self.index_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

    def _write_index(self, ids: List[str]) -> None:
        with open(self.index_path, "w", encoding="utf-8") as f:
            json.dump(ids, f, ensure_ascii=False, indent=2)

    def save(self, alert: WindTunnelSmokeAlert, backup: bool = True) -> str:
        if backup:
            self._backup(alert)
        path = os.path.join(self.alerts_dir, f"{alert.id}.json")
        with open(path, "w", encoding="utf-8") as f:
            f.write(alert.to_json())
        index = self._read_index()
        if alert.id not in index:
            index.append(alert.id)
            self._write_index(index)
        return path

    def save_batch(self, alerts: List[WindTunnelSmokeAlert]) -> List[str]:
        return [self.save(a) for a in alerts]

    def load(self, alert_id: str) -> Optional[WindTunnelSmokeAlert]:
        path = os.path.join(self.alerts_dir, f"{alert_id}.json")
        if not os.path.exists(path):
            return None
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return WindTunnelSmokeAlert.from_dict(data)

    def load_all(self) -> List[WindTunnelSmokeAlert]:
        alerts = []
        for aid in self._read_index():
            a = self.load(aid)
            if a:
                alerts.append(a)
        return alerts

    def _backup(self, alert: WindTunnelSmokeAlert) -> None:
        path = os.path.join(self.alerts_dir, f"{alert.id}.json")
        if os.path.exists(path):
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_path = os.path.join(self.backup_dir, f"{alert.id}_{ts}.json")
            shutil.copy2(path, backup_path)

    def list_report_paths(self) -> List[str]:
        if not os.path.exists(self.reports_dir):
            return []
        files = [
            f for f in os.listdir(self.reports_dir)
            if f.endswith(".md")
        ]
        files.sort(reverse=True)
        return [os.path.join(self.reports_dir, f) for f in files]

    def latest_report_path(self) -> Optional[str]:
        reports = self.list_report_paths()
        return reports[0] if reports else None

    def new_report_path(self, suffix: str = "") -> str:
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        name = f"风洞烟线预警报告_{ts}{suffix}.md"
        return os.path.join(self.reports_dir, name)
