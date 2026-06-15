import json
import os
import hashlib
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple

from .models import BoothRecord, VersionInfo, AnomalyRecord, BoothStatus, AnomalyType, AnomalyLevel
from .config import Config


class BoothStorage:
    def __init__(self, config: Config):
        self.config = config
        self.state_file = config["state_file"]
        self._records: Dict[str, BoothRecord] = {}
        self._load()

    def _load(self):
        if os.path.exists(self.state_file):
            try:
                with open(self.state_file, "r", encoding="utf-8") as f:
                    raw = json.load(f)
                for booth_id, data in raw.items():
                    self._records[booth_id] = self._dict_to_record(data)
            except (json.JSONDecodeError, KeyError, TypeError):
                self._records = {}

    def _save(self):
        os.makedirs(os.path.dirname(self.state_file), exist_ok=True)
        data = {bid: rec.to_dict() for bid, rec in self._records.items()}
        with open(self.state_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def _dict_to_record(self, data: Dict[str, Any]) -> BoothRecord:
        version = VersionInfo(**data.get("version", {}))
        anomalies = [
            AnomalyRecord(
                anomaly_id=a.get("anomaly_id", ""),
                type=AnomalyType(a["type"]) if isinstance(a.get("type"), str) else a.get("type", AnomalyType.OTHER),
                level=AnomalyLevel(a["level"]) if isinstance(a.get("level"), str) else a.get("level", AnomalyLevel.MINOR),
                description=a.get("description", ""),
                location=a.get("location", ""),
                suggestion=a.get("suggestion", ""),
                screenshot_hint=a.get("screenshot_hint", ""),
                detected_at=a.get("detected_at", ""),
                resolved=a.get("resolved", False),
                resolved_at=a.get("resolved_at"),
                resolver_note=a.get("resolver_note", "")
            )
            for a in data.get("anomalies", [])
        ]
        rec = BoothRecord(
            booth_id=data.get("booth_id", ""),
            booth_name=data.get("booth_name", ""),
            performer=data.get("performer", ""),
            contact=data.get("contact", ""),
            authorization_period=data.get("authorization_period", ""),
            authorization_visible=data.get("authorization_visible", True),
            setlist_complete=data.get("setlist_complete", True),
            timing_offset_ms=data.get("timing_offset_ms", 0),
            raw_data=data.get("raw_data", {}),
            version=version,
            status=BoothStatus(data["status"]) if isinstance(data.get("status"), str) else data.get("status", BoothStatus.PENDING),
            anomalies=anomalies,
            history=data.get("history", []),
            created_at=data.get("created_at", ""),
            updated_at=data.get("updated_at", ""),
            operator=data.get("operator", "")
        )
        return rec

    def get(self, booth_id: str) -> Optional[BoothRecord]:
        return self._records.get(booth_id)

    def get_all(self) -> List[BoothRecord]:
        return list(self._records.values())

    def get_by_status(self, status: BoothStatus) -> List[BoothRecord]:
        return [r for r in self._records.values() if r.status == status]

    def upsert(self, record: BoothRecord, operator: str = "") -> Tuple[bool, str]:
        existing = self._records.get(record.booth_id)
        if existing:
            if self._is_older_version(record.version, existing.version):
                return False, f"版本冲突：传入版本({record.version.version_id[:8]})早于现有版本({existing.version.version_id[:8]})，未覆盖。请手动确认。"
            record.history = existing.history + record.history
            record.created_at = existing.created_at
            record.add_history("增量更新", f"从来源 {record.version.source} 导入新版数据", operator)
        else:
            record.add_history("创建记录", f"初始导入，来源：{record.version.source}", operator)
        self._records[record.booth_id] = record
        self._save()
        return True, "记录已保存"

    def _is_older_version(self, new_ver: VersionInfo, old_ver: VersionInfo) -> bool:
        if not old_ver.imported_at or not new_ver.imported_at:
            return False
        return new_ver.imported_at < old_ver.imported_at

    def update_status(self, booth_id: str, status: BoothStatus, note: str = "", operator: str = ""):
        rec = self._records.get(booth_id)
        if rec:
            old = rec.status.value
            rec.status = status
            rec.add_history("状态变更", f"{old} → {status.value}：{note}", operator)
            self._save()

    def add_anomaly(self, booth_id: str, anomaly: AnomalyRecord, operator: str = ""):
        rec = self._records.get(booth_id)
        if rec:
            rec.anomalies.append(anomaly)
            if anomaly.level in (AnomalyLevel.MAJOR, AnomalyLevel.CRITICAL):
                if rec.status == BoothStatus.PASSED:
                    self.update_status(booth_id, BoothStatus.NEED_REVIEW, f"新增异常：{anomaly.type.value}", operator)
            rec.add_history("新增异常", f"{anomaly.type.value} - {anomaly.description}", operator)
            self._save()

    def resolve_anomaly(self, booth_id: str, anomaly_id: str, note: str = "", operator: str = ""):
        rec = self._records.get(booth_id)
        if rec:
            for a in rec.anomalies:
                if a.anomaly_id == anomaly_id:
                    a.resolved = True
                    a.resolved_at = __import__("datetime").datetime.now().isoformat()
                    a.resolver_note = note
                    rec.add_history("异常解决", f"{a.type.value}：{note}", operator)
                    self._save()
                    return True
        return False

    def get_version_info(self, booth_id: str) -> Optional[Dict[str, Any]]:
        rec = self._records.get(booth_id)
        if rec:
            return {
                "current": rec.version.to_dict(),
                "history_count": len(rec.history),
                "suggestion": "如需覆盖，请使用 --force 参数或手动导出后编辑再导入"
            }
        return None

    @staticmethod
    def compute_file_hash(file_path: str) -> str:
        h = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        return h.hexdigest()
