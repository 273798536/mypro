import json
import os
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum


class GapStatus(Enum):
    OPEN = "open"
    RECHECKING = "rechecking"
    SUPPLEMENTED = "supplemented"
    CONFIRMED = "confirmed"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"


@dataclass
class GapRecord:
    id: str
    table_name: str
    gap_type: str
    description: str
    gap_size: int
    severity: str
    status: GapStatus = GapStatus.OPEN
    first_detected: str = ""
    last_checked: str = ""
    recheck_count: int = 0
    supplement_notes: List[str] = field(default_factory=list)
    confirm_notes: List[str] = field(default_factory=list)
    history: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "table_name": self.table_name,
            "gap_type": self.gap_type,
            "description": self.description,
            "gap_size": self.gap_size,
            "severity": self.severity,
            "status": self.status.value,
            "first_detected": self.first_detected,
            "last_checked": self.last_checked,
            "recheck_count": self.recheck_count,
            "supplement_notes": self.supplement_notes,
            "confirm_notes": self.confirm_notes,
            "history": self.history,
        }


@dataclass
class TriologyResult:
    recheck_result: Dict[str, Any] = field(default_factory=dict)
    supplement_result: Dict[str, Any] = field(default_factory=dict)
    confirm_result: Dict[str, Any] = field(default_factory=dict)
    all_completed: bool = False


class GapHandler:
    def __init__(self, storage_path: str = "./gap_records"):
        self.storage_path = storage_path
        os.makedirs(storage_path, exist_ok=True)

    def _record_file(self, record_id: str) -> str:
        return os.path.join(self.storage_path, f"gap_{record_id}.json")

    def create_gap(self, table_name: str, gap_type: str, description: str,
                   gap_size: int, severity: str = "medium") -> GapRecord:
        record_id = f"{table_name}_{gap_type}_{int(datetime.now().timestamp())}"
        now = datetime.now().isoformat()
        record = GapRecord(
            id=record_id,
            table_name=table_name,
            gap_type=gap_type,
            description=description,
            gap_size=gap_size,
            severity=severity,
            first_detected=now,
            last_checked=now,
            history=[{"time": now, "action": "detected", "detail": "首次发现备份缺口"}],
        )
        self._save(record)
        return record

    def _save(self, record: GapRecord):
        with open(self._record_file(record.id), "w", encoding="utf-8") as f:
            json.dump(record.to_dict(), f, ensure_ascii=False, indent=2)

    def load(self, record_id: str) -> Optional[GapRecord]:
        filepath = self._record_file(record_id)
        if not os.path.exists(filepath):
            return None
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        return GapRecord(
            id=data["id"],
            table_name=data["table_name"],
            gap_type=data["gap_type"],
            description=data["description"],
            gap_size=data["gap_size"],
            severity=data["severity"],
            status=GapStatus(data["status"]),
            first_detected=data.get("first_detected", ""),
            last_checked=data.get("last_checked", ""),
            recheck_count=data.get("recheck_count", 0),
            supplement_notes=data.get("supplement_notes", []),
            confirm_notes=data.get("confirm_notes", []),
            history=data.get("history", []),
        )

    def recheck(self, record: GapRecord, new_gap_size: int, note: str = "") -> Dict[str, Any]:
        now = datetime.now().isoformat()
        record.last_checked = now
        record.recheck_count += 1
        old_status = record.status.value
        record.status = GapStatus.RECHECKING

        result = {
            "action": "recheck",
            "old_gap_size": record.gap_size,
            "new_gap_size": new_gap_size,
            "gap_changed": new_gap_size != record.gap_size,
            "recheck_count": record.recheck_count,
            "status_before": old_status,
            "status_after": record.status.value,
        }

        record.gap_size = new_gap_size
        history_entry = {
            "time": now,
            "action": "recheck",
            "detail": f"第 {record.recheck_count} 次复检，缺口从 {result['old_gap_size']} 变为 {new_gap_size}",
            "note": note,
        }
        record.history.append(history_entry)

        if new_gap_size == 0:
            record.status = GapStatus.RESOLVED
            record.history.append({
                "time": now,
                "action": "auto_resolved",
                "detail": "复检后缺口为0，自动标记为已解决",
            })
            result["auto_resolved"] = True
        else:
            result["auto_resolved"] = False

        self._save(record)
        result["record"] = record.to_dict()
        return result

    def supplement(self, record: GapRecord, note: str) -> Dict[str, Any]:
        now = datetime.now().isoformat()
        record.supplement_notes.append(note)
        old_status = record.status.value

        if record.status == GapStatus.RECHECKING:
            record.status = GapStatus.SUPPLEMENTED

        record.history.append({
            "time": now,
            "action": "supplement",
            "detail": note,
        })

        self._save(record)
        return {
            "action": "supplement",
            "status_before": old_status,
            "status_after": record.status.value,
            "supplement_note": note,
            "supplement_count": len(record.supplement_notes),
            "record": record.to_dict(),
        }

    def confirm(self, record: GapRecord, note: str, confirmed_by: str = "dba") -> Dict[str, Any]:
        now = datetime.now().isoformat()
        record.confirm_notes.append({
            "time": now,
            "note": note,
            "confirmed_by": confirmed_by,
        })
        old_status = record.status.value
        record.status = GapStatus.CONFIRMED

        record.history.append({
            "time": now,
            "action": "confirm",
            "detail": f"{confirmed_by} 人工确认: {note}",
        })

        self._save(record)
        return {
            "action": "confirm",
            "status_before": old_status,
            "status_after": record.status.value,
            "confirm_note": note,
            "confirmed_by": confirmed_by,
            "confirm_count": len(record.confirm_notes),
            "record": record.to_dict(),
        }

    def run_triology(self, record_id: str, new_gap_size: int,
                     supplement_note: str, confirm_note: str,
                     confirmed_by: str = "dba") -> TriologyResult:
        record = self.load(record_id)
        if not record:
            raise ValueError(f"缺口记录 {record_id} 不存在")

        result = TriologyResult()

        result.recheck_result = self.recheck(record, new_gap_size, "三部曲自动复检")

        if record.status == GapStatus.RESOLVED:
            result.all_completed = True
            result.supplement_result = {"skipped": True, "reason": "已自动解决，无需补录"}
            result.confirm_result = {"skipped": True, "reason": "已自动解决，无需确认"}
            return result

        result.supplement_result = self.supplement(record, supplement_note)
        result.confirm_result = self.confirm(record, confirm_note, confirmed_by)
        result.all_completed = True

        return result

    def list_gaps(self, status: Optional[GapStatus] = None) -> List[GapRecord]:
        records = []
        for filename in os.listdir(self.storage_path):
            if filename.startswith("gap_") and filename.endswith(".json"):
                record_id = filename[4:-5]
                record = self.load(record_id)
                if record:
                    if status is None or record.status == status:
                        records.append(record)
        return sorted(records, key=lambda r: r.first_detected, reverse=True)

    def dismiss(self, record: GapRecord, reason: str) -> Dict[str, Any]:
        now = datetime.now().isoformat()
        old_status = record.status.value
        record.status = GapStatus.DISMISSED
        record.history.append({
            "time": now,
            "action": "dismiss",
            "detail": f"忽略此缺口: {reason}",
        })
        self._save(record)
        return {
            "action": "dismiss",
            "status_before": old_status,
            "status_after": record.status.value,
            "reason": reason,
        }
