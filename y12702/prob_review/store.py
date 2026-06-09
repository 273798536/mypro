import json
import os
import shutil
from typing import Dict, List, Optional
from .models import ProcessingRecord, file_hash


class Store:
    def __init__(self, output_dir: str):
        self.output_dir = os.path.abspath(output_dir)
        self.records_dir = os.path.join(self.output_dir, "records")
        self.reports_dir = os.path.join(self.output_dir, "reports")
        self.index_file = os.path.join(self.output_dir, "index.json")
        self._ensure_dirs()

    def _ensure_dirs(self):
        os.makedirs(self.records_dir, exist_ok=True)
        os.makedirs(self.reports_dir, exist_ok=True)
        if not os.path.exists(self.index_file):
            self._write_index({"by_hash": {}, "by_batch": {}, "by_source": {}})

    def _read_index(self) -> Dict:
        with open(self.index_file, "r", encoding="utf-8") as f:
            return json.load(f)

    def _write_index(self, data: Dict):
        with open(self.index_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def _record_path(self, record_id: str) -> str:
        return os.path.join(self.records_dir, f"{record_id}.json")

    def find_by_source_hash(self, source_hash: str) -> Optional[ProcessingRecord]:
        idx = self._read_index()
        rec_id = idx.get("by_hash", {}).get(source_hash)
        if rec_id and os.path.exists(self._record_path(rec_id)):
            return self.load_record(rec_id)
        return None

    def find_by_batch(self, batch_id: str) -> List[ProcessingRecord]:
        idx = self._read_index()
        rec_ids = idx.get("by_batch", {}).get(batch_id, [])
        result = []
        for rid in rec_ids:
            if os.path.exists(self._record_path(rid)):
                result.append(self.load_record(rid))
        return result

    def list_all_records(self) -> List[Dict]:
        idx = self._read_index()
        out = []
        for h, rid in idx.get("by_hash", {}).items():
            p = self._record_path(rid)
            if os.path.exists(p):
                with open(p, "r", encoding="utf-8") as f:
                    d = json.load(f)
                out.append({
                    "id": d["id"],
                    "source_file": d["source_file"],
                    "source_hash": d["source_hash"],
                    "batch_id": d["batch_id"],
                    "status": d["status"],
                    "error_count": len(d.get("errors", [])),
                    "updated_at": d.get("updated_at", d.get("created_at")),
                })
        out.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
        return out

    def save_record(self, record: ProcessingRecord) -> str:
        path = self._record_path(record.id)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(record.to_dict(), f, ensure_ascii=False, indent=2)

        idx = self._read_index()
        idx["by_hash"][record.source_hash] = record.id
        idx["by_batch"].setdefault(record.batch_id, [])
        if record.id not in idx["by_batch"][record.batch_id]:
            idx["by_batch"][record.batch_id].append(record.id)
        idx["by_source"].setdefault(record.source_file, [])
        if record.id not in idx["by_source"][record.source_file]:
            idx["by_source"][record.source_file].append(record.id)
        self._write_index(idx)
        return path

    def load_record(self, record_id: str) -> ProcessingRecord:
        path = self._record_path(record_id)
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return ProcessingRecord.from_dict(data)

    def update_record(self, record: ProcessingRecord):
        record.touch()
        self.save_record(record)

    def save_report(self, record_id: str, report_content: str, suffix: str = "") -> str:
        fname = f"report_{record_id}{('_' + suffix) if suffix else ''}.md"
        path = os.path.join(self.reports_dir, fname)
        with open(path, "w", encoding="utf-8") as f:
            f.write(report_content)
        return path
