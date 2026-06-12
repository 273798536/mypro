import os
import json
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime
from copy import deepcopy

from .models import HistoryEntry, ChangeType, ValidationStatus, ValidationResult, MaterialRecord


class HistoryManager:
    def __init__(self, storage_path: str = None):
        if storage_path is None:
            storage_path = os.path.join(os.getcwd(), ".segment_check_history")
        self.storage_path = storage_path
        os.makedirs(self.storage_path, exist_ok=True)
        self._entries: List[HistoryEntry] = []
        self._load()

    def _load(self):
        history_file = os.path.join(self.storage_path, "history.json")
        if os.path.exists(history_file):
            try:
                with open(history_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                for item in data:
                    entry = HistoryEntry(
                        entry_id=item.get("entry_id", str(uuid.uuid4())[:8]),
                        record_id=item.get("record_id", ""),
                        material_name=item.get("material_name", ""),
                        change_type=ChangeType(item.get("change_type", "import")),
                        previous_status=ValidationStatus(item["previous_status"]) if item.get("previous_status") else None,
                        new_status=ValidationStatus(item["new_status"]) if item.get("new_status") else None,
                        operator=item.get("operator", "system"),
                        comment=item.get("comment"),
                        previous_data=item.get("previous_data"),
                        new_data=item.get("new_data"),
                        timestamp=datetime.fromisoformat(item.get("timestamp", datetime.now().isoformat())),
                    )
                    self._entries.append(entry)
            except Exception:
                pass

    def _save(self):
        history_file = os.path.join(self.storage_path, "history.json")
        data = []
        for entry in self._entries:
            data.append({
                "entry_id": entry.entry_id,
                "record_id": entry.record_id,
                "material_name": entry.material_name,
                "change_type": entry.change_type.value,
                "previous_status": entry.previous_status.value if entry.previous_status else None,
                "new_status": entry.new_status.value if entry.new_status else None,
                "operator": entry.operator,
                "comment": entry.comment,
                "previous_data": entry.previous_data,
                "new_data": entry.new_data,
                "timestamp": entry.timestamp.isoformat(),
            })
        with open(history_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def record_import(self, record: MaterialRecord, operator: str = "system") -> HistoryEntry:
        entry = HistoryEntry(
            entry_id=str(uuid.uuid4())[:8],
            record_id=record.record_id,
            material_name=record.material_name,
            change_type=ChangeType.IMPORT,
            previous_status=None,
            new_status=None,
            operator=operator,
            comment=f"从 {record.source_file} 第{record.source_line}行导入",
            previous_data=None,
            new_data={
                "status": record.status.value,
                "raw_data": record.raw_data,
                "error_message": record.error_message,
            },
        )
        self._entries.append(entry)
        self._save()
        return entry

    def record_validation(self, record: MaterialRecord, result: ValidationResult,
                          previous_result: Optional[ValidationResult] = None,
                          operator: str = "system",
                          comment: str = "") -> HistoryEntry:
        entry = HistoryEntry(
            entry_id=str(uuid.uuid4())[:8],
            record_id=record.record_id,
            material_name=record.material_name,
            change_type=ChangeType.REVALIDATE,
            previous_status=previous_result.status if previous_result else None,
            new_status=result.status,
            operator=operator,
            comment=comment or "分段回归校验",
            previous_data={
                "segment_metrics": deepcopy(previous_result.segment_metrics) if previous_result else None,
                "boundary_checks": deepcopy(previous_result.boundary_checks) if previous_result else None,
                "warnings": deepcopy(previous_result.warnings) if previous_result else None,
                "errors": deepcopy(previous_result.errors) if previous_result else None,
            },
            new_data={
                "segment_metrics": deepcopy(result.segment_metrics),
                "boundary_checks": deepcopy(result.boundary_checks),
                "warnings": deepcopy(result.warnings),
                "errors": deepcopy(result.errors),
                "suspension_reason": result.suspension_reason,
            },
        )
        self._entries.append(entry)
        self._save()
        return entry

    def record_manual_override(self, record: MaterialRecord, result: ValidationResult,
                               previous_result: ValidationResult,
                               operator: str = "analyst",
                               comment: str = "") -> HistoryEntry:
        entry = HistoryEntry(
            entry_id=str(uuid.uuid4())[:8],
            record_id=record.record_id,
            material_name=record.material_name,
            change_type=ChangeType.MANUAL_OVERRIDE,
            previous_status=previous_result.status,
            new_status=result.status,
            operator=operator,
            comment=comment or "人工调整校验结论（小孟临时判断）",
            previous_data={
                "status": previous_result.status.value,
                "warnings": deepcopy(previous_result.warnings),
                "errors": deepcopy(previous_result.errors),
                "segment_metrics": deepcopy(previous_result.segment_metrics),
            },
            new_data={
                "status": result.status.value,
                "warnings": deepcopy(result.warnings),
                "errors": deepcopy(result.errors),
                "segment_metrics": deepcopy(result.segment_metrics),
                "manual_note": "人工判断已记录，下一班可查历史",
            },
        )
        self._entries.append(entry)
        self._save()
        return entry

    def record_suspend(self, record: MaterialRecord, result: ValidationResult,
                       reason: str, operator: str = "system") -> HistoryEntry:
        entry = HistoryEntry(
            entry_id=str(uuid.uuid4())[:8],
            record_id=record.record_id,
            material_name=record.material_name,
            change_type=ChangeType.SUSPEND,
            previous_status=result.status,
            new_status=ValidationStatus.SUSPENDED,
            operator=operator,
            comment=f"自动挂起: {reason}",
            previous_data={
                "status": result.status.value,
                "suspension_reason": result.suspension_reason,
            },
            new_data={
                "status": ValidationStatus.SUSPENDED.value,
                "suspension_reason": reason,
            },
        )
        self._entries.append(entry)
        self._save()
        return entry

    def get_record_history(self, record_id: str) -> List[HistoryEntry]:
        return [e for e in self._entries if e.record_id == record_id]

    def get_all_entries(self, limit: int = None) -> List[HistoryEntry]:
        entries = sorted(self._entries, key=lambda e: e.timestamp, reverse=True)
        if limit:
            return entries[:limit]
        return entries

    def get_change_summary(self) -> List[Dict]:
        summary = []
        for entry in self.get_all_entries():
            status_change = ""
            if entry.previous_status and entry.new_status:
                status_change = f"{entry.previous_status.value} → {entry.new_status.value}"
            elif entry.new_status:
                status_change = f"→ {entry.new_status.value}"

            summary.append({
                "时间": entry.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                "操作类型": entry.change_type.value,
                "材料名称": entry.material_name,
                "记录ID": entry.record_id,
                "操作人": entry.operator,
                "状态变更": status_change,
                "备注": entry.comment or "",
            })
        return summary


class AnomalyQueue:
    def __init__(self):
        self._items: List[Dict[str, Any]] = []

    def add_result(self, record: MaterialRecord, result: ValidationResult,
                   previous_result: Optional[ValidationResult] = None,
                   change_context: str = ""):
        anomaly_types = []
        if result.status == ValidationStatus.SUSPENDED:
            anomaly_types.append("挂起待确认")
        if result.status == ValidationStatus.FAIL:
            anomaly_types.append("校验失败")
        if result.warnings:
            anomaly_types.append("边界警告")
        if record.status.value == "bad":
            anomaly_types.append("数据质量异常")

        if previous_result and previous_result.status != result.status:
            anomaly_types.append(f"状态变更: {previous_result.status.value}→{result.status.value}")

        if not anomaly_types:
            return

        item = {
            "timestamp": datetime.now(),
            "record_id": record.record_id,
            "material_name": record.material_name,
            "source": f"{record.source_file}:{record.source_line}",
            "anomaly_types": anomaly_types,
            "current_status": result.status.value,
            "previous_status": previous_result.status.value if previous_result else None,
            "warnings": list(result.warnings),
            "errors": list(result.errors),
            "suspension_reason": result.suspension_reason,
            "raw_data_trace": {
                "source_file": record.source_file,
                "source_line": record.source_line,
                "original_fields": list(record.raw_data.keys()) if record.raw_data else [],
            },
            "change_context": change_context,
            "action_required": result.status in [ValidationStatus.SUSPENDED, ValidationStatus.FAIL],
        }
        self._items.append(item)

    def add_import_change(self, change_info: Dict):
        if change_info.get("type") in ("potential_duplicate",):
            item = {
                "timestamp": datetime.now(),
                "record_id": change_info.get("record_id", ""),
                "material_name": change_info.get("material_name", ""),
                "source": "导入检测",
                "anomaly_types": [f"导入异常: {change_info.get('type')}"],
                "current_status": "pending_review",
                "previous_status": None,
                "warnings": [change_info.get("note", "")],
                "errors": [],
                "suspension_reason": None,
                "raw_data_trace": {},
                "change_context": change_info.get("note", ""),
                "action_required": True,
            }
            self._items.append(item)

    def get_all(self) -> List[Dict]:
        return sorted(self._items, key=lambda x: x["timestamp"], reverse=True)

    def get_pending(self) -> List[Dict]:
        return [item for item in self.get_all() if item["action_required"]]

    def clear(self):
        self._items = []

    def to_table_data(self) -> List[Dict]:
        table = []
        for item in self.get_all():
            table.append({
                "时间": item["timestamp"].strftime("%H:%M:%S"),
                "材料名称": item["material_name"],
                "异常类型": " | ".join(item["anomaly_types"]),
                "当前状态": item["current_status"],
                "来源": item["source"],
                "说明": (item["change_context"] or item["warnings"][0] if item["warnings"] else "")[:50],
                "需处理": "是" if item["action_required"] else "否",
            })
        return table
