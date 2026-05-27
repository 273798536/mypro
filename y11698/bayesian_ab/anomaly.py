from __future__ import annotations

from datetime import datetime, timezone
from typing import List

import numpy as np
from scipy import stats

from .engine import BetaPosterior
from .models import AnomalyLevel, AnomalyRecord, VariantData

SAMPLE_IMBALANCE_RATIO = 1.8
LOW_SAMPLE_THRESHOLD = 100
LOW_CONVERSIONS_THRESHOLD = 5
MIN_PLANNED_DAYS = 7


def detect_sample_imbalance(variants: List[VariantData]) -> List[AnomalyRecord]:
    if len(variants) < 2:
        return []

    sizes = [v.exposures for v in variants]
    if all(s == 0 for s in sizes):
        return []

    records: List[AnomalyRecord] = []
    max_size = max(sizes)
    min_size = min(s for s in sizes if s > 0) if any(s > 0 for s in sizes) else 0

    if max_size > 0 and min_size > 0 and max_size / min_size > SAMPLE_IMBALANCE_RATIO:
        ratio = max_size / min_size
        max_var = variants[sizes.index(max_size)].name
        min_var = variants[sizes.index(min_size)].name
        records.append(
            AnomalyRecord(
                code="SAMPLE_IMBALANCE",
                level=AnomalyLevel.WARNING,
                message=(
                    f"样本量不均: {max_var} ({max_size:,}) vs {min_var} ({min_size:,}), "
                    f"比值 {ratio:.2f}x 超过阈值 {SAMPLE_IMBALANCE_RATIO}x"
                ),
                detail={
                    "largest_variant": max_var,
                    "largest_size": max_size,
                    "smallest_variant": min_var,
                    "smallest_size": min_size,
                    "ratio": round(ratio, 4),
                    "threshold": SAMPLE_IMBALANCE_RATIO,
                    "all_sizes": {v.name: v.exposures for v in variants},
                },
            )
        )

    total = sum(sizes)
    if total > 0:
        chi2, p_value = stats.chisquare(sizes)
        if p_value < 0.05:
            records.append(
                AnomalyRecord(
                    code="SAMPLE_IMBALANCE_CHISQ",
                    level=AnomalyLevel.INFO,
                    message=(
                        f"卡方检验发现样本分布显著不均 (p={p_value:.4f}), "
                        f"但最大/最小比值仅 {max_size / max(min_size, 1):.2f}x, 在可接受范围内"
                    ),
                    detail={
                        "chi2": round(float(chi2), 4),
                        "p_value": round(float(p_value), 4),
                        "sizes": {v.name: v.exposures for v in variants},
                    },
                )
            )

    return records


def detect_early_stopping(
    variants: List[VariantData],
    stop_date: datetime | None,
    planned_stop_date: datetime | None,
) -> List[AnomalyRecord]:
    records: List[AnomalyRecord] = []

    if stop_date and planned_stop_date and stop_date < planned_stop_date:
        delta = planned_stop_date - stop_date
        records.append(
            AnomalyRecord(
                code="EARLY_STOPPING",
                level=AnomalyLevel.CRITICAL,
                message=(
                    f"实验提前停止: 原定 {planned_stop_date.strftime('%Y-%m-%d')}, "
                    f"实际 {stop_date.strftime('%Y-%m-%d')}, 提前 {delta.days} 天"
                ),
                detail={
                    "planned_stop_date": planned_stop_date.isoformat(),
                    "actual_stop_date": stop_date.isoformat(),
                    "days_early": delta.days,
                },
            )
        )

    if stop_date:
        now = datetime.now(timezone.utc)
        if stop_date.tzinfo is None:
            stop_date = stop_date.replace(tzinfo=timezone.utc)
        if (now - stop_date).days < MIN_PLANNED_DAYS:
            days_since = (now - stop_date).days
            records.append(
                AnomalyRecord(
                    code="RECENT_STOP",
                    level=AnomalyLevel.INFO,
                    message=f"实验停止仅 {days_since} 天, 数据可能尚未充分沉淀",
                    detail={"days_since_stop": days_since, "threshold_days": MIN_PLANNED_DAYS},
                )
            )

    return records


