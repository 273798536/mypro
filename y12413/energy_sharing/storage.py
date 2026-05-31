from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Optional

from .models import (
    Alert,
    AuditEntry,
    MaintenanceRecord,
    MeterReading,
    ProjectContract,
    SharingResult,
)


class DataStore:
    def __init__(self, base_path: Optional[str] = None):
        if base_path is None:
            base_path = os.path.join(os.getcwd(), "energy_data")
        self.base_path = Path(base_path)
        self._ensure_dirs()

    def _ensure_dirs(self) -> None:
        for subdir in ["projects", "readings", "maintenance", "results", "audits", "alerts"]:
            (self.base_path / subdir).mkdir(parents=True, exist_ok=True)

    def _write_json(self, path: Path, data: dict) -> None:
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2, default=str))

    def _read_json(self, path: Path) -> Optional[dict]:
        if not path.exists():
            return None
        return json.loads(path.read_text())

    def save_project(self, project: ProjectContract) -> None:
        path = self.base_path / "projects" / f"{project.project_id}.json"
        self._write_json(path, project.model_dump())

    def load_project(self, project_id: str) -> Optional[ProjectContract]:
        path = self.base_path / "projects" / f"{project_id}.json"
        data = self._read_json(path)
        return ProjectContract(**data) if data else None

    def list_projects(self) -> list[ProjectContract]:
        projects = []
        for path in (self.base_path / "projects").glob("*.json"):
            data = self._read_json(path)
            if data:
                projects.append(ProjectContract(**data))
        return projects

    def save_reading(self, reading: MeterReading) -> None:
        project_dir = self.base_path / "readings" / reading.project_id
        project_dir.mkdir(parents=True, exist_ok=True)
        path = project_dir / f"{reading.reading_id}.json"
        self._write_json(path, reading.model_dump())

    def load_readings(self, project_id: str) -> list[MeterReading]:
        readings = []
        project_dir = self.base_path / "readings" / project_id
        if not project_dir.exists():
            return readings
        for path in project_dir.glob("*.json"):
            data = self._read_json(path)
            if data:
                readings.append(MeterReading(**data))
        return readings

    def load_readings_by_month(self, project_id: str, month: str) -> list[MeterReading]:
        return [r for r in self.load_readings(project_id) if r.month == month]

    def save_maintenance(self, record: MaintenanceRecord) -> None:
        project_dir = self.base_path / "maintenance" / record.project_id
        project_dir.mkdir(parents=True, exist_ok=True)
        path = project_dir / f"{record.record_id}.json"
        self._write_json(path, record.model_dump())

    def load_maintenance(self, project_id: str) -> list[MaintenanceRecord]:
        records = []
        project_dir = self.base_path / "maintenance" / project_id
        if not project_dir.exists():
            return records
        for path in project_dir.glob("*.json"):
            data = self._read_json(path)
            if data:
                records.append(MaintenanceRecord(**data))
        return records

    def save_result(self, result: SharingResult) -> None:
        project_dir = self.base_path / "results" / result.project_id
        project_dir.mkdir(parents=True, exist_ok=True)
        path = project_dir / f"v{result.version:03d}_{result.result_id}.json"
        self._write_json(path, result.model_dump())

    def load_results(self, project_id: str) -> list[SharingResult]:
        results = []
        project_dir = self.base_path / "results" / project_id
        if not project_dir.exists():
            return results
        for path in sorted(project_dir.glob("*.json")):
            data = self._read_json(path)
            if data:
                results.append(SharingResult(**data))
        return results

    def get_next_version(self, project_id: str) -> int:
        results = self.load_results(project_id)
        return len(results) + 1

    def save_audit(self, entry: AuditEntry) -> None:
        path = self.base_path / "audits" / f"{entry.audit_id}.json"
        self._write_json(path, entry.model_dump())

    def load_audits(self, entity_id: Optional[str] = None) -> list[AuditEntry]:
        audits = []
        for path in (self.base_path / "audits").glob("*.json"):
            data = self._read_json(path)
            if data:
                entry = AuditEntry(**data)
                if entity_id is None or entry.entity_id == entity_id:
                    audits.append(entry)
        return sorted(audits, key=lambda e: e.timestamp)

    def save_alert(self, alert: Alert) -> None:
        path = self.base_path / "alerts" / f"{alert.alert_id}.json"
        self._write_json(path, alert.model_dump())

    def load_alerts(self, project_id: Optional[str] = None) -> list[Alert]:
        alerts = []
        for path in (self.base_path / "alerts").glob("*.json"):
            data = self._read_json(path)
            if data:
                alert = Alert(**data)
                if project_id is None or alert.project_id == project_id:
                    alerts.append(alert)
        return sorted(alerts, key=lambda a: a.generated_at)
