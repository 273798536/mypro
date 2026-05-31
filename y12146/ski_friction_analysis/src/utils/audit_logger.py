import json
import csv
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional

class AuditLogger:
    def __init__(self, log_dir: Path):
        self.log_dir = log_dir
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.audit_log_file = log_dir / "audit_trail.jsonl"
        self.manual_corrections_file = log_dir / "manual_corrections.csv"
        self._init_files()
    
    def _init_files(self):
        if not self.manual_corrections_file.exists():
            with open(self.manual_corrections_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow([
                    "timestamp", "corrector", "row_id", "field",
                    "old_value", "new_value", "reason"
                ])
    
    def log_import_start(self, file_path: str, user: str = "system"):
        entry = {
            "timestamp": datetime.now().isoformat(),
            "action": "import_start",
            "file": str(file_path),
            "user": user
        }
        self._append_log(entry)
    
    def log_import_complete(self, file_path: str, total_rows: int, 
                           valid_rows: int, bad_rows: int, user: str = "system"):
        entry = {
            "timestamp": datetime.now().isoformat(),
            "action": "import_complete",
            "file": str(file_path),
            "total_rows": total_rows,
            "valid_rows": valid_rows,
            "bad_rows": bad_rows,
            "user": user
        }
        self._append_log(entry)
    
    def log_bad_row(self, row_id: int, reason: str, data: Dict[str, Any]):
        entry = {
            "timestamp": datetime.now().isoformat(),
            "action": "bad_row_detected",
            "row_id": row_id,
            "reason": reason,
            "data": data
        }
        self._append_log(entry)
    
    def log_missing_friction(self, row_id: int, data: Dict[str, Any]):
        entry = {
            "timestamp": datetime.now().isoformat(),
            "action": "missing_friction_coeff",
            "row_id": row_id,
            "data": data
        }
        self._append_log(entry)
    
    def log_duplicate_segment(self, segment_id: str, row_ids: List[int]):
        entry = {
            "timestamp": datetime.now().isoformat(),
            "action": "duplicate_segment_detected",
            "segment_id": segment_id,
            "row_ids": row_ids
        }
        self._append_log(entry)
    
    def log_temperature_spike(self, segment_id: str, temp_change: float, 
                               prev_temp: float, curr_temp: float):
        entry = {
            "timestamp": datetime.now().isoformat(),
            "action": "temperature_spike_detected",
            "segment_id": segment_id,
            "temperature_change": temp_change,
            "previous_temperature": prev_temp,
            "current_temperature": curr_temp
        }
        self._append_log(entry)
    
    def log_manual_correction(self, row_id: int, field: str, 
                               old_value: Any, new_value: Any,
                               reason: str, corrector: str = "user"):
        entry = {
            "timestamp": datetime.now().isoformat(),
            "action": "manual_correction",
            "row_id": row_id,
            "field": field,
            "old_value": old_value,
            "new_value": new_value,
            "reason": reason,
            "corrector": corrector
        }
        self._append_log(entry)
        
        with open(self.manual_corrections_file, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                entry["timestamp"], corrector, row_id, field,
                old_value, new_value, reason
            ])
    
    def log_analysis_result(self, segment_id: str, result_type: str, data: Dict[str, Any]):
        entry = {
            "timestamp": datetime.now().isoformat(),
            "action": "analysis_result",
            "segment_id": segment_id,
            "result_type": result_type,
            "data": data
        }
        self._append_log(entry)
    
    def log_report_generated(self, report_path: str, user: str = "system"):
        entry = {
            "timestamp": datetime.now().isoformat(),
            "action": "report_generated",
            "report_path": report_path,
            "user": user
        }
        self._append_log(entry)
    
    def _append_log(self, entry: Dict[str, Any]):
        with open(self.audit_log_file, 'a', encoding='utf-8') as f:
            f.write(json.dumps(entry, ensure_ascii=False) + '\n')
    
    def get_correction_history(self, row_id: Optional[int] = None) -> List[Dict[str, Any]]:
        corrections = []
        if self.manual_corrections_file.exists():
            with open(self.manual_corrections_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if row_id is None or int(row["row_id"]) == row_id:
                        corrections.append(row)
        return corrections
    
    def get_log_entries(self, action: Optional[str] = None) -> List[Dict[str, Any]]:
        entries = []
        if self.audit_log_file.exists():
            with open(self.audit_log_file, 'r', encoding='utf-8') as f:
                for line in f:
                    if line.strip():
                        entry = json.loads(line)
                        if action is None or entry.get("action") == action:
                            entries.append(entry)
        return entries
