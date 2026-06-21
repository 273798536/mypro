from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from .models import (
    ConflictType,
    HistoryAction,
    HistoryEntry,
    ItemStatus,
    ProcessingResult,
    ScheduleItem,
)


ACTION_ICONS = {
    HistoryAction.CREATED: "📥",
    HistoryAction.UPDATED: "✏️",
    HistoryAction.NOTE_ADDED: "📝",
    HistoryAction.SCREENSHOT_ADDED: "🖼️",
    HistoryAction.STATUS_CHANGED: "🔄",
    HistoryAction.CONFLICT_DETECTED: "⚠️",
    HistoryAction.CONFLICT_RESOLVED: "✅",
    HistoryAction.MANUAL_CONFIRMATION: "👤",
}

STATUS_LABELS = {
    ItemStatus.PENDING: "⏳ 待处理",
    ItemStatus.PROCESSED: "✅ 已处理",
    ItemStatus.SKIPPED: "⏭️ 已跳过",
    ItemStatus.BAD: "❌ 坏行",
    ItemStatus.NEEDS_EVIDENCE: "📎 待补证据",
    ItemStatus.NEEDS_CONFIRMATION: "👤 待人工确认",
}

CONFLICT_TYPE_LABELS = {
    ConflictType.TIME_OVERLAP: "⏰ 时间重叠",
    ConflictType.NAME_MISMATCH: "🏷️ 文件名不匹配",
    ConflictType.MISSING_FILE: "📂 缺失文件",
    ConflictType.EXTRA_FILE: "📦 多余文件",
    ConflictType.TIMECODE_DRIFT: "⚡ 时码偏差",
    ConflictType.DUPLICATE: "🔁 重复条目",
}


