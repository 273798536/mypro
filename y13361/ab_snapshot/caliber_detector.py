import re
from typing import Dict, List, Tuple, Any, Optional
from .models import (
    VersionSnapshot, MaterialMeta, CaliberChange,
    SampleRecord, now_iso, compute_content_hash
)


MATERIAL_TYPE_TRAINING_LOG = "training_log"
MATERIAL_TYPE_NORMAL_RECORD = "normal_record"
MATERIAL_TYPE_VERBAL_NOTE = "verbal_note"


CALIBER_KEYWORDS = [
    "口径", "metric", "指标", "阈值", "threshold", "样本", "sample",
    "特征", "feature", "label", "标签", "过滤", "filter", "权重", "weight",
    "归一化", "normalize", "分桶", "bucket", "离线", "online", "线上", "offline"
]


def _strip_version_prefix(name: str, old_tag: str, new_tag: str) -> str:
    for prefix in (f"{old_tag}_", f"{new_tag}_"):
        if name.startswith(prefix):
            return name[len(prefix):]
    return name


def detect_material_hash_changes(
    old: VersionSnapshot, new: VersionSnapshot
) -> List[CaliberChange]:
    changes = []
    old_tag, new_tag = old.version_tag, new.version_tag

    old_by_type: Dict[str, MaterialMeta] = {
        _strip_version_prefix(m.material_name, old_tag, new_tag): m
        for m in old.materials
    }
    new_by_type: Dict[str, MaterialMeta] = {
        _strip_version_prefix(m.material_name, old_tag, new_tag): m
        for m in new.materials
    }

    all_types = set(old_by_type.keys()) | set(new_by_type.keys())
    for t in sorted(all_types):
        o = old_by_type.get(t)
        n = new_by_type.get(t)
        if o and n and o.content_hash != n.content_hash:
            changes.append(CaliberChange(
                material_name=f"{o.material_name} → {n.material_name}",
                field_path="content_hash",
                old_value=o.content_hash,
                new_value=n.content_hash,
                change_type="material_modified",
                evidence=f"材料「{t}」内容hash从 {o.content_hash[:8]} 变为 {n.content_hash[:8]}（疑似改过口径）"
            ))
        elif o is None and n:
            changes.append(CaliberChange(
                material_name=n.material_name,
                field_path="material_presence",
                old_value=None,
                new_value="added",
                change_type="material_added",
                evidence=f"当前版新增材料「{t}」，前版未提供"
            ))
        elif o and n is None:
            changes.append(CaliberChange(
                material_name=o.material_name,
                field_path="material_presence",
                old_value="existed",
                new_value=None,
                change_type="material_removed",
                evidence=f"当前版缺失材料「{t}」（前版有，当前版未提供）"
            ))
    return changes


def _scan_text_for_caliber_keywords(text: str) -> List[Tuple[str, int, str]]:
    hits = []
    if not text:
        return hits
    lines = text.splitlines()
    for idx, line in enumerate(lines, start=1):
        line_lower = line.lower()
        for kw in CALIBER_KEYWORDS:
            if kw.lower() in line_lower:
                hits.append((kw, idx, line.strip()))
                break
    return hits


def detect_log_caliber_changes(
    old: VersionSnapshot, new: VersionSnapshot
) -> List[CaliberChange]:
    changes = []
    old_hits = {h[2] for h in _scan_text_for_caliber_keywords(old.raw_training_log)}
    new_hits_raw = _scan_text_for_caliber_keywords(new.raw_training_log)

    for kw, ln, line in new_hits_raw:
        if line not in old_hits:
            changes.append(CaliberChange(
                material_name="training_log",
                field_path=f"line_{ln}",
                old_value=None,
                new_value=line,
                change_type="log_caliber_hint",
                evidence=f"训练日志第{ln}行出现口径/指标关键词「{kw}」：{line}"
            ))

    old_notes_hits = {h[2] for h in _scan_text_for_caliber_keywords(old.notes)}
    new_notes_hits_raw = _scan_text_for_caliber_keywords(new.notes)
    for kw, ln, line in new_notes_hits_raw:
        if line not in old_notes_hits:
            changes.append(CaliberChange(
                material_name="verbal_note",
                field_path=f"line_{ln}",
                old_value=None,
                new_value=line,
                change_type="note_caliber_hint",
                evidence=f"口头说明第{ln}行出现口径/指标关键词「{kw}」：{line}"
            ))
    return changes


FEATURE_LATE_THRESHOLD_MS = 500


def flag_late_feature_records(samples: List[SampleRecord], threshold_ms: int = FEATURE_LATE_THRESHOLD_MS) -> None:
    for s in samples:
        if s.feature_arrival_latency_ms > threshold_ms and not s.is_feature_late:
            s.is_feature_late = True


def extract_late_feature_evidence(snapshot: VersionSnapshot) -> List[Dict[str, Any]]:
    evidence = []
    for s in snapshot.samples:
        if s.is_feature_late:
            evidence.append({
                "sample_id": s.sample_id,
                "latency_ms": s.feature_arrival_latency_ms,
                "prediction": s.prediction,
                "label": s.label,
                "evidence_refs": s.evidence_refs,
                "note": f"特征到达延迟 {s.feature_arrival_latency_ms}ms，超过阈值 {FEATURE_LATE_THRESHOLD_MS}ms"
            })
    return evidence


def run_caliber_and_late_analysis(
    old: VersionSnapshot, new: VersionSnapshot, result: Any
) -> None:
    flag_late_feature_records(new.samples)
    flag_late_feature_records(old.samples)

    hash_changes = detect_material_hash_changes(old, new)
    log_changes = detect_log_caliber_changes(old, new)
    result.caliber_changes = hash_changes + log_changes

    if len(result.caliber_changes) > 0:
        result.overall_status = "needs_review"
