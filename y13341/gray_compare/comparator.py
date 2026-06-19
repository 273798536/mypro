from typing import List, Dict
from collections import defaultdict
from .models import (
    SampleRecord, ModelResult, LateAttachment, CompareItem,
    CompareSummary, CompareResult, TagConflict, HistoryEntry
)


def run_compare(
    old_results: List[ModelResult],
    new_results: List[ModelResult],
    samples: List[SampleRecord] = None,
    late_attachments: List[LateAttachment] = None,
    history: List[HistoryEntry] = None,
) -> CompareResult:
    samples = samples or []
    late_attachments = late_attachments or []
    history = history or []

    sample_idx = {s.sample_id: s for s in samples}
    old_idx = {r.sample_id: r for r in old_results}
    new_idx = {r.sample_id: r for r in new_results}

    attach_by_sample = defaultdict(list)
    for att in late_attachments:
        if att.sample_id:
            attach_by_sample[att.sample_id].append(att)

    all_sample_ids = sorted(set(list(old_idx.keys()) + list(new_idx.keys()) + list(sample_idx.keys())))

    items = []
    summary = CompareSummary()
    summary.total_samples = len(all_sample_ids)

    for sid in all_sample_ids:
        old_r = old_idx.get(sid)
        new_r = new_idx.get(sid)
        sample = sample_idx.get(sid)
        atts = attach_by_sample.get(sid, [])

        item = CompareItem(
            sample_id=sid,
            old_result=old_r,
            new_result=new_r,
            sample=sample,
            late_attachments=atts,
        )

        if old_r and not new_r:
            summary.old_only += 1
        elif new_r and not old_r:
            summary.new_only += 1
        elif old_r and new_r:
            summary.both += 1

        if old_r and new_r and old_r.conclusion != new_r.conclusion:
            item.conclusion_changed = True
            change_type = _classify_change(old_r.conclusion, new_r.conclusion)
            item.change_type = change_type
            summary.conclusion_changed += 1
            summary.change_types[change_type] = summary.change_types.get(change_type, 0) + 1
        elif old_r and new_r and old_r.conclusion == new_r.conclusion:
            summary.conclusion_same += 1

        item.tag_conflicts = _detect_tag_conflicts(sample, old_r, new_r)
        summary.tag_conflict_count += len(item.tag_conflicts)

        summary.late_attachment_count += len(atts)

        item.manual_notes = _get_history_notes(history, sid)

        items.append(item)

    return CompareResult(
        summary=summary,
        items=items,
        history=history,
    )


def _classify_change(old_conc: str, new_conc: str) -> str:
    old_lower = old_conc.lower()
    new_lower = new_conc.lower()

    positive_terms = {"通过", "同意", "正常", "pass", "ok", "positive"}
    negative_terms = {"拒绝", "驳回", "异常", "fail", "reject", "negative"}

    old_pos = any(t in old_lower for t in positive_terms)
    new_pos = any(t in new_lower for t in positive_terms)
    old_neg = any(t in old_lower for t in negative_terms)
    new_neg = any(t in new_lower for t in negative_terms)

    if old_neg and new_pos:
        return "误杀改放过"
    if old_pos and new_neg:
        return "放过改误杀"
    if old_lower == new_lower:
        return "结论一致"
    return f"{old_conc} → {new_conc}"


def _detect_tag_conflicts(
    sample: SampleRecord,
    old_r: ModelResult,
    new_r: ModelResult,
) -> List[TagConflict]:
    conflicts = []
    if not sample or not sample.original_label:
        return conflicts

    label = sample.original_label.strip()
    all_tags = set()
    if old_r:
        all_tags.update(old_r.tags)
    if new_r:
        all_tags.update(new_r.tags)

    if not all_tags:
        return conflicts

    for tag in all_tags:
        if tag and label and tag != label and not _tag_compatible(tag, label):
            conflicts.append(TagConflict(
                sample_id=sample.sample_id,
                sample_table_label=label,
                model_tag=tag,
                sample_original_text=sample.original_text,
                source_table=sample.source_table,
                row_index=sample.row_index,
            ))
    return conflicts


def _tag_compatible(tag: str, label: str) -> bool:
    tag_lower = tag.lower()
    label_lower = label.lower()
    if tag_lower in label_lower or label_lower in tag_lower:
        return True
    synonym_map = {
        "通过": {"pass", "ok", "正常", "同意"},
        "拒绝": {"reject", "fail", "驳回", "异常"},
        "pass": {"通过", "正常", "同意"},
        "reject": {"拒绝", "驳回", "异常"},
    }
    for key, syns in synonym_map.items():
        if key in tag_lower and any(s in label_lower for s in syns):
            return True
        if key in label_lower and any(s in tag_lower for s in syns):
            return True
    return False


def _get_history_notes(history: List[HistoryEntry], sample_id: str) -> List[str]:
    notes = []
    for h in history:
        if h.sample_id == sample_id:
            notes.append(f"[{h.timestamp}] {h.operator} 将 {h.field} 从 '{h.old_value}' 改为 '{h.new_value}'（{h.reason}）")
    return notes