class TimelineGenerator:
    def __init__(self, result: ProcessingResult):
        self.result = result

    def generate_markdown(self, output_path: Optional[str] = None) -> str:
        history = sorted(self.result.history, key=lambda h: h.timestamp)

        summary = self._calculate_summary()

        lines = []
        lines.append("# 音乐节摊位排期冲突 - 历史时间线")
        lines.append("")
        lines.append(f"**生成时间:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("")

        lines.append("### 条目状态")
        lines.append(f"总条目: {summary['total']} | 已处理: {summary['processed']} | 待补证据: {summary['needs_evidence']} | 待确认条目: {summary['needs_confirmation']} | 待处理: {summary['pending']} | 已跳过: {summary['skipped']} | 坏行: {summary['bad']}")
        lines.append("")
        lines.append("### 冲突统计")
        lines.append(f"检测到冲突: {summary['conflicts_detected']} | 待人工确认冲突: {summary['manual_conflicts']} | 已解决: {summary['conflicts_resolved']}")
        lines.append("")

        lines.append("---")
        lines.append("")

        if not history:
            lines.append("_暂无历史记录_")
            lines.append("")
        else:
            grouped = self._group_by_date(history)

            for date in sorted(grouped.keys(), reverse=True):
                lines.append(f"## 📅 {date}")
                lines.append("")

                for entry in grouped[date]:
                    lines.extend(self._format_entry(entry))
                    lines.append("")

                lines.append("---")
                lines.append("")

        lines.append("## 📊 条目状态统计")
        lines.append("")
        lines.append("| 状态 | 数量 |")
        lines.append("|------|------|")
        lines.append(f"| 总条目数 | {summary['total']} |")
        lines.append(f"| ✅ 已处理 | {summary['processed']} |")
        lines.append(f"| 📎 待补证据 | {summary['needs_evidence']} |")
        lines.append(f"| 👤 待确认条目 | {summary['needs_confirmation']} |")
        lines.append(f"| ⏳ 待处理 | {summary['pending']} |")
        lines.append(f"| ⏭️ 已跳过 | {summary['skipped']} |")
        lines.append(f"| ❌ 坏行 | {summary['bad']} |")
        lines.append("")

        lines.append("## 📊 冲突统计")
        lines.append("")
        lines.append("| 类别 | 数量 |")
        lines.append("|------|------|")
        lines.append(f"| ⚠️ 检测到冲突 | {summary['conflicts_detected']} |")
        lines.append(f"| 👤 待人工确认冲突 | {summary['manual_conflicts']} |")
        lines.append(f"| ✅ 已解决冲突 | {summary['conflicts_resolved']} |")
        lines.append("")

        if self.result.bad_rows:
            lines.append("## ❌ 坏行详情")
            lines.append("")
            for idx, bad in enumerate(self.result.bad_rows, 1):
                lines.append(f"### {idx}. 行 {bad.get('row', bad.get('line', '?'))}")
                lines.append(f"- **错误:** {bad.get('error', '未知错误')}")
                lines.append(f"- **数据:** `{str(bad.get('data', ''))[:100]}`")
                lines.append("")

        if self.result.skipped_rows:
            lines.append("## ⏭️ 跳过行详情")
            lines.append("")
            for idx, skip in enumerate(self.result.skipped_rows, 1):
                lines.append(f"### {idx}. 行 {skip.get('row', skip.get('line', '?'))}")
                lines.append(f"- **原因:** {skip.get('reason', '未知原因')}")
                lines.append(f"- **数据:** `{str(skip.get('data', ''))[:100]}`")
                lines.append("")

        content = "\n".join(lines)

        if output_path:
            Path(output_path).write_text(content, encoding="utf-8")

        return content

    def _calculate_summary(self) -> Dict[str, int]:
        items = self.result.schedule_items
        conflicts = self.result.conflicts
        return {
            "total": len(items),
            "processed": sum(1 for i in items if i.status == ItemStatus.PROCESSED),
            "skipped": sum(1 for i in items if i.status == ItemStatus.SKIPPED),
            "bad": sum(1 for i in items if i.status == ItemStatus.BAD),
            "needs_evidence": sum(1 for i in items if i.status == ItemStatus.NEEDS_EVIDENCE),
            "needs_confirmation": sum(1 for i in items if i.status == ItemStatus.NEEDS_CONFIRMATION),
            "pending": sum(1 for i in items if i.status == ItemStatus.PENDING),
            "conflicts_detected": len(conflicts),
            "conflicts_resolved": sum(1 for c in conflicts if c.resolved_at is not None),
            "manual_conflicts": sum(1 for c in conflicts if c.requires_manual_confirmation and not c.resolved_at),
            "bad_rows": len(self.result.bad_rows),
            "skipped_rows": len(self.result.skipped_rows),
        }

    def _group_by_date(self, history: List[HistoryEntry]) -> Dict[str, List[HistoryEntry]]:
        grouped = defaultdict(list)
        for entry in history:
            date_str = entry.timestamp.strftime("%Y-%m-%d")
            grouped[date_str].append(entry)
        return grouped

    def _format_entry(self, entry: HistoryEntry) -> List[str]:
        lines = []
        icon = ACTION_ICONS.get(entry.action, "•")
        time_str = entry.timestamp.strftime("%H:%M:%S")

        title = self._get_entry_title(entry)
        lines.append(f"### {icon} {time_str} - {title}")
        lines.append("")
        lines.append(f"- **操作:** `{entry.action.value}`")
        lines.append(f"- **操作者:** {entry.actor}")
        lines.append(f"- **条目ID:** `{entry.item_id}`")

        if entry.old_value is not None and entry.new_value is not None:
            old = str(entry.old_value)[:50]
            new = str(entry.new_value)[:50]
            lines.append(f"- **变更:** `{old}` → `{new}`")

        if entry.note:
            lines.append(f"- **备注:** {entry.note}")

        if entry.screenshot_path:
            lines.append(f"- **截图:** `{entry.screenshot_path}`")

        if entry.details:
            details_str = ", ".join(f"{k}: {v}" for k, v in entry.details.items() if v)
            if details_str:
                lines.append(f"- **详情:** {details_str}")

        return lines

    def _get_entry_title(self, entry: HistoryEntry) -> str:
        item = self._find_item(entry.item_id)

        if entry.action == HistoryAction.CONFLICT_DETECTED:
            conflict_type = entry.details.get("conflict_type", "")
            conflict_label = CONFLICT_TYPE_LABELS.get(conflict_type, "冲突")
            item_title = item.title if hasattr(item, "title") else ""
            return f"{conflict_label}" + (f": {item_title}" if item_title else "")

        if entry.action == HistoryAction.CONFLICT_RESOLVED:
            item_title = item.title if hasattr(item, "title") else ""
            return f"冲突已解决" + (f": {item_title}" if item_title else "")

        if entry.action == HistoryAction.STATUS_CHANGED:
            old_status = STATUS_LABELS.get(entry.old_value, str(entry.old_value))
            new_status = STATUS_LABELS.get(entry.new_value, str(entry.new_value))
            item_title = item.title if hasattr(item, "title") else ""
            return f"状态变更: {old_status} → {new_status}" + (f" ({item_title})" if item_title else "")

        if entry.action == HistoryAction.NOTE_ADDED:
            item_title = item.title if hasattr(item, "title") else "条目"
            return f"添加备注: {item_title}"

        if entry.action == HistoryAction.SCREENSHOT_ADDED:
            item_title = item.title if hasattr(item, "title") else "条目"
            return f"添加截图: {item_title}"

        if entry.action == HistoryAction.CREATED:
            item_type = entry.details.get("type", "条目")
            if item_type == "audio_file":
                return f"扫描到音频文件"
            return f"创建排期条目"

        if entry.action == HistoryAction.UPDATED:
            field = entry.details.get("field", "字段")
            item_title = item.title if hasattr(item, "title") else "条目"
            return f"更新{field}: {item_title}"

        if entry.action == HistoryAction.MANUAL_CONFIRMATION:
            return "人工确认"

        return entry.action.value

    def _find_item(self, item_id):
        if not item_id:
            return None
        for item in self.result.schedule_items:
            if item.id == item_id:
                return item
        for c in self.result.conflicts:
            if c.id == item_id:
                return c
        for af in self.result.audio_files:
            if af.id == item_id:
                return af
        return None


class DutyViewGenerator:
    def __init__(self, result: ProcessingResult):
        self.result = result

    def generate_markdown(self, output_path: Optional[str] = None) -> str:
        summary = self._calculate_summary()

        lines = []
        lines.append("# 音乐节排期 - 算法值班视图")
        lines.append("")
        lines.append(f"**生成时间:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("")

        lines.append("## 📊 条目状态概览")
        lines.append("")
        lines.append("| 状态 | 数量 |")
        lines.append("|------|------|")
        lines.append(f"| ✅ 已处理 | {summary['processed']} |")
        lines.append(f"| 📎 待补证据 | {summary['needs_evidence']} |")
        lines.append(f"| 👤 待确认条目 | {summary['needs_confirmation']} |")
        lines.append(f"| ⏳ 待处理 | {summary['pending']} |")
        lines.append(f"| ⏭️ 已跳过 | {summary['skipped']} |")
        lines.append(f"| ❌ 坏行 | {summary['bad']} |")
        lines.append("")

        lines.append("## 📊 冲突概览")
        lines.append("")
        lines.append("| 类别 | 数量 |")
        lines.append("|------|------|")
        lines.append(f"| ⚠️ 检测到冲突 | {summary['conflicts_detected']} |")
        lines.append(f"| 👤 待人工确认冲突 | {summary['manual_conflicts']} |")
        lines.append(f"| ✅ 已解决冲突 | {summary['conflicts_resolved']} |")
        lines.append("")

        lines.append("## 📎 需要补充证据的条目")
        lines.append("")
        needs_evidence = [i for i in self.result.schedule_items if i.status == ItemStatus.NEEDS_EVIDENCE]
        if not needs_evidence:
            lines.append("_所有条目证据齐全_")
        else:
            lines.append("| TRACK ID | 曲目 | 摊位 | 日期 | 缺失内容 |")
            lines.append("|----------|------|------|------|----------|")
            for item in needs_evidence:
                conflicts = [c for c in self.result.conflicts if c.schedule_item_id == item.id]
                missing = ", ".join(CONFLICT_TYPE_LABELS.get(c.conflict_type, c.conflict_type.value) for c in conflicts)
                lines.append(f"| {item.track_id} | {item.title} | {item.booth} | 第{item.day}天 | {missing} |")
        lines.append("")

        lines.append("## 👤 需要人工确认的冲突")
        lines.append("")
        needs_confirm = [c for c in self.result.conflicts if c.requires_manual_confirmation and not c.resolved_at]
        if not needs_confirm:
            lines.append("_无需人工确认_")
        else:
            for idx, conflict in enumerate(needs_confirm, 1):
                lines.append(f"### {idx}. {CONFLICT_TYPE_LABELS.get(conflict.conflict_type, conflict.conflict_type.value)}")
                lines.append("")
                lines.append(f"**描述:** {conflict.description}")
                lines.append("")
                lines.append(f"**确认原因:** {conflict.confirmation_reason}")
                lines.append("")
                lines.append("**下一步:**")
                for step in conflict.next_steps or []:
                    lines.append(f"- {step}")
                lines.append("")
                lines.append(f"_冲突ID: `{conflict.id}`_")
                lines.append("")

        lines.append("## ✅ 已处理完成的条目")
        lines.append("")
        processed = [i for i in self.result.schedule_items if i.status == ItemStatus.PROCESSED]
        if not processed:
            lines.append("_暂无已处理条目_")
        else:
            lines.append("| TRACK ID | 曲目 | 艺术家 | 摊位 | 日期 | 处理时间 |")
            lines.append("|----------|------|--------|------|------|----------|")
            for item in processed:
                item_history = [h for h in self.result.history if h.item_id == item.id and h.action == HistoryAction.STATUS_CHANGED and h.new_value == ItemStatus.PROCESSED]
                processed_time = item_history[-1].timestamp.strftime("%Y-%m-%d %H:%M") if item_history else "-"
                lines.append(f"| {item.track_id} | {item.title} | {item.artist} | {item.booth} | 第{item.day}天 | {processed_time} |")
        lines.append("")

        lines.append("## ⚠️ 未解决冲突汇总")
        lines.append("")
        unresolved = [c for c in self.result.conflicts if not c.resolved_at]
        if not unresolved:
            lines.append("_所有冲突已解决_ 🎉")
        else:
            by_type = defaultdict(list)
            for c in unresolved:
                by_type[c.conflict_type].append(c)
            for ctype, clist in by_type.items():
                label = CONFLICT_TYPE_LABELS.get(ctype, ctype.value)
                lines.append(f"- **{label}**: {len(clist)} 个")
        lines.append("")

        content = "\n".join(lines)

        if output_path:
            Path(output_path).write_text(content, encoding="utf-8")

        return content

    def _calculate_summary(self) -> Dict[str, int]:
        items = self.result.schedule_items
        conflicts = self.result.conflicts
        return {
            "total": len(items),
            "processed": sum(1 for i in items if i.status == ItemStatus.PROCESSED),
            "skipped": sum(1 for i in items if i.status == ItemStatus.SKIPPED),
            "bad": sum(1 for i in items if i.status == ItemStatus.BAD),
            "needs_evidence": sum(1 for i in items if i.status == ItemStatus.NEEDS_EVIDENCE),
            "needs_confirmation": sum(1 for i in items if i.status == ItemStatus.NEEDS_CONFIRMATION),
            "pending": sum(1 for i in items if i.status == ItemStatus.PENDING),
            "conflicts_detected": len(conflicts),
            "conflicts_resolved": sum(1 for c in conflicts if c.resolved_at is not None),
            "manual_conflicts": sum(1 for c in conflicts if c.requires_manual_confirmation and not c.resolved_at),
            "bad_rows": len(self.result.bad_rows),
            "skipped_rows": len(self.result.skipped_rows),
        }
