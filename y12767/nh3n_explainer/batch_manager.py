import json
import os
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Optional, List

from .models import BatchRecord


BATCH_INDEX_FILE = "batch_index.json"
BATCH_DATA_DIR = ".batch_data"


class BatchManager:
    def __init__(self, input_dir: str, output_dir: str):
        self.input_dir = os.path.abspath(input_dir)
        self.output_dir = os.path.abspath(output_dir)
        self.batch_data_path = os.path.join(self.output_dir, BATCH_DATA_DIR)
        self.index_path = os.path.join(self.output_dir, BATCH_INDEX_FILE)
        self._ensure_dirs()

    def _ensure_dirs(self):
        os.makedirs(self.output_dir, exist_ok=True)
        os.makedirs(self.batch_data_path, exist_ok=True)

    def _compute_input_hash(self) -> str:
        hasher = hashlib.sha256()
        files = sorted(Path(self.input_dir).rglob("*"))
        for f in files:
            if f.is_file():
                hasher.update(str(f.relative_to(self.input_dir)).encode("utf-8"))
                hasher.update(str(f.stat().st_size).encode("utf-8"))
                hasher.update(str(f.stat().st_mtime).encode("utf-8"))
        return hasher.hexdigest()[:16]

    def _load_index(self) -> dict:
        if not os.path.exists(self.index_path):
            return {"batches": {}}
        with open(self.index_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _save_index(self, index: dict):
        with open(self.index_path, "w", encoding="utf-8") as f:
            json.dump(index, f, ensure_ascii=False, indent=2, default=str)

    def find_existing_batch(self) -> Optional[BatchRecord]:
        input_hash = self._compute_input_hash()
        index = self._load_index()
        for batch_id, info in index.get("batches", {}).items():
            if info.get("input_hash") == input_hash and info.get("status") == "completed":
                return self._load_batch(batch_id)
        return None

    def create_batch(self, batch_name: Optional[str] = None) -> BatchRecord:
        input_hash = self._compute_input_hash()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        batch_id = f"NH3N_{timestamp}_{input_hash[:8]}"
        if not batch_name:
            batch_name = f"氨氮监测批次_{timestamp}"

        batch = BatchRecord(
            batch_id=batch_id,
            batch_name=batch_name,
            created_at=datetime.now(),
            input_dir=self.input_dir,
            output_dir=self.output_dir,
            status="processing",
        )

        index = self._load_index()
        index["batches"][batch_id] = {
            "batch_name": batch_name,
            "created_at": str(batch.created_at),
            "input_hash": input_hash,
            "input_dir": self.input_dir,
            "status": "processing",
            "data_file": self._batch_file_path(batch_id),
        }
        self._save_index(index)
        self._save_batch(batch)
        return batch

    def _batch_file_path(self, batch_id: str) -> str:
        return os.path.join(self.batch_data_path, f"{batch_id}.json")

    def _load_batch(self, batch_id: str) -> Optional[BatchRecord]:
        path = self._batch_file_path(batch_id)
        if not os.path.exists(path):
            return None
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return BatchRecord(
            batch_id=data["batch_id"],
            batch_name=data["batch_name"],
            created_at=datetime.fromisoformat(data["created_at"]),
            input_dir=data["input_dir"],
            output_dir=data["output_dir"],
            status=data.get("status", "pending"),
            monitor_count=data.get("monitor_count", 0),
            reagent_count=data.get("reagent_count", 0),
            anomaly_count=data.get("anomaly_count", 0),
            processed_monitor_ids=data.get("processed_monitor_ids", []),
            extra=data.get("extra", {}),
        )

    def _save_batch(self, batch: BatchRecord):
        path = self._batch_file_path(batch.batch_id)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(
                {
                    "batch_id": batch.batch_id,
                    "batch_name": batch.batch_name,
                    "created_at": batch.created_at.isoformat(),
                    "input_dir": batch.input_dir,
                    "output_dir": batch.output_dir,
                    "status": batch.status,
                    "monitor_count": batch.monitor_count,
                    "reagent_count": batch.reagent_count,
                    "anomaly_count": batch.anomaly_count,
                    "processed_monitor_ids": batch.processed_monitor_ids,
                    "extra": batch.extra,
                },
                f,
                ensure_ascii=False,
                indent=2,
            )

        index = self._load_index()
        if batch.batch_id in index.get("batches", {}):
            index["batches"][batch.batch_id]["status"] = batch.status
            index["batches"][batch.batch_id]["monitor_count"] = batch.monitor_count
            index["batches"][batch.batch_id]["reagent_count"] = batch.reagent_count
            index["batches"][batch.batch_id]["anomaly_count"] = batch.anomaly_count
            self._save_index(index)

    def complete_batch(self, batch: BatchRecord):
        batch.status = "completed"
        self._save_batch(batch)

    def list_batches(self) -> List[dict]:
        index = self._load_index()
        result = []
        for bid, info in index.get("batches", {}).items():
            result.append({
                "batch_id": bid,
                "batch_name": info.get("batch_name", ""),
                "created_at": info.get("created_at", ""),
                "status": info.get("status", ""),
                "anomaly_count": info.get("anomaly_count", 0),
            })
        return sorted(result, key=lambda x: x["created_at"], reverse=True)

    def save_processing_results(
        self,
        batch: BatchRecord,
        monitor_records: list,
        reagent_records: list,
        anomaly_records: list,
    ):
        batch.monitor_count = len(monitor_records)
        batch.reagent_count = len(reagent_records)
        batch.anomaly_count = len(anomaly_records)
        batch.processed_monitor_ids = [m.record_id for m in monitor_records]

        result_data = {
            "batch_id": batch.batch_id,
            "batch_name": batch.batch_name,
            "created_at": batch.created_at.isoformat(),
            "monitor_records": [self._monitor_to_dict(m) for m in monitor_records],
            "reagent_records": [self._reagent_to_dict(r) for r in reagent_records],
            "anomaly_records": [self._anomaly_to_dict(a) for a in anomaly_records],
        }
        path = os.path.join(self.batch_data_path, f"{batch.batch_id}_results.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(result_data, f, ensure_ascii=False, indent=2, default=str)

        batch.extra["results_file"] = path
        self._save_batch(batch)
        return result_data

    def load_processing_results(self, batch_id: str) -> Optional[dict]:
        path = os.path.join(self.batch_data_path, f"{batch_id}_results.json")
        if not os.path.exists(path):
            return None
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _monitor_to_dict(self, m) -> dict:
        return {
            "record_id": m.record_id,
            "sample_id": m.sample_id,
            "sample_name": m.sample_name,
            "monitor_date": m.monitor_date.isoformat() if m.monitor_date else None,
            "blank_control_value": m.blank_control_value,
            "blank_control_unit": m.blank_control_unit,
            "sample_value": m.sample_value,
            "sample_unit": m.sample_unit,
            "standard_curve_id": m.standard_curve_id,
            "operator": m.operator,
            "reviewer": m.reviewer,
            "remarks": m.remarks,
            "reagent_ids": m.reagent_ids,
        }

    def _reagent_to_dict(self, r) -> dict:
        return {
            "reagent_id": r.reagent_id,
            "name": r.name,
            "batch_no": r.batch_no,
            "manufacturer": r.manufacturer,
            "open_date": r.open_date.isoformat() if r.open_date else None,
            "expiry_date": r.expiry_date.isoformat() if r.expiry_date else None,
            "volume_used": r.volume_used,
            "volume_unit": r.volume_unit,
            "operator": r.operator,
            "remarks": r.remarks,
        }

    def _anomaly_to_dict(self, a) -> dict:
        return {
            "anomaly_id": a.anomaly_id,
            "monitor_record_id": a.monitor_record_id,
            "anomaly_type": a.anomaly_type,
            "severity": a.severity,
            "description": a.description,
            "plain_explanation": a.plain_explanation,
            "reagent_evidence": a.reagent_evidence,
            "related_fields": a.related_fields,
            "retest_suggestion": a.retest_suggestion,
            "balance_calc": a.balance_calc,
            "action_suggestion": a.action_suggestion,
            "created_at": a.created_at.isoformat(),
        }
