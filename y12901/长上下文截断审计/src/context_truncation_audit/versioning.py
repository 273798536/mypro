from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime
import copy
import json


@dataclass
class AuditRecord:
    record_id: str
    version: int = 1
    timestamp: str = field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    auditor: str = "system"
    is_truncated: bool = False
    reason: str = ""
    reason_detail: str = ""
    severity: str = "medium"
    manual_note: str = ""
    change_summary: str = ""
    data: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "记录编号": self.record_id,
            "版本号": self.version,
            "审计时间": self.timestamp,
            "审计人": self.auditor,
            "是否截断": "是" if self.is_truncated else "否",
            "截断原因": self.reason,
            "原因说明": self.reason_detail,
            "严重程度": self.severity,
            "人工备注": self.manual_note,
            "变更说明": self.change_summary,
            "原始内容预览": self.data.get("original_preview", ""),
        }


class VersionTracker:
    def __init__(self):
        self._records: Dict[str, List[AuditRecord]] = {}

    def add_version(
        self,
        record_id: str,
        is_truncated: bool,
        reason: str,
        reason_detail: str,
        severity: str = "medium",
        manual_note: str = "",
        auditor: str = "system",
        change_summary: str = "",
        data: Optional[Dict[str, Any]] = None,
    ) -> AuditRecord:
        versions = self._records.get(record_id, [])
        version_num = len(versions) + 1

        record = AuditRecord(
            record_id=record_id,
            version=version_num,
            auditor=auditor,
            is_truncated=is_truncated,
            reason=reason,
            reason_detail=reason_detail,
            severity=severity,
            manual_note=manual_note,
            change_summary=change_summary,
            data=data or {},
        )

        versions.append(record)
        self._records[record_id] = versions
        return record

    def get_latest(self, record_id: str) -> Optional[AuditRecord]:
        versions = self._records.get(record_id, [])
        return versions[-1] if versions else None

    def get_all_versions(self, record_id: str) -> List[AuditRecord]:
        return copy.deepcopy(self._records.get(record_id, []))

    def compare_versions(self, record_id: str, v1: int = 1, v2: int = -1) -> Dict[str, Any]:
        versions = self._records.get(record_id, [])
        if len(versions) < 2:
            return {"has_changes": False, "changes": {}, "message": "版本不足，无法对比"}

        if v2 == -1:
            v2 = len(versions)

        r1 = versions[v1 - 1] if v1 <= len(versions) else None
        r2 = versions[v2 - 1] if v2 <= len(versions) else None

        if not r1 or not r2:
            return {"has_changes": False, "changes": {}, "message": "指定版本不存在"}

        changes = {}

        if r1.is_truncated != r2.is_truncated:
            changes["是否截断"] = {
                "旧值": "是" if r1.is_truncated else "否",
                "新值": "是" if r2.is_truncated else "否",
                "影响": "核心判断改变" if r1.is_truncated != r2.is_truncated else "无",
            }

        if r1.reason != r2.reason:
            changes["截断原因"] = {
                "旧值": r1.reason or "无",
                "新值": r2.reason or "无",
            }

        if r1.severity != r2.severity:
            changes["严重程度"] = {
                "旧值": r1.severity,
                "新值": r2.severity,
            }

        if r1.manual_note != r2.manual_note:
            changes["人工备注"] = {
                "旧值": r1.manual_note or "无",
                "新值": r2.manual_note or "无",
            }

        return {
            "record_id": record_id,
            "version_from": v1,
            "version_to": v2,
            "has_changes": len(changes) > 0,
            "changes": changes,
            "change_count": len(changes),
        }

    def get_all_records_latest(self) -> List[AuditRecord]:
        return [v[-1] for v in self._records.values() if v]

    def get_changed_records(self) -> List[Dict[str, Any]]:
        changed = []
        for record_id in self._records:
            versions = self._records[record_id]
            if len(versions) >= 2:
                diff = self.compare_versions(record_id)
                if diff["has_changes"]:
                    changed.append(diff)
        return changed

    def export_history(self, record_id: str) -> Dict[str, Any]:
        versions = self._records.get(record_id, [])
        return {
            "record_id": record_id,
            "total_versions": len(versions),
            "versions": [v.to_dict() for v in versions],
        }

    def to_dict(self) -> Dict[str, Any]:
        result = {}
        for record_id, versions in self._records.items():
            result[record_id] = [v.to_dict() for v in versions]
        return result

    def save_to_file(self, filepath: str):
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, ensure_ascii=False, indent=2)

    @classmethod
    def load_from_file(cls, filepath: str) -> "VersionTracker":
        tracker = cls()
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        for record_id, versions_data in data.items():
            versions = []
            for v_data in versions_data:
                record = AuditRecord(
                    record_id=v_data.get("记录编号", record_id),
                    version=v_data.get("版本号", 1),
                    timestamp=v_data.get("审计时间", ""),
                    auditor=v_data.get("审计人", "system"),
                    is_truncated=v_data.get("是否截断") == "是",
                    reason=v_data.get("截断原因", ""),
                    reason_detail=v_data.get("原因说明", ""),
                    severity=v_data.get("严重程度", "medium"),
                    manual_note=v_data.get("人工备注", ""),
                    change_summary=v_data.get("变更说明", ""),
                    data={"original_preview": v_data.get("原始内容预览", "")},
                )
                versions.append(record)
            tracker._records[record_id] = versions
        return tracker
