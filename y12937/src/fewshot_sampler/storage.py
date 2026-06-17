from __future__ import annotations

import json
import os
import shutil
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional

from fewshot_sampler.schemas import (
    AnomalyDetail,
    AnomalyType,
    FeedbackStatus,
    SampleBatch,
    SampleRecord,
)


def _json_default(o: Any) -> Any:
    if isinstance(o, datetime):
        return o.isoformat()
    if isinstance(o, (AnomalyType, FeedbackStatus)):
        return o.value
    try:
        return asdict(o)
    except TypeError:
        return str(o)


@dataclass
class BatchMeta:
    batch_id: str
    source_files: List[str]
    created_at: str
    description: str
    total_records: int
    anomaly_records: int
    storage_path: str


class RecordStorage:
    BATCH_DIRNAME = "batches"
    META_FILENAME = "meta.json"
    RECORDS_FILENAME = "records.json"
    ANOMALIES_FILENAME = "anomalies.jsonl"
    PLAYBACK_LOG = "playback_log.jsonl"
    INTERCEPT_LOG = "intercept_log.jsonl"

    def __init__(self, root_dir: str = "./.fewshot_storage"):
        self.root = Path(root_dir).resolve()
        self.batches_dir = self.root / self.BATCH_DIRNAME
        self.batches_dir.mkdir(parents=True, exist_ok=True)

    def save_batch(self, batch: SampleBatch) -> str:
        batch_dir = self.batches_dir / batch.batch_id
        if batch_dir.exists():
            shutil.rmtree(batch_dir)
        batch_dir.mkdir(parents=True)

        meta = BatchMeta(
            batch_id=batch.batch_id,
            source_files=list(batch.source_files),
            created_at=batch.created_at.isoformat(),
            description=batch.description,
            total_records=batch.total_count,
            anomaly_records=batch.anomaly_count,
            storage_path=str(batch_dir),
        )
        with open(batch_dir / self.META_FILENAME, "w", encoding="utf-8") as f:
            json.dump(asdict(meta), f, ensure_ascii=False, indent=2, default=_json_default)

        records_data = []
        for rec in batch.records:
            rec_dict = {
                "record_id": rec.record_id,
                "batch_id": rec.batch_id,
                "source_row_index": rec.source_row_index,
                "source_file": rec.source_file,
                "sample_source": rec.sample_source.value,
                "anomaly_score": rec.anomaly_score,
                "created_at": rec.created_at.isoformat(),
                "data": rec.data,
                "anomalies": [a.to_dict() for a in rec.anomalies],
                "anomaly_types": [a.anomaly_type.value for a in rec.anomalies],
            }
            records_data.append(rec_dict)

            with open(batch_dir / self.ANOMALIES_FILENAME, "a", encoding="utf-8") as af:
                for a in rec.anomalies:
                    anomaly_entry = {
                        "record_id": rec.record_id,
                        "batch_id": rec.batch_id,
                        **a.to_dict(),
                        "_anomaly_type_enum": a.anomaly_type.value,
                        "_severity_raw": a.severity,
                        "_timestamp": rec.created_at.isoformat(),
                    }
                    af.write(json.dumps(anomaly_entry, ensure_ascii=False) + "\n")

        with open(batch_dir / self.RECORDS_FILENAME, "w", encoding="utf-8") as f:
            json.dump(records_data, f, ensure_ascii=False, indent=2, default=_json_default)

        return str(batch_dir)

    def list_batches(self) -> List[BatchMeta]:
        result = []
        for batch_dir in sorted(self.batches_dir.iterdir(), reverse=True):
            if not batch_dir.is_dir():
                continue
            meta_path = batch_dir / self.META_FILENAME
            if meta_path.exists():
                try:
                    with open(meta_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    result.append(BatchMeta(**data))
                except (json.JSONDecodeError, TypeError):
                    pass
        return result

    def get_batch_meta(self, batch_id: str) -> Optional[BatchMeta]:
        meta_path = self.batches_dir / batch_id / self.META_FILENAME
        if not meta_path.exists():
            return None
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                return BatchMeta(**json.load(f))
        except (json.JSONDecodeError, TypeError):
            return None

    def load_records(self, batch_id: str) -> List[Dict[str, Any]]:
        rec_path = self.batches_dir / batch_id / self.RECORDS_FILENAME
        if not rec_path.exists():
            return []
        try:
            with open(rec_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, TypeError):
            return []

    def iter_anomalies(self, batch_id: str) -> Iterator[Dict[str, Any]]:
        anom_path = self.batches_dir / batch_id / self.ANOMALIES_FILENAME
        if not anom_path.exists():
            return
        with open(anom_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        yield json.loads(line)
                    except json.JSONDecodeError:
                        continue

    def log_playback(self, batch_id: str, record_id: str, action: str, user: str = "", note: str = "") -> None:
        entry = {
            "timestamp": datetime.now().isoformat(),
            "batch_id": batch_id,
            "record_id": record_id,
            "action": action,
            "user": user,
            "note": note,
        }
        log_path = self.batches_dir / batch_id / self.PLAYBACK_LOG
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    def log_intercept(
        self,
        batch_id: str,
        record_id: str,
        anomaly_type: str,
        decision: str,
        user: str = "",
        reason: str = "",
    ) -> None:
        entry = {
            "timestamp": datetime.now().isoformat(),
            "batch_id": batch_id,
            "record_id": record_id,
            "anomaly_type": anomaly_type,
            "decision": decision,
            "user": user,
            "reason": reason,
        }
        log_path = self.batches_dir / batch_id / self.INTERCEPT_LOG
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    def get_playback_log(self, batch_id: str, record_id: Optional[str] = None) -> List[Dict[str, Any]]:
        log_path = self.batches_dir / batch_id / self.PLAYBACK_LOG
        if not log_path.exists():
            return []
        result = []
        with open(log_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        entry = json.loads(line)
                        if record_id is None or entry.get("record_id") == record_id:
                            result.append(entry)
                    except json.JSONDecodeError:
                        continue
        return result

    def get_intercept_log(self, batch_id: str, record_id: Optional[str] = None) -> List[Dict[str, Any]]:
        log_path = self.batches_dir / batch_id / self.INTERCEPT_LOG
        if not log_path.exists():
            return []
        result = []
        with open(log_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        entry = json.loads(line)
                        if record_id is None or entry.get("record_id") == record_id:
                            result.append(entry)
                    except json.JSONDecodeError:
                        continue
        return result

    def get_shared_timeline(self, batch_id: str, record_id: Optional[str] = None) -> List[Dict[str, Any]]:
        timeline = []
        for entry in self.get_playback_log(batch_id, record_id):
            entry["_source"] = "评测回放"
            timeline.append(entry)
        for entry in self.get_intercept_log(batch_id, record_id):
            entry["_source"] = "安全拦截"
            timeline.append(entry)
        timeline.sort(key=lambda e: e.get("timestamp", ""))
        return timeline

    def delete_batch(self, batch_id: str) -> bool:
        batch_dir = self.batches_dir / batch_id
        if batch_dir.exists():
            shutil.rmtree(batch_dir)
            return True
        return False
