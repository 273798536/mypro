import json
import os
import shutil
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
import hashlib
import copy

from .models import (
    ReimbursementRecord,
    RecordStatus,
    SourceType,
    SourceEvidence,
    Issue,
    AuditLogEntry,
    generate_record_id
)


class AuditStorage:
    def __init__(self, base_path: str = ".audit-data"):
        self.base_path = Path(base_path).resolve()
        self.records_path = self.base_path / "records"
        self.snapshots_path = self.base_path / "snapshots"
        self.exports_path = self.base_path / "exports"
        self.config_path = self.base_path / "config.json"

    def init(self) -> bool:
        if self.base_path.exists():
            return False
        
        self.base_path.mkdir(parents=True)
        self.records_path.mkdir()
        self.snapshots_path.mkdir()
        self.exports_path.mkdir()
        
        config = {
            "initialized_at": datetime.now().isoformat(),
            "version": "1.0.0",
            "current_snapshot": None,
            "record_count": 0,
            "operators": ["system"]
        }
        
        with open(self.config_path, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        
        return True

    def is_initialized(self) -> bool:
        return self.config_path.exists()

    def _get_config(self) -> Dict[str, Any]:
        if not self.config_path.exists():
            return {}
        with open(self.config_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _save_config(self, config: Dict[str, Any]) -> None:
        with open(self.config_path, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2, ensure_ascii=False)

    def _get_record_path(self, record_id: str) -> Path:
        return self.records_path / f"{record_id}.json"

    def save_record(self, record: ReimbursementRecord) -> None:
        record_path = self._get_record_path(record.record_id)
        with open(record_path, "w", encoding="utf-8") as f:
            json.dump(record.to_dict(), f, indent=2, ensure_ascii=False)
        
        config = self._get_config()
        if "record_ids" not in config:
            config["record_ids"] = []
        if record.record_id not in config["record_ids"]:
            config["record_ids"].append(record.record_id)
            config["record_count"] = len(config["record_ids"])
        self._save_config(config)

    def load_record(self, record_id: str) -> Optional[ReimbursementRecord]:
        record_path = self._get_record_path(record_id)
        if not record_path.exists():
            return None
        
        with open(record_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        return self._dict_to_record(data)

    def _dict_to_record(self, data: Dict[str, Any]) -> ReimbursementRecord:
        evidences = {}
        for k, v in data.get("evidences", {}).items():
            evidences[SourceType(k)] = SourceEvidence(
                source_type=SourceType(v["source_type"]),
                source_file=v["source_file"],
                original_line=v["original_line"],
                raw_value=v["raw_value"],
                parsed_value=v["parsed_value"],
                import_timestamp=v["import_timestamp"]
            )
        
        issues = []
        for i in data.get("issues", []):
            issues.append(Issue(
                issue_type=IssueType(i["issue_type"]),
                description=i["description"],
                severity=i["severity"],
                related_records=i["related_records"],
                evidence=i.get("evidence"),
                resolved=i.get("resolved", False),
                resolution=i.get("resolution")
            ))
        
        audit_log = []
        for a in data.get("audit_log", []):
            audit_log.append(AuditLogEntry(
                action=a["action"],
                previous_status=a.get("previous_status"),
                new_status=a["new_status"],
                operator=a["operator"],
                timestamp=a["timestamp"],
                comment=a.get("comment"),
                changes=a.get("changes")
            ))
        
        return ReimbursementRecord(
            record_id=data["record_id"],
            employee_id=data["employee_id"],
            employee_name=data["employee_name"],
            expense_type=data["expense_type"],
            amount=data["amount"],
            currency=data["currency"],
            expense_date=data["expense_date"],
            status=RecordStatus(data["status"]),
            evidences=evidences,
            issues=issues,
            audit_log=audit_log,
            is_frozen=data.get("is_frozen", False),
            freeze_reason=data.get("freeze_reason"),
            shared_trip_id=data.get("shared_trip_id"),
            parent_record_id=data.get("parent_record_id"),
            resubmission_count=data.get("resubmission_count", 0),
            manual_override=data.get("manual_override", False),
            override_reason=data.get("override_reason"),
            created_at=data["created_at"],
            updated_at=data["updated_at"],
            metadata=data.get("metadata", {})
        )

    def load_all_records(self) -> List[ReimbursementRecord]:
        config = self._get_config()
        record_ids = config.get("record_ids", [])
        records = []
        for record_id in record_ids:
            record = self.load_record(record_id)
            if record:
                records.append(record)
        return records

    def load_records_by_status(self, status: RecordStatus) -> List[ReimbursementRecord]:
        return [r for r in self.load_all_records() if r.status == status]

    def load_records_by_trip(self, trip_id: str) -> List[ReimbursementRecord]:
        return [r for r in self.load_all_records() if r.shared_trip_id == trip_id]

    def delete_record(self, record_id: str) -> bool:
        record_path = self._get_record_path(record_id)
        if record_path.exists():
            record_path.unlink()
            config = self._get_config()
            if "record_ids" in config and record_id in config["record_ids"]:
                config["record_ids"].remove(record_id)
                config["record_count"] = len(config["record_ids"])
                self._save_config(config)
            return True
        return False

    def create_snapshot(self, description: str, operator: str) -> str:
        snapshot_id = f"SNAP-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        snapshot_path = self.snapshots_path / snapshot_id
        snapshot_path.mkdir()
        
        shutil.copytree(self.records_path, snapshot_path / "records")
        
        snapshot_meta = {
            "snapshot_id": snapshot_id,
            "created_at": datetime.now().isoformat(),
            "operator": operator,
            "description": description,
            "record_count": len(list(self.records_path.glob("*.json"))),
            "record_hash": self._calculate_records_hash()
        }
        
        with open(snapshot_path / "meta.json", "w", encoding="utf-8") as f:
            json.dump(snapshot_meta, f, indent=2, ensure_ascii=False)
        
        config = self._get_config()
        config["current_snapshot"] = snapshot_id
        if "snapshots" not in config:
            config["snapshots"] = []
        config["snapshots"].append(snapshot_meta)
        self._save_config(config)
        
        return snapshot_id

    def _calculate_records_hash(self) -> str:
        hash_obj = hashlib.sha256()
        for record_file in sorted(self.records_path.glob("*.json")):
            with open(record_file, "rb") as f:
                hash_obj.update(f.read())
        return hash_obj.hexdigest()

    def list_snapshots(self) -> List[Dict[str, Any]]:
        config = self._get_config()
        return config.get("snapshots", [])

    def compare_snapshots(self, snapshot1_id: str, snapshot2_id: str) -> Dict[str, Any]:
        snap1_path = self.snapshots_path / snapshot1_id / "records"
        snap2_path = self.snapshots_path / snapshot2_id / "records"
        
        if not snap1_path.exists() or not snap2_path.exists():
            raise ValueError("One or both snapshots do not exist")
        
        snap1_records = set(f.stem for f in snap1_path.glob("*.json"))
        snap2_records = set(f.stem for f in snap2_path.glob("*.json"))
        
        added = snap2_records - snap1_records
        removed = snap1_records - snap2_records
        common = snap1_records & snap2_records
        
        modified = []
        for record_id in common:
            with open(snap1_path / f"{record_id}.json", "r", encoding="utf-8") as f:
                r1 = json.load(f)
            with open(snap2_path / f"{record_id}.json", "r", encoding="utf-8") as f:
                r2 = json.load(f)
            if r1 != r2:
                diff = self._compare_records(r1, r2)
                if diff:
                    modified.append({
                        "record_id": record_id,
                        "changes": diff
                    })
        
        return {
            "snapshot1": snapshot1_id,
            "snapshot2": snapshot2_id,
            "added": list(added),
            "removed": list(removed),
            "modified": modified,
            "summary": {
                "added_count": len(added),
                "removed_count": len(removed),
                "modified_count": len(modified)
            }
        }

    def _compare_records(self, r1: Dict[str, Any], r2: Dict[str, Any]) -> List[Dict[str, Any]]:
        changes = []
        for key in set(r1.keys()) | set(r2.keys()):
            if key in ["updated_at", "audit_log"]:
                continue
            v1 = r1.get(key)
            v2 = r2.get(key)
            if v1 != v2:
                changes.append({
                    "field": key,
                    "old_value": v1,
                    "new_value": v2
                })
        return changes

    def get_record_history(self, record_id: str, snapshot_id: Optional[str] = None) -> Dict[str, Any]:
        record = self.load_record(record_id)
        if not record:
            return {}
        
        history = {
            "record_id": record_id,
            "current_status": record.status.value,
            "audit_log": [a.to_dict() for a in record.audit_log],
            "snapshot_versions": []
        }
        
        if snapshot_id:
            snap_record_path = self.snapshots_path / snapshot_id / "records" / f"{record_id}.json"
            if snap_record_path.exists():
                with open(snap_record_path, "r", encoding="utf-8") as f:
                    history["snapshot_version"] = json.load(f)
        else:
            for snapshot in self.list_snapshots():
                snap_record_path = self.snapshots_path / snapshot["snapshot_id"] / "records" / f"{record_id}.json"
                if snap_record_path.exists():
                    history["snapshot_versions"].append({
                        "snapshot_id": snapshot["snapshot_id"],
                        "snapshot_date": snapshot["created_at"],
                        "snapshot_description": snapshot["description"]
                    })
        
        return history

    def export_records(self, record_ids: List[str], export_format: str = "json", 
                       include_evidences: bool = True, include_audit: bool = True) -> Tuple[str, Path]:
        export_id = f"EXPORT-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        export_path = self.exports_path / export_id
        export_path.mkdir()
        
        records_data = []
        for record_id in record_ids:
            record = self.load_record(record_id)
            if record:
                record_dict = record.to_dict()
                if not include_evidences:
                    record_dict.pop("evidences", None)
                if not include_audit:
                    record_dict.pop("audit_log", None)
                records_data.append(record_dict)
        
        output_file = export_path / f"records.{export_format}"
        
        if export_format == "json":
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump({
                    "export_id": export_id,
                    "exported_at": datetime.now().isoformat(),
                    "record_count": len(records_data),
                    "records": records_data
                }, f, indent=2, ensure_ascii=False)
        elif export_format == "csv":
            import csv
            with open(output_file, "w", encoding="utf-8-sig", newline="") as f:
                writer = csv.writer(f)
                writer.writerow([
                    "记录ID", "员工ID", "员工姓名", "费用类型", "金额", "货币",
                    "费用日期", "状态", "是否冻结", "是否人工改判", "创建时间", "更新时间"
                ])
                for r in records_data:
                    writer.writerow([
                        r["record_id"], r["employee_id"], r["employee_name"],
                        r["expense_type"], r["amount"], r["currency"],
                        r["expense_date"], r["status"], r["is_frozen"],
                        r["manual_override"], r["created_at"], r["updated_at"]
                    ])
        
        return export_id, output_file

    def mark_exported(self, record_ids: List[str], export_id: str, operator: str) -> None:
        for record_id in record_ids:
            record = self.load_record(record_id)
            if record and not record.is_frozen:
                record.update_status(RecordStatus.EXPORTED, operator, f"Exported in {export_id}")
                record.metadata["last_export_id"] = export_id
                self.save_record(record)


from .models import IssueType
