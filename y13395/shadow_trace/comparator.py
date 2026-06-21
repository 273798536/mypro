from __future__ import annotations

from collections import defaultdict
from typing import Dict, List, Any, Tuple

from .models import (
    TraceRecord,
    TaskStatus,
    PollutionStatus,
    VersionDiff,
    RunStats,
)


def _stats_from_records(records: List[TraceRecord]) -> RunStats:
    s = RunStats()
    for r in records:
        s.inc(r.status)
        s.inc_pollution(r.pollution)
    return s


def compare_versions(
    records_a: List[TraceRecord],
    records_b: List[TraceRecord],
    tag_a: str = "v1",
    tag_b: str = "v2",
) -> VersionDiff:
    diff = VersionDiff(version_a=tag_a, version_b=tag_b)

    map_a: Dict[str, TraceRecord] = {r.sample_id: r for r in records_a}
    map_b: Dict[str, TraceRecord] = {r.sample_id: r for r in records_b}

    ids_a = set(map_a.keys())
    ids_b = set(map_b.keys())

    diff.sample_diff = {
        "total_a": len(ids_a),
        "total_b": len(ids_b),
        "only_in_a": sorted(list(ids_a - ids_b)),
        "only_in_b": sorted(list(ids_b - ids_a)),
        "common": sorted(list(ids_a & ids_b)),
    }

    threshold_changes: List[Dict[str, Any]] = []
    score_changes: List[Dict[str, Any]] = []
    for sid in ids_a & ids_b:
        ra, rb = map_a[sid], map_b[sid]
        if ra.threshold != rb.threshold:
            threshold_changes.append(
                {
                    "sample_id": sid,
                    f"{tag_a}": ra.threshold,
                    f"{tag_b}": rb.threshold,
                    "delta": (rb.threshold or 0) - (ra.threshold or 0) if (ra.threshold is not None and rb.threshold is not None) else None,
                }
            )
        if ra.prediction_score != rb.prediction_score:
            score_changes.append(
                {
                    "sample_id": sid,
                    f"{tag_a}": ra.prediction_score,
                    f"{tag_b}": rb.prediction_score,
                    "delta": (rb.prediction_score or 0) - (ra.prediction_score or 0) if (ra.prediction_score is not None and rb.prediction_score is not None) else None,
                }
            )

    diff.threshold_diff = {
        "threshold_changes": threshold_changes,
        "score_changes": score_changes,
    }

    review_diff: Dict[str, Any] = {
        "reviewed_in_a": [r.sample_id for r in records_a if r.review_history],
        "reviewed_in_b": [r.sample_id for r in records_b if r.review_history],
        "review_changes": [],
    }
    for sid in ids_a & ids_b:
        ra, rb = map_a[sid], map_b[sid]
        if len(ra.review_history) != len(rb.review_history):
            review_diff["review_changes"].append(
                {
                    "sample_id": sid,
                    f"{tag_a}_reviews": len(ra.review_history),
                    f"{tag_b}_reviews": len(rb.review_history),
                    f"{tag_a}_conclusion": ra.final_conclusion,
                    f"{tag_b}_conclusion": rb.final_conclusion,
                }
            )
    diff.human_review_diff = review_diff

    stats_a = _stats_from_records(records_a)
    stats_b = _stats_from_records(records_b)

    def _calc_rate(num: int, den: int) -> float:
        return (num / den * 100) if den else 0.0

    metrics: Dict[str, Any] = {}
    for k in ("success", "failed", "skipped", "bad_rows", "pending_review", "human_overruled", "finalized"):
        va = getattr(stats_a, k)
        vb = getattr(stats_b, k)
        metrics[k] = {
            tag_a: va,
            tag_b: vb,
            "delta": vb - va,
            f"{tag_a}_rate": _calc_rate(va, stats_a.total),
            f"{tag_b}_rate": _calc_rate(vb, stats_b.total),
        }
    for k in ("clean", "suspected_pollution", "confirmed_pollution"):
        va = getattr(stats_a, k)
        vb = getattr(stats_b, k)
        metrics[k] = {
            tag_a: va,
            tag_b: vb,
            "delta": vb - va,
        }

    status_flips: List[Dict[str, Any]] = []
    for sid in ids_a & ids_b:
        ra, rb = map_a[sid], map_b[sid]
        if ra.status != rb.status:
            status_flips.append(
                {
                    "sample_id": sid,
                    f"{tag_a}_status": ra.status.value,
                    f"{tag_b}_status": rb.status.value,
                    f"{tag_a}_pollution": ra.pollution.value,
                    f"{tag_b}_pollution": rb.pollution.value,
                }
            )
    diff.status_diff = {
        "flips": status_flips,
        "total_flips": len(status_flips),
    }
    diff.metric_diff = metrics

    return diff
