from typing import List, Dict, Any
from .models import ClusterRecord, CompareResult, ParseStats, ManualCorrection


def compare_versions(
    records_old: List[ClusterRecord],
    records_new: List[ClusterRecord],
    stats_old: ParseStats,
    stats_new: ParseStats,
    version_old: str = "v1",
    version_new: str = "v2",
    threshold: float = 0.5,
    manual_corrections: List[ManualCorrection] = None,
) -> CompareResult:
    if manual_corrections is None:
        manual_corrections = []

    old_map = {r.cluster_id: r for r in records_old}
    new_map = {r.cluster_id: r for r in records_new}

    old_ids = set(old_map.keys())
    new_ids = set(new_map.keys())

    new_clusters = sorted(list(new_ids - old_ids))
    removed_clusters = sorted(list(old_ids - new_ids))
    common_ids = old_ids & new_ids

    changed_clusters = []
    sentiment_changes = {"positive": 0, "negative": 0, "neutral": 0, "total": 0}
    confidence_diffs = []

    for cid in sorted(common_ids):
        old_r = old_map[cid]
        new_r = new_map[cid]

        changes = _compare_record(old_r, new_r)
        if changes:
            changed_clusters.append({
                "cluster_id": cid,
                "title": new_r.title,
                "changes": changes,
            })

            for change in changes:
                if change["field"] == "sentiment":
                    sentiment_changes["total"] += 1
                    if change["new"] in sentiment_changes:
                        sentiment_changes[change["new"]] += 1
                if change["field"] == "confidence":
                    confidence_diffs.append(change["new"] - change["old"])

    citation_issues = []
    for r in records_new:
        if not r.has_citation and r.confidence >= threshold:
            citation_issues.append(
                f"聚类 {r.cluster_id} ({r.title}): 无引用但置信度 {r.confidence:.2f} (>= {threshold})"
            )

    confidence_stats = _calc_confidence_stats(records_old, records_new)
    threshold_metrics = _calc_threshold_metrics(records_old, records_new, threshold)
    manual_correction_impact = _calc_manual_correction_impact(manual_corrections, records_new, version_new)

    return CompareResult(
        version_old=version_old,
        version_new=version_new,
        total_clusters_old=len(records_old),
        total_clusters_new=len(records_new),
        new_clusters=new_clusters,
        removed_clusters=removed_clusters,
        changed_clusters=changed_clusters,
        sentiment_changes=sentiment_changes,
        confidence_stats=confidence_stats,
        threshold_metrics=threshold_metrics,
        manual_correction_impact=manual_correction_impact,
        citation_issues=citation_issues,
        parse_stats_old=stats_old,
        parse_stats_new=stats_new,
    )


def _compare_record(old_r: ClusterRecord, new_r: ClusterRecord) -> List[Dict[str, Any]]:
    changes = []

    fields = [
        ("title", str),
        ("sentiment", str),
        ("confidence", float),
        ("source", str),
        ("has_citation", bool),
        ("citation_note", str),
    ]

    for field_name, _ in fields:
        old_val = getattr(old_r, field_name)
        new_val = getattr(new_r, field_name)
        if old_val != new_val:
            changes.append({
                "field": field_name,
                "old": old_val,
                "new": new_val,
            })

    return changes


def _calc_confidence_stats(records_old: List[ClusterRecord], records_new: List[ClusterRecord]) -> Dict[str, float]:
    def _stats(records):
        if not records:
            return {"avg": 0.0, "min": 0.0, "max": 0.0, "median": 0.0}
        confs = sorted([r.confidence for r in records])
        n = len(confs)
        return {
            "avg": sum(confs) / n,
            "min": confs[0],
            "max": confs[-1],
            "median": confs[n // 2] if n % 2 == 1 else (confs[n // 2 - 1] + confs[n // 2]) / 2,
        }

    old_stats = _stats(records_old)
    new_stats = _stats(records_new)

    return {
        "old_avg": old_stats["avg"],
        "new_avg": new_stats["avg"],
        "diff_avg": new_stats["avg"] - old_stats["avg"],
        "old_min": old_stats["min"],
        "new_min": new_stats["min"],
        "old_max": old_stats["max"],
        "new_max": new_stats["max"],
        "old_median": old_stats["median"],
        "new_median": new_stats["median"],
    }


def _calc_threshold_metrics(records_old: List[ClusterRecord], records_new: List[ClusterRecord], threshold: float) -> Dict[str, Any]:
    def _count(records):
        above = sum(1 for r in records if r.confidence >= threshold)
        below = len(records) - above
        return {"above": above, "below": below, "total": len(records)}

    old_counts = _count(records_old)
    new_counts = _count(records_new)

    return {
        "threshold": threshold,
        "old_above_threshold": old_counts["above"],
        "new_above_threshold": new_counts["above"],
        "diff_above_threshold": new_counts["above"] - old_counts["above"],
        "old_below_threshold": old_counts["below"],
        "new_below_threshold": new_counts["below"],
    }


def _calc_manual_correction_impact(
    corrections: List[ManualCorrection],
    records_new: List[ClusterRecord],
    version_new: str,
) -> List[Dict[str, Any]]:
    impact = []
    new_map = {r.cluster_id: r for r in records_new}

    version_corrections = [c for c in corrections if c.version == version_new]

    for corr in version_corrections:
        record = new_map.get(corr.cluster_id)
        if record:
            impact.append({
                "correction_id": corr.correction_id,
                "cluster_id": corr.cluster_id,
                "cluster_title": record.title,
                "field": corr.field_name,
                "old_value": corr.old_value,
                "new_value": corr.new_value,
                "operator": corr.operator,
                "remark": corr.remark,
                "created_at": corr.created_at,
            })

    return impact
