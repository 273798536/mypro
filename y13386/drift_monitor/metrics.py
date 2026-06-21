import math
from typing import List, Dict, Any, Tuple
import numpy as np
from .models import FeatureStats, FeatureDrift, DriftStatus, ThresholdConfig


def compute_stats(values: List[float], feature_name: str, boundary_count: int = 3) -> FeatureStats:
    if not values:
        return FeatureStats(
            feature_name=feature_name,
            mean=0.0, std=0.0, p5=0.0, p50=0.0, p95=0.0,
            missing_rate=1.0, sample_count=0, boundary_samples=[]
        )

    arr = np.array(values, dtype=float)
    valid = arr[~np.isnan(arr)]
    missing_rate = float(np.isnan(arr).sum()) / len(arr)

    if len(valid) == 0:
        return FeatureStats(
            feature_name=feature_name,
            mean=0.0, std=0.0, p5=0.0, p50=0.0, p95=0.0,
            missing_rate=missing_rate, sample_count=0, boundary_samples=[]
        )

    sorted_idx = np.argsort(valid)
    low_indices = sorted_idx[:boundary_count]
    high_indices = sorted_idx[-boundary_count:]

    boundary_samples = []
    for idx in low_indices:
        boundary_samples.append({
            "position": "low",
            "value": float(valid[idx]),
            "index": int(idx),
            "deviation_from_p50": float(valid[idx] - np.percentile(valid, 50))
        })
    for idx in high_indices:
        boundary_samples.append({
            "position": "high",
            "value": float(valid[idx]),
            "index": int(idx),
            "deviation_from_p50": float(valid[idx] - np.percentile(valid, 50))
        })

    return FeatureStats(
        feature_name=feature_name,
        mean=float(np.mean(valid)),
        std=float(np.std(valid)) if len(valid) > 1 else 0.0,
        p5=float(np.percentile(valid, 5)),
        p50=float(np.percentile(valid, 50)),
        p95=float(np.percentile(valid, 95)),
        missing_rate=missing_rate,
        sample_count=len(valid),
        boundary_samples=boundary_samples
    )


def psi_score(expected: List[float], actual: List[float], bins: int = 10) -> float:
    if len(expected) == 0 or len(actual) == 0:
        return 0.0

    exp_arr = np.array(expected, dtype=float)
    act_arr = np.array(actual, dtype=float)
    exp_arr = exp_arr[~np.isnan(exp_arr)]
    act_arr = act_arr[~np.isnan(act_arr)]

    if len(exp_arr) == 0 or len(act_arr) == 0:
        return 0.0

    all_data = np.concatenate([exp_arr, act_arr])
    breakpoints = np.percentile(all_data, np.linspace(0, 100, bins + 1))
    breakpoints = np.unique(breakpoints)

    if len(breakpoints) < 2:
        return 0.0

    exp_counts, _ = np.histogram(exp_arr, bins=breakpoints)
    act_counts, _ = np.histogram(act_arr, bins=breakpoints)

    exp_rates = exp_counts / len(exp_arr)
    act_rates = act_counts / len(act_arr)

    psi = 0.0
    for e, a in zip(exp_rates, act_rates):
        e = max(e, 1e-6)
        a = max(a, 1e-6)
        psi += (a - e) * math.log(a / e)

    return float(psi)


def ks_statistic(expected: List[float], actual: List[float]) -> float:
    if len(expected) == 0 or len(actual) == 0:
        return 0.0

    exp_arr = np.array(expected, dtype=float)
    act_arr = np.array(actual, dtype=float)
    exp_arr = exp_arr[~np.isnan(exp_arr)]
    act_arr = act_arr[~np.isnan(act_arr)]

    if len(exp_arr) == 0 or len(act_arr) == 0:
        return 0.0

    all_values = np.sort(np.unique(np.concatenate([exp_arr, act_arr])))
    exp_cdf = np.searchsorted(np.sort(exp_arr), all_values, side='right') / len(exp_arr)
    act_cdf = np.searchsorted(np.sort(act_arr), all_values, side='right') / len(act_arr)

    return float(np.max(np.abs(exp_cdf - act_cdf)))


def determine_status(psi: float, ks: float, sample_count: int,
                     threshold: ThresholdConfig) -> DriftStatus:
    if sample_count < threshold.min_samples:
        return DriftStatus.GRAY

    if psi >= threshold.psi_drift or ks >= threshold.ks_drift:
        return DriftStatus.DRIFTED
    elif psi >= threshold.psi_warning or ks >= threshold.ks_warning:
        return DriftStatus.WARNING
    return DriftStatus.NORMAL


def compute_feature_drift(feature_name: str,
                          baseline_values: List[float],
                          current_values: List[float],
                          threshold: ThresholdConfig) -> FeatureDrift:
    baseline_stats = compute_stats(baseline_values, feature_name)
    current_stats = compute_stats(current_values, feature_name)

    psi = psi_score(baseline_values, current_values)
    ks = ks_statistic(baseline_values, current_values)

    status = determine_status(psi, ks, current_stats.sample_count, threshold)

    return FeatureDrift(
        feature_name=feature_name,
        psi=psi,
        ks_stat=ks,
        status=status,
        baseline_stats=baseline_stats,
        current_stats=current_stats
    )


def aggregate_status(statuses: List[DriftStatus]) -> DriftStatus:
    if not statuses:
        return DriftStatus.GRAY
    priority = [DriftStatus.DRIFTED, DriftStatus.WARNING, DriftStatus.GRAY, DriftStatus.NORMAL]
    for s in priority:
        if s in statuses:
            return s
    return DriftStatus.NORMAL
