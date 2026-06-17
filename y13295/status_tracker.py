import json
import os
from datetime import datetime
from typing import List, Optional, Dict, Any
from pathlib import Path

from models import MergedPointGroup, MergeStatus, ProcessingResult


class StatusChangeLog:
    def __init__(self, group_id: str, old_status: MergeStatus, new_status: MergeStatus,
                 handler: str = "", notes: str = ""):
        self.group_id = group_id
        self.old_status = old_status
        self.new_status = new_status
        self.handler = handler
        self.notes = notes
        self.changed_at = datetime.now()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "group_id": self.group_id,
            "old_status": self.old_status.value,
            "new_status": self.new_status.value,
            "handler": self.handler,
            "notes": self.notes,
            "changed_at": self.changed_at.strftime("%Y-%m-%d %H:%M:%S"),
        }


class StatusTracker:
    def __init__(self, persistence_path: str = "output/status_tracking.json"):
        self.persistence_path = Path(persistence_path)
        self.persistence_path.parent.mkdir(parents=True, exist_ok=True)
        self.status_logs: List[StatusChangeLog] = []
        self.group_handlers: Dict[str, str] = {}
        self.group_notes: Dict[str, str] = {}
        self._load()

    def _load(self):
        if self.persistence_path.exists():
            try:
                with open(self.persistence_path, mode='r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.group_handlers = data.get("group_handlers", {})
                    self.group_notes = data.get("group_notes", {})
                    logs = data.get("status_logs", [])
                    self.status_logs = []
            except (json.JSONDecodeError, IOError):
                pass

    def _save(self):
        data = {
            "group_handlers": self.group_handlers,
            "group_notes": self.group_notes,
            "status_logs": [log.to_dict() for log in self.status_logs],
            "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }
        with open(self.persistence_path, mode='w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def update_status(self, group: MergedPointGroup, new_status: MergeStatus,
                      handler: str = "", notes: str = "") -> StatusChangeLog:
        old_status = group.merge_status
        log = StatusChangeLog(group.group_id, old_status, new_status, handler, notes)
        self.status_logs.append(log)

        group.merge_status = new_status
        if handler:
            self.group_handlers[group.group_id] = handler
            if not group.handler_notes:
                group.handler_notes = ""
        if notes:
            if group.group_id in self.group_notes:
                self.group_notes[group.group_id] += f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M')}] {notes}"
            else:
                self.group_notes[group.group_id] = f"[{datetime.now().strftime('%Y-%m-%d %H:%M')}] {notes}"
            group.handler_notes = self.group_notes[group.group_id]

        self._save()
        return log

    def mark_as_merged(self, group: MergedPointGroup, handler: str = "", evidence: str = "") -> StatusChangeLog:
        notes = f"确认归并完成"
        if evidence:
            notes += f"；补充证据：{evidence}"
        return self.update_status(group, MergeStatus.MERGED, handler, notes)

    def mark_as_needs_evidence(self, group: MergedPointGroup, handler: str = "",
                               missing_evidence: str = "") -> StatusChangeLog:
        notes = "需要补充证据"
        if missing_evidence:
            notes += f"；缺失：{missing_evidence}"
        return self.update_status(group, MergeStatus.NEEDS_EVIDENCE, handler, notes)

    def mark_as_reviewed(self, group: MergedPointGroup, handler: str = "",
                         review_notes: str = "") -> StatusChangeLog:
        notes = "已复核通过"
        if review_notes:
            notes += f"；复核意见：{review_notes}"
        return self.update_status(group, MergeStatus.REVIEWED, handler, notes)

    def mark_as_rejected(self, group: MergedPointGroup, handler: str = "",
                         reason: str = "") -> StatusChangeLog:
        notes = "不予归并"
        if reason:
            notes += f"；原因：{reason}"
        return self.update_status(group, MergeStatus.REJECTED, handler, notes)

    def get_pending_groups(self, result: ProcessingResult) -> List[MergedPointGroup]:
        return [g for g in result.merged_groups if g.merge_status == MergeStatus.PENDING]

    def get_needs_evidence_groups(self, result: ProcessingResult) -> List[MergedPointGroup]:
        return [g for g in result.merged_groups if g.merge_status == MergeStatus.NEEDS_EVIDENCE]

    def get_completed_groups(self, result: ProcessingResult) -> List[MergedPointGroup]:
        return [g for g in result.merged_groups
                if g.merge_status in (MergeStatus.MERGED, MergeStatus.REVIEWED)]

    def get_todo_summary(self, result: ProcessingResult) -> Dict[str, Any]:
        pending = self.get_pending_groups(result)
        needs_evidence = self.get_needs_evidence_groups(result)
        completed = self.get_completed_groups(result)
        total = len(result.merged_groups)
        return {
            "total_groups": total,
            "pending_count": len(pending),
            "needs_evidence_count": len(needs_evidence),
            "completed_count": len(completed),
            "completion_rate": f"{len(completed) / total * 100:.1f}%" if total > 0 else "N/A",
            "pending_groups": [g.group_id for g in pending],
            "needs_evidence_groups": [g.group_id for g in needs_evidence],
            "completed_groups": [g.group_id for g in completed],
        }

    def generate_status_report(self, result: ProcessingResult) -> str:
        summary = self.get_todo_summary(result)
        lines = [
            "=" * 80,
            "口袋公园座椅点位归并 - 处理状态跟踪",
            "=" * 80,
            f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "-" * 80,
            f"总归并组数:       {summary['total_groups']}",
            f"已处理(已归并/复核): {summary['completed_count']}",
            f"待处理:           {summary['pending_count']}",
            f"待补证据:         {summary['needs_evidence_count']}",
            f"完成率:           {summary['completion_rate']}",
            "-" * 80,
        ]

        needs_evidence = self.get_needs_evidence_groups(result)
        if needs_evidence:
            lines.append("")
            lines.append("【待补证据的归并组】")
            lines.append("-" * 80)
            for g in needs_evidence:
                lines.append(f"  ⚠ {g.group_id} | {g.canonical_location}")
                if g.next_step_hint:
                    first_hint = g.next_step_hint.split('\n')[0]
                    lines.append(f"      提示: {first_hint}")
            lines.append("")

        pending = self.get_pending_groups(result)
        if pending:
            lines.append("")
            lines.append("【待处理的归并组】")
            lines.append("-" * 80)
            for g in pending:
                lines.append(f"  ○ {g.group_id} | {g.canonical_location} | {g.record_count}条记录")
            lines.append("")

        if self.status_logs:
            lines.append("")
            lines.append("【最近状态变更记录】")
            lines.append("-" * 80)
            for log in reversed(self.status_logs[-10:]):
                lines.append(
                    f"  {log.changed_at.strftime('%Y-%m-%d %H:%M')} | "
                    f"{log.group_id} | "
                    f"{log.old_status.value} → {log.new_status.value}"
                    f"{f' | 处理人: {log.handler}' if log.handler else ''}"
                )

        lines.append("")
        lines.append("=" * 80)
        return "\n".join(lines)

    def add_handler_note(self, group: MergedPointGroup, note: str, handler: str = ""):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        full_note = f"[{timestamp}] {note}"
        if handler:
            full_note += f" (处理人: {handler})"

        if group.group_id in self.group_notes:
            self.group_notes[group.group_id] += "\n" + full_note
        else:
            self.group_notes[group.group_id] = full_note

        if group.handler_notes:
            group.handler_notes += "\n" + full_note
        else:
            group.handler_notes = full_note

        self._save()

    def get_group_history(self, group_id: str) -> List[StatusChangeLog]:
        return [log for log in self.status_logs if log.group_id == group_id]
