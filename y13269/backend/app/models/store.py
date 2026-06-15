from typing import Dict, List, Optional
from datetime import datetime
import uuid
import json
from pathlib import Path
import threading

from app.schemas.charge import ChargeRecord, UnifiedNote, ImportBatch, SourceRef


class InMemoryDB:
    def __init__(self):
        self._lock = threading.RLock()
        self.records: Dict[str, ChargeRecord] = {}
        self.unified_notes: Dict[str, UnifiedNote] = {}
        self.batches: Dict[str, ImportBatch] = {}
        self._persist_path = Path(__file__).resolve().parent.parent.parent / "data_store.json"

    def add_record(self, record: ChargeRecord) -> ChargeRecord:
        with self._lock:
            self.records[record.id] = record
            return record

    def get_record(self, record_id: str) -> Optional[ChargeRecord]:
        with self._lock:
            return self.records.get(record_id)

    def list_records(self) -> List[ChargeRecord]:
        with self._lock:
            return list(self.records.values())

    def update_record(self, record_id: str, **kwargs) -> Optional[ChargeRecord]:
        with self._lock:
            rec = self.records.get(record_id)
            if not rec:
                return None
            for k, v in kwargs.items():
                if hasattr(rec, k):
                    setattr(rec, k, v)
            rec.updated_at = datetime.now()
            rec.version += 1
            return rec

    def add_unified_note(self, note: UnifiedNote) -> UnifiedNote:
        with self._lock:
            self.unified_notes[note.id] = note
            return note

    def get_unified_note(self, note_id: str) -> Optional[UnifiedNote]:
        with self._lock:
            return self.unified_notes.get(note_id)

    def list_unified_notes(self) -> List[UnifiedNote]:
        with self._lock:
            return list(self.unified_notes.values())

    def add_batch(self, batch: ImportBatch) -> ImportBatch:
        with self._lock:
            self.batches[batch.id] = batch
            return batch

    def list_batches(self) -> List[ImportBatch]:
        with self._lock:
            return list(self.batches.values())

    def find_similar_records(self, community_name: str, intersection: str = None,
                              longitude: float = None, latitude: float = None,
                              threshold: float = 80.0) -> List[ChargeRecord]:
        with self._lock:
            results = []
            for rec in self.records.values():
                if rec.community_name != community_name:
                    continue
                if intersection and rec.intersection and intersection == rec.intersection:
                    results.append(rec)
                    continue
                if longitude is not None and latitude is not None \
                        and rec.longitude is not None and rec.latitude is not None:
                    dist = self._haversine(longitude, latitude, rec.longitude, rec.latitude)
                    if dist <= threshold:
                        results.append(rec)
            return results

    @staticmethod
    def _haversine(lon1, lat1, lon2, lat2):
        import math
        lon1, lat1, lon2, lat2 = map(math.radians, [lon1, lat1, lon2, lat2])
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
        c = 2 * math.asin(math.sqrt(a))
        return c * 6371000

    def save_to_disk(self):
        with self._lock:
            data = {
                "records": [r.model_dump(mode="json") for r in self.records.values()],
                "unified_notes": [n.model_dump(mode="json") for n in self.unified_notes.values()],
                "batches": [b.model_dump(mode="json") for b in self.batches.values()],
            }
            self._persist_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self._persist_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

    def load_from_disk(self):
        with self._lock:
            if not self._persist_path.exists():
                return
            try:
                with open(self._persist_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self.records = {r["id"]: ChargeRecord(**r) for r in data.get("records", [])}
                self.unified_notes = {n["id"]: UnifiedNote(**n) for n in data.get("unified_notes", [])}
                self.batches = {b["id"]: ImportBatch(**b) for b in data.get("batches", [])}
            except Exception:
                pass


db = InMemoryDB()
db.load_from_disk()
