import json
import hashlib
import os
from datetime import datetime
from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any

STATUS_OK = "ok"
STATUS_EXPIRED = "expired"
STATUS_MODIFIED = "modified"
STATUS_MISMATCH = "mismatch"
STATUS_PENDING = "pending"

STATUS_LABELS = {
    STATUS_OK: "正常通过",
    STATUS_EXPIRED: "授权到期",
    STATUS_MODIFIED: "口径已改",
    STATUS_MISMATCH: "曲目表与文件不符",
    STATUS_PENDING: "待确认",
}


def compute_hash(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()[:16]


@dataclass
class Track:
    title: str
    artist: str = ""
    duration: str = ""
    note: str = ""


@dataclass
class EncoreRecord:
    record_id: str
    version: int = 1
    filename: str = ""
    tracks: List[Track] = field(default_factory=list)
    supplementary_note: str = ""
    verbal_note: str = ""
    rehearsal_note: str = ""
    status: str = STATUS_PENDING
    status_detail: str = ""
    filename_hash: str = ""
    tracks_hash: str = ""
    combined_hash: str = ""
    created_at: str = ""
    updated_at: str = ""
    manual_annotations: List[str] = field(default_factory=list)
    delivery_checklist: List[Dict[str, Any]] = field(default_factory=list)
    change_log: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["status_label"] = STATUS_LABELS.get(self.status, self.status)
        return d

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "EncoreRecord":
        tracks = [Track(**t) for t in d.get("tracks", [])]
        filtered = {k: v for k, v in d.items() if k not in ("tracks", "status_label")}
        filtered["tracks"] = tracks
        return cls(**filtered)


class ArchiveStore:
    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.records_dir = os.path.join(data_dir, "records")
        self.index_path = os.path.join(data_dir, "index.json")
        os.makedirs(self.records_dir, exist_ok=True)
        if not os.path.exists(self.index_path):
            self._write_index({})

    def _read_index(self) -> Dict[str, Any]:
        with open(self.index_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _write_index(self, idx: Dict[str, Any]) -> None:
        with open(self.index_path, "w", encoding="utf-8") as f:
            json.dump(idx, f, ensure_ascii=False, indent=2)

    def _record_path(self, record_id: str, version: int) -> str:
        return os.path.join(self.records_dir, f"{record_id}_v{version}.json")

    def list_ids(self) -> List[str]:
        return sorted(self._read_index().keys())

    def get_latest_version(self, record_id: str) -> Optional[int]:
        idx = self._read_index()
        return idx.get(record_id, {}).get("latest_version")

    def load(self, record_id: str, version: Optional[int] = None) -> Optional[EncoreRecord]:
        v = version if version is not None else self.get_latest_version(record_id)
        if v is None:
            return None
        path = self._record_path(record_id, v)
        if not os.path.exists(path):
            return None
        with open(path, "r", encoding="utf-8") as f:
            return EncoreRecord.from_dict(json.load(f))

    def load_all_versions(self, record_id: str) -> List[EncoreRecord]:
        latest = self.get_latest_version(record_id)
        if latest is None:
            return []
        result = []
        for v in range(1, latest + 1):
            rec = self.load(record_id, v)
            if rec is not None:
                result.append(rec)
        return result

    def save(self, record: EncoreRecord) -> None:
        now = datetime.now().isoformat(timespec="seconds")
        if not record.created_at:
            record.created_at = now
        record.updated_at = now
        path = self._record_path(record.record_id, record.version)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(record.to_dict(), f, ensure_ascii=False, indent=2)
        idx = self._read_index()
        info = idx.get(record.record_id, {"versions": [], "latest_version": 0})
        if record.version not in info["versions"]:
            info["versions"].append(record.version)
        if record.version > info["latest_version"]:
            info["latest_version"] = record.version
        info["last_updated"] = now
        info["latest_status"] = record.status
        idx[record.record_id] = info
        self._write_index(idx)
