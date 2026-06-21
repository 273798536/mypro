import json
import os
import threading
from typing import Dict, List, Optional, Any
from datetime import datetime

from .models import FailureQueueRecord, AuditLogEntry, VersionDiff, EvidenceSnapshot


class Storage:
    def __init__(self, data_dir: str = "./data"):
        self.data_dir = data_dir
        self._lock = threading.Lock()
        self._ensure_dirs()

    def _ensure_dirs(self) -> None:
        os.makedirs(self.data_dir, exist_ok=True)
        os.makedirs(os.path.join(self.data_dir, "evidence_archive"), exist_ok=True)

    def _queue_path(self) -> str:
        return os.path.join(self.data_dir, "failure_queue.json")

    def _audit_path(self) -> str:
        return os.path.join(self.data_dir, "audit_log.json")

    def _diffs_path(self) -> str:
        return os.path.join(self.data_dir, "version_diffs.json")

    def _read_json(self, path: str) -> Any:
        if not os.path.exists(path):
            return {}
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _write_json(self, path: str, data: Any) -> None:
        tmp = path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(tmp, path)

    def load_queue(self) -> Dict[str, FailureQueueRecord]:
        with self._lock:
            raw = self._read_json(self._queue_path())
            result = {}
            for run_id, rec_data in raw.items():
                result[run_id] = FailureQueueRecord.from_dict(rec_data)
            return result

    def save_queue(self, queue: Dict[str, FailureQueueRecord]) -> None:
        with self._lock:
            data = {rid: rec.to_dict() for rid, rec in queue.items()}
            self._write_json(self._queue_path(), data)

    def get_record(self, run_id: str) -> Optional[FailureQueueRecord]:
        queue = self.load_queue()
        return queue.get(run_id)

    def upsert_record(self, record: FailureQueueRecord) -> None:
        queue = self.load_queue()
        queue[record.run_id] = record
        self.save_queue(queue)

    def archive_evidence(self, run_id: str, evidence: EvidenceSnapshot, suffix: str = "") -> str:
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe = run_id.replace("/", "_").replace("\\", "_")
        fname = f"{safe}_{ts}{('_'+suffix) if suffix else ''}.json"
        fpath = os.path.join(self.data_dir, "evidence_archive", fname)
        with self._lock:
            self._write_json(fpath, evidence.to_dict())
        return fpath

    def append_audit(self, entry: AuditLogEntry) -> None:
        with self._lock:
            data = self._read_json(self._audit_path())
            if not isinstance(data, list):
                data = []
            data.append(entry.to_dict())
            self._write_json(self._audit_path(), data)

    def get_audit_by_run(self, run_id: str) -> List[Dict[str, Any]]:
        data = self._read_json(self._audit_path())
        if not isinstance(data, list):
            return []
        return [e for e in data if e.get("run_id") == run_id]

    def save_version_diff(self, diff: VersionDiff) -> None:
        with self._lock:
            data = self._read_json(self._diffs_path())
            if not isinstance(data, dict):
                data = {}
            key = f"{diff.run_id}__{diff.base_version}__{diff.current_version}"
            data[key] = diff.to_dict()
            self._write_json(self._diffs_path(), data)

    def get_version_diffs(self, run_id: str) -> List[Dict[str, Any]]:
        data = self._read_json(self._diffs_path())
        if not isinstance(data, dict):
            return []
        return [v for v in data.values() if v.get("run_id") == run_id]
