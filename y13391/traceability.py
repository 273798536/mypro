from __future__ import annotations

from typing import Any

from models import (
    BadDataPointer,
    DataQuality,
    FeatureRecord,
    SkewedSample,
    VersionSnapshot,
)


def trace_late_features(snapshot: VersionSnapshot) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for feat in snapshot.features:
        if feat.quality != DataQuality.LATE:
            continue
        entry = {
            "feature_name": feat.feature_name,
            "late_reason": feat.late_reason,
            "original_value": feat.source.raw_value if feat.source else None,
            "original_row": feat.source.original_row if feat.source else None,
            "original_file": feat.source.original_file if feat.source else None,
            "source_task": feat.source.source_task if feat.source else None,
            "unit": feat.unit,
            "formula": feat.formula,
            "screenshot_note": feat.screenshot_note,
        }
        results.append(entry)
    return results


def trace_skewing_samples(snapshot: VersionSnapshot, top_n: int = 10) -> list[dict[str, Any]]:
    sorted_samples = sorted(snapshot.skewed_samples, key=lambda s: s.contribution_score, reverse=True)
    results: list[dict[str, Any]] = []
    for sample in sorted_samples[:top_n]:
        entry = {
            "sample_id": sample.sample_id,
            "feature_name": sample.feature_name,
            "sample_value": sample.sample_value,
            "expected_range": sample.expected_range,
            "contribution_score": sample.contribution_score,
            "original_row": sample.source.original_row if sample.source else None,
            "original_file": sample.source.original_file if sample.source else None,
            "source_task": sample.source.source_task if sample.source else None,
        }
        results.append(entry)
    return results


def trace_bad_data(snapshot: VersionSnapshot) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for pointer in snapshot.bad_data_pointers:
        entry = {
            "feature_name": pointer.feature_name,
            "original_row": pointer.original_row,
            "original_file": pointer.original_file,
            "column_name": pointer.column_name,
            "raw_value": pointer.raw_value,
            "issue": pointer.issue,
        }
        results.append(entry)
    return results


def generate_traceability_report(snapshot: VersionSnapshot, top_n: int = 10) -> dict[str, Any]:
    late_traces = trace_late_features(snapshot)
    skew_traces = trace_skewing_samples(snapshot, top_n)
    bad_traces = trace_bad_data(snapshot)

    return {
        "snapshot_version": snapshot.version,
        "client_name": snapshot.client_name,
        "snapshot_time": snapshot.snapshot_time,
        "late_features": {
            "count": len(late_traces),
            "details": late_traces,
        },
        "skewing_samples": {
            "count": len(skew_traces),
            "top_n": top_n,
            "details": skew_traces,
        },
        "bad_data_pointers": {
            "count": len(bad_traces),
            "details": bad_traces,
        },
        "summary": {
            "total_features": snapshot.total_features,
            "clean_features": snapshot.clean_count,
            "dirty_features": snapshot.dirty_count,
            "out_of_boundary": snapshot.out_of_boundary_count,
        },
    }
