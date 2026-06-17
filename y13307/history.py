from __future__ import annotations

from typing import Dict, List, Optional

from engine import compute_metrics
from models import HistoryEntry, JudgmentStatus, RowStatus, VersionDiff


def find_history_entry(history: List[HistoryEntry], version: str) -> Optional[HistoryEntry]:
    for entry in reversed(history):
        if entry.version == version:
            return entry
    return None


def diff_versions(entry_a: HistoryEntry, entry_b: HistoryEntry) -> VersionDiff:
    diff = VersionDiff(version_a=entry_a.version, version_b=entry_b.version)

    samples_a = {s.sample_id: s for s in entry_a.samples}
    samples_b = {s.sample_id: s for s in entry_b.samples}
    all_ids = set(samples_a.keys()) | set(samples_b.keys())

    for sid in sorted(all_ids):
        sa = samples_a.get(sid)
        sb = samples_b.get(sid)
        changes: Dict[str, str] = {}
        if sa and sb:
            if sa.final_status != sb.final_status:
                changes["判定状态"] = f"{sa.final_status.value} → {sb.final_status.value}"
            if sa.predicted_status != sb.predicted_status:
                changes["模型预测"] = f"{sa.predicted_status.value} → {sb.predicted_status.value}"
            if sa.row_status != sb.row_status:
                changes["行状态"] = f"{sa.row_status.value} → {sb.row_status.value}"
            if len(sb.corrections) > len(sa.corrections):
                changes["人工修正次数"] = f"{len(sa.corrections)} → {len(sb.corrections)}（新增）"
        elif sb and not sa:
            changes["样本状态"] = "新增样本"
        elif sa and not sb:
            changes["样本状态"] = "样本已移除"
        if changes:
            diff.sample_changes[sid] = changes

    ta = entry_a.version_note.threshold_adjustment or {}
    tb = entry_b.version_note.threshold_adjustment or {}
    all_keys = set(ta.keys()) | set(tb.keys())
    for k in sorted(all_keys):
        va, vb = ta.get(k), tb.get(k)
        if va != vb:
            diff.threshold_changes[k] = {"旧值": va, "新值": vb}

    ma = compute_metrics(entry_a.samples)
    mb = compute_metrics(entry_b.samples)
    all_metric_keys = set(ma.keys()) | set(mb.keys())
    for k in sorted(all_metric_keys):
        va, vb = ma.get(k), mb.get(k)
        if va != vb:
            diff.metric_changes[k] = {"旧值": va, "新值": vb}

    return diff


def collect_correction_trail(samples) -> List[dict]:
    trail = []
    for s in samples:
        if s.corrections:
            for idx, corr in enumerate(s.corrections, 1):
                trail.append({
                    "样本ID": s.sample_id,
                    "第几次修正": idx,
                    "操作人": corr.operator,
                    "原状态": corr.old_status.value,
                    "新状态": corr.new_status.value,
                    "原因": corr.reason,
                    "时间": corr.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                })
    return trail
