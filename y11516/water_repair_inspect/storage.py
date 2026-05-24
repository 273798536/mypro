import json
import os
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Iterator, Tuple
from .models import RepairRecord, RecordStatus, DataSourceType


class RecordStorage:
    def __init__(self, base_dir: str):
        self.base_dir = Path(base_dir)
        self.data_dir = self.base_dir / "data"
        self.records_dir = self.data_dir / "records"
        self.history_dir = self.data_dir / "history"
        self.exports_dir = self.base_dir / "exports"
        self._ensure_dirs()

    def _ensure_dirs(self) -> None:
        for dir_path in [self.data_dir, self.records_dir, self.history_dir, self.exports_dir]:
            dir_path.mkdir(parents=True, exist_ok=True)

    def _get_record_path(self, record_id: str) -> Path:
        return self.records_dir / f"{record_id}.json"

    def save_record(self, record: RepairRecord) -> None:
        record.updated_at = datetime.now().isoformat()
        record_path = self._get_record_path(record.record_id)
        
        if record_path.exists():
            self._save_history(record.record_id)
        
        with open(record_path, 'w', encoding='utf-8') as f:
            json.dump(record.to_dict(), f, ensure_ascii=False, indent=2)

    def _save_history(self, record_id: str) -> None:
        record_path = self._get_record_path(record_id)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        history_path = self.history_dir / f"{record_id}_{timestamp}.json"
        
        with open(record_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        with open(history_path, 'w', encoding='utf-8') as f:
            f.write(content)

    def get_record(self, record_id: str) -> Optional[RepairRecord]:
        record_path = self._get_record_path(record_id)
        if not record_path.exists():
            return None
        
        with open(record_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return RepairRecord.from_dict(data)

    def find_by_business_key(self, source_type: DataSourceType, business_key: str) -> Optional[RepairRecord]:
        record_id = f"{source_type.value}_{business_key}"
        return self.get_record(record_id)

    def iterate_records(self, source_type: Optional[DataSourceType] = None,
                        status: Optional[RecordStatus] = None) -> Iterator[RepairRecord]:
        for file_path in self.records_dir.glob("*.json"):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                record = RepairRecord.from_dict(data)
                
                if source_type and record.source_type != source_type:
                    continue
                if status and record.status != status:
                    continue
                
                yield record
            except Exception:
                continue

    def get_all_records(self, source_type: Optional[DataSourceType] = None,
                        status: Optional[RecordStatus] = None) -> List[RepairRecord]:
        return list(self.iterate_records(source_type, status))

    def count_records(self, source_type: Optional[DataSourceType] = None,
                      status: Optional[RecordStatus] = None) -> int:
        return sum(1 for _ in self.iterate_records(source_type, status))

    def get_record_history(self, record_id: str) -> List[Tuple[str, Dict]]:
        history_files = sorted(self.history_dir.glob(f"{record_id}_*.json"))
        history = []
        
        for file_path in history_files:
            timestamp = file_path.stem.replace(f"{record_id}_", "")
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            history.append((timestamp, data))
        
        return history

    def delete_record(self, record_id: str) -> bool:
        record_path = self._get_record_path(record_id)
        if record_path.exists():
            self._save_history(record_id)
            record_path.unlink()
            return True
        return False

    def get_file_hash(self, file_path: str) -> str:
        hasher = hashlib.sha256()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                hasher.update(chunk)
        return hasher.hexdigest()

    def get_export_path(self, filename: str) -> Path:
        return self.exports_dir / filename