def detect_low_sample_size(variants: List[VariantData]) -> List[AnomalyRecord]:
    records: List[AnomalyRecord] = []

    for v in variants:
        if v.exposures > 0 and v.exposures < LOW_SAMPLE_THRESHOLD:
            records.append(
                AnomalyRecord(
                    code="LOW_SAMPLE_SIZE",
                    level=AnomalyLevel.WARNING,
                    message=f"变体 {v.name} 样本量 {v.exposures} 低于阈值 {LOW_SAMPLE_THRESHOLD}, 后验估计可能不稳定",
                    detail={
                        "variant": v.name,
                        "exposures": v.exposures,
                        "threshold": LOW_SAMPLE_THRESHOLD,
                        "conversions": v.conversions,
                        "observed_rate": v.conversions / v.exposures,
                    },
                )
            )

        if v.conversions > 0 and v.conversions < LOW_CONVERSIONS_THRESHOLD:
            records.append(
                AnomalyRecord(
                    code="LOW_CONVERSION_COUNT",
                    level=AnomalyLevel.INFO,
                    message=f"变体 {v.name} 仅 {v.conversions} 次转化, 估计精度受限",
                    detail={
                        "variant": v.name,
                        "conversions": v.conversions,
                        "threshold": LOW_CONVERSIONS_THRESHOLD,
                        "exposures": v.exposures,
                    },
                )
            )

    total_exposures = sum(v.exposures for v in variants)
    if total_exposures > 0 and total_exposures < LOW_SAMPLE_THRESHOLD * len(variants):
        records.append(
            AnomalyRecord(
                code="LOW_TOTAL_SAMPLE",
                level=AnomalyLevel.WARNING,
                message=f"总样本量 {total_exposures} 偏低 ({len(variants)} 个变体), 建议累计 {LOW_SAMPLE_THRESHOLD * len(variants)} 以上",
                detail={
                    "total_exposures": total_exposures,
                    "variant_count": len(variants),
                    "recommended_minimum": LOW_SAMPLE_THRESHOLD * len(variants),
                },
            )
        )

    return records


def detect_low_base_rate(variants: List[VariantData]) -> List[AnomalyRecord]:
    records: List[AnomalyRecord] = []

    for v in variants:
        if v.exposures > 0:
            rate = v.conversions / v.exposures
            if rate < 0.001:
                records.append(
                    AnomalyRecord(
                        code="LOW_BASE_RATE",
                        level=AnomalyLevel.WARNING,
                        message=f"变体 {v.name} 转化率 {rate:.4%} 极低, 先验对后验影响显著, 建议增加样本",
                        detail={
                            "variant": v.name,
                            "conversion_rate": rate,
                            "exposures": v.exposures,
                            "conversions": v.conversions,
                            "effective_prior_weight": v.prior_alpha + v.prior_beta,
                        },
                    )
                )

    return records


def detect_prior_sensitivity(variants: List[VariantData], posts: List[BetaPosterior]) -> List[AnomalyRecord]:
    records: List[AnomalyRecord] = []

    for v, post in zip(variants, posts):
        if v.exposures > 0:
            mle = v.conversions / v.exposures
            prior_mean = v.prior_alpha / (v.prior_alpha + v.prior_beta)
            posterior_mean = post.mean
            shrinkage = 1 - abs(posterior_mean - mle) / max(abs(mle - prior_mean), 1e-12)
            if shrinkage > 0.5 and (v.prior_alpha + v.prior_beta) > 2:
                records.append(
                    AnomalyRecord(
                        code="PRIOR_DOMINANCE",
                        level=AnomalyLevel.INFO,
                        message=(
                            f"变体 {v.name} 先验影响较大: 先验均值 {prior_mean:.4f}, "
                            f"MLE {mle:.4f}, 后验均值 {posterior_mean:.4f}"
                        ),
                        detail={
                            "variant": v.name,
                            "prior_mean": round(prior_mean, 6),
                            "mle": round(mle, 6),
                            "posterior_mean": round(posterior_mean, 6),
                            "prior_weight": round(v.prior_alpha + v.prior_beta, 4),
                            "shrinkage_factor": round(float(shrinkage), 4),
                        },
                    )
                )

    return records


def detect_all(
    variants: List[VariantData],
    posts: List[BetaPosterior],
    stop_date: datetime | None = None,
    planned_stop_date: datetime | None = None,
) -> List[AnomalyRecord]:
    all_records: List[AnomalyRecord] = []
    all_records.extend(detect_sample_imbalance(variants))
    all_records.extend(detect_early_stopping(variants, stop_date, planned_stop_date))
    all_records.extend(detect_low_sample_size(variants))
    all_records.extend(detect_low_base_rate(variants))
    all_records.extend(detect_prior_sensitivity(variants, posts))
    return all_records