"""
海草床覆盖度估算主模块
串联：气象预报 + 潮汐 + 轨迹清洗 → 覆盖度估算
所有步骤都写入共用的 ProcessingRecord，保证溯源完整。
"""

import math
from typing import List, Dict, Tuple

from .models import (
    ProcessingRecord, STAGE_COVERAGE_ESTIMATION,
    RECORD_STATUS_ESTIMATED
)


DEPTH_OPTIMAL = (2.0, 12.0)
DEPTH_TOLERABLE = (0.5, 25.0)
TIDE_OPTIMAL_RANGE = (0.3, 0.7)


def _depth_factor(depth: float) -> float:
    if depth <= 0:
        return 0.0
    opt_low, opt_high = DEPTH_OPTIMAL
    tol_low, tol_high = DEPTH_TOLERABLE

    if opt_low <= depth <= opt_high:
        return 1.0
    if tol_low <= depth < opt_low:
        return (depth - tol_low) / (opt_low - tol_low)
    if opt_high < depth <= tol_high:
        return (tol_high - depth) / (tol_high - opt_high)
    return 0.0


def _tide_factor(tide_level: float) -> float:
    if tide_level < TIDE_OPTIMAL_RANGE[0]:
        return 0.6 + 0.4 * (tide_level / TIDE_OPTIMAL_RANGE[0])
    if tide_level > TIDE_OPTIMAL_RANGE[1]:
        return max(0.3, 1.0 - 0.5 * (tide_level - TIDE_OPTIMAL_RANGE[1]))
    return 1.0


def _weather_factor(wind_speed: float, visibility: float) -> float:
    wind_factor = max(0.4, 1.0 - 0.03 * wind_speed)
    vis_factor = min(1.0, visibility / 10.0)
    return wind_factor * vis_factor


def _base_coverage(lon: float, lat: float) -> float:
    """
    基础覆盖度：模拟海草床分布。
    用经纬度做一些伪随机波动，保证可复现。
    """
    noise = math.sin(lon * 3.7) * math.cos(lat * 5.2) * 0.2
    base = 0.45 + noise
    return max(0.05, min(0.9, base))


def estimate_coverage(record: ProcessingRecord) -> ProcessingRecord:
    """
    单条记录覆盖度估算。
    读取 record 上的 weather_data、tide_data、track_data，
    写入 coverage 和处理意见，保证溯源。
    """
    if "weather_stormy" in record.flags:
        coverage = None
        confidence = "low"
        opinion = "因气象条件恶劣，跳过覆盖度估算"
        decision = "skip_storm"
    elif "track_speed_anomaly" in record.flags or "track_depth_anomaly" in record.flags:
        coverage = None
        confidence = "invalid"
        opinion = "因轨迹异常，不参与覆盖度估算"
        decision = "skip_track_outlier"
    elif "duplicate" in record.flags:
        coverage = None
        confidence = "duplicate"
        opinion = "重复上报记录，不参与覆盖度估算"
        decision = "skip_duplicate"
    else:
        base = _base_coverage(record.longitude, record.latitude)

        depth_f = _depth_factor(record.depth)

        tide_f = 1.0
        if record.tide_data and "tide_level_m" in record.tide_data:
            tide_level = record.tide_data["tide_level_m"]
            tide_f = _tide_factor(tide_level)

        weather_f = 1.0
        if record.weather_data:
            wind = record.weather_data.get("wind_speed_mps", 8.0)
            vis = record.weather_data.get("visibility_km", 10.0)
            weather_f = _weather_factor(wind, vis)

        coverage = base * depth_f * tide_f * weather_f
        coverage = round(coverage, 4)

        if depth_f < 0.5:
            confidence = "low"
        elif weather_f < 0.7:
            confidence = "medium"
        else:
            confidence = "high"

        opinion = f"覆盖度估算完成，置信度{confidence}"
        decision = "estimated"

    record.coverage = coverage
    if coverage is not None:
        record.status = RECORD_STATUS_ESTIMATED

    evidence = {
        "coverage": coverage,
        "confidence": confidence,
        "depth_m": record.depth,
    }
    if record.tide_data:
        evidence["tide_level_m"] = record.tide_data.get("tide_level_m")
    if record.weather_data:
        evidence["wind_speed_mps"] = record.weather_data.get("wind_speed_mps")
        evidence["visibility_km"] = record.weather_data.get("visibility_km")
        evidence["weather_condition"] = record.weather_data.get("weather_condition")

    record.add_opinion(
        stage=STAGE_COVERAGE_ESTIMATION,
        operator="coverage_estimator",
        opinion=opinion,
        decision=decision,
        evidence=evidence
    )

    return record


def batch_estimate(records: List[ProcessingRecord]) -> List[ProcessingRecord]:
    for r in records:
        estimate_coverage(r)
    return records


def aggregate_statistics(records: List[ProcessingRecord]) -> Dict:
    """
    汇总统计：用于图表和文字说明。
    图、表、文字都从这里取数，保证三者对得上。
    """
    estimated = [r for r in records if r.coverage is not None]
    flagged = [r for r in records if r.flags]
    duplicates = [r for r in records if r.duplicate_of is not None]

    if not estimated:
        avg_cov = 0.0
        med_cov = 0.0
        max_cov = 0.0
        min_cov = 0.0
    else:
        coverages = [r.coverage for r in estimated]
        avg_cov = sum(coverages) / len(coverages)
        coverages_sorted = sorted(coverages)
        n = len(coverages_sorted)
        med_cov = coverages_sorted[n // 2] if n % 2 == 1 else (
            coverages_sorted[n // 2 - 1] + coverages_sorted[n // 2]
        ) / 2
        max_cov = max(coverages)
        min_cov = min(coverages)

    weather_flags_count = sum(
        1 for r in records if any(f.startswith("weather_") for f in r.flags)
    )
    tide_flags_count = sum(
        1 for r in records if any(f.startswith("tide_") for f in r.flags)
    )
    track_flags_count = sum(
        1 for r in records if any(f.startswith("track_") for f in r.flags)
    )

    return {
        "total_records": len(records),
        "estimated_count": len(estimated),
        "flagged_count": len(flagged),
        "duplicate_count": len(duplicates),
        "average_coverage": round(avg_cov, 4),
        "median_coverage": round(med_cov, 4),
        "max_coverage": round(max_cov, 4),
        "min_coverage": round(min_cov, 4),
        "weather_flags_count": weather_flags_count,
        "tide_flags_count": tide_flags_count,
        "track_flags_count": track_flags_count,
        "flag_breakdown": {
            "weather": weather_flags_count,
            "tide": tide_flags_count,
            "track": track_flags_count,
            "duplicate": len(duplicates),
        }
    }
