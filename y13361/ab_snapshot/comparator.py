from typing import Dict, List, Any
from .models import (
    VersionSnapshot, SnapCompareResult, DiffItem,
    SampleRecord, MetricItem, ManualAdjustment,
    now_iso
)


def _find_metric(snapshot: VersionSnapshot, name: str) -> MetricItem:
    for m in snapshot.metrics:
        if m.name == name:
            return m
    return None


def _find_sample(snapshot: VersionSnapshot, sid: str) -> SampleRecord:
    for s in snapshot.samples:
        if s.sample_id == sid:
            return s
    return None


def _find_manual_adj(snapshot: VersionSnapshot, item_id: str, field: str) -> ManualAdjustment:
    for a in snapshot.manual_adjustments:
        if a.item_id == item_id and a.field_name == field:
            return a
    return None


def compare_metrics(old: VersionSnapshot, new: VersionSnapshot) -> List[DiffItem]:
    diffs = []
    seen = set()
    for m_new in new.metrics:
        seen.add(m_new.name)
        m_old = _find_metric(old, m_new.name)
        if m_old is None:
            diffs.append(DiffItem(
                category="metric",
                field=m_new.name,
                old_value=None,
                new_value=m_new.value,
                note="新增指标"
            ))
            continue
        if m_old.value != m_new.value:
            diffs.append(DiffItem(
                category="metric",
                field=m_new.name,
                old_value=m_old.value,
                new_value=m_new.value,
                note=f"指标值变化: {m_old.value} → {m_new.value}"
            ))
    for m_old in old.metrics:
        if m_old.name not in seen:
            diffs.append(DiffItem(
                category="metric",
                field=m_old.name,
                old_value=m_old.value,
                new_value=None,
                note="指标被移除"
            ))
    return diffs


def compare_thresholds(old: VersionSnapshot, new: VersionSnapshot) -> List[DiffItem]:
    diffs = []
    seen = set()
    for m_new in new.metrics:
        seen.add(m_new.name)
        if m_new.threshold is None:
            continue
        m_old = _find_metric(old, m_new.name)
        old_th = m_old.threshold if m_old else None
        if old_th != m_new.threshold:
            diffs.append(DiffItem(
                category="threshold",
                field=m_new.name,
                old_value=old_th,
                new_value=m_new.threshold,
                note=f"阈值变更: {old_th} → {m_new.threshold}"
            ))
    return diffs


def compare_samples(old: VersionSnapshot, new: VersionSnapshot) -> List[DiffItem]:
    diffs = []
    old_ids = {s.sample_id for s in old.samples}
    new_ids = {s.sample_id for s in new.samples}

    added = new_ids - old_ids
    removed = old_ids - new_ids

    for sid in sorted(added):
        diffs.append(DiffItem(
            category="sample",
            field=f"sample:{sid}",
            old_value=None,
            new_value="added",
            sample_refs=[sid],
            note="新增样本"
        ))
    for sid in sorted(removed):
        diffs.append(DiffItem(
            category="sample",
            field=f"sample:{sid}",
            old_value="existed",
            new_value=None,
            sample_refs=[sid],
            note="样本被移除"
        ))

    for sid in sorted(old_ids & new_ids):
        s_old = _find_sample(old, sid)
        s_new = _find_sample(new, sid)
        if s_old is None or s_new is None:
            continue
        if s_old.features != s_new.features:
            diffs.append(DiffItem(
                category="sample",
                field=f"sample:{sid}:features",
                old_value=s_old.features,
                new_value=s_new.features,
                sample_refs=[sid],
                note="样本特征值变化"
            ))
        if s_old.label != s_new.label:
            diffs.append(DiffItem(
                category="sample",
                field=f"sample:{sid}:label",
                old_value=s_old.label,
                new_value=s_new.label,
                sample_refs=[sid],
                note="样本标签变化"
            ))
        if s_old.prediction != s_new.prediction:
            diffs.append(DiffItem(
                category="sample",
                field=f"sample:{sid}:prediction",
                old_value=s_old.prediction,
                new_value=s_new.prediction,
                sample_refs=[sid],
                note="模型预测结果变化"
            ))
    return diffs


def compare_manual_corrections(old: VersionSnapshot, new: VersionSnapshot) -> List[DiffItem]:
    diffs = []
    old_keys = {(a.item_id, a.field_name) for a in old.manual_adjustments}
    new_keys = {(a.item_id, a.field_name) for a in new.manual_adjustments}

    added = new_keys - old_keys
    removed = old_keys - new_keys
    common = old_keys & new_keys

    for k in sorted(added):
        a = _find_manual_adj(new, k[0], k[1])
        if a:
            diffs.append(DiffItem(
                category="manual_correction",
                field=f"{k[0]}:{k[1]}",
                old_value=None,
                new_value=a.new_value,
                sample_refs=[k[0]],
                note=f"新增人工修正: {a.reason} (操作人: {a.operator})"
            ))
    for k in sorted(removed):
        a = _find_manual_adj(old, k[0], k[1])
        if a:
            diffs.append(DiffItem(
                category="manual_correction",
                field=f"{k[0]}:{k[1]}",
                old_value=a.old_value,
                new_value=None,
                sample_refs=[k[0]],
                note="人工修正被撤销"
            ))
    for k in sorted(common):
        a_old = _find_manual_adj(old, k[0], k[1])
        a_new = _find_manual_adj(new, k[0], k[1])
        if a_old and a_new and a_old.new_value != a_new.new_value:
            diffs.append(DiffItem(
                category="manual_correction",
                field=f"{k[0]}:{k[1]}",
                old_value=a_old.new_value,
                new_value=a_new.new_value,
                sample_refs=[k[0]],
                note=f"人工修正值变更: {a_old.reason} → {a_new.reason}"
            ))
    return diffs


def collect_late_feature_records(snapshot: VersionSnapshot) -> List[str]:
    return sorted([s.sample_id for s in snapshot.samples if s.is_feature_late])


def run_full_compare(old: VersionSnapshot, new: VersionSnapshot) -> SnapCompareResult:
    result = SnapCompareResult(
        old_version=old.version_tag,
        new_version=new.version_tag,
        compared_at=now_iso()
    )
    result.metric_diffs = compare_metrics(old, new)
    result.threshold_diffs = compare_thresholds(old, new)
    result.sample_diffs = compare_samples(old, new)
    result.manual_correction_diffs = compare_manual_corrections(old, new)
    result.late_feature_records_old = collect_late_feature_records(old)
    result.late_feature_records_new = collect_late_feature_records(new)

    if (len(result.metric_diffs) == 0 and len(result.threshold_diffs) == 0
            and len(result.sample_diffs) == 0 and len(result.manual_correction_diffs) == 0
            and len(result.caliber_changes) == 0
            and set(result.late_feature_records_old) == set(result.late_feature_records_new)):
        result.overall_status = "clean"
    else:
        result.overall_status = "has_diffs"
    return result
