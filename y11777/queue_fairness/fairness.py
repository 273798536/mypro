import math
from typing import Optional

from .models import (
    AnomalyRecord,
    AnomalyType,
    CallRecord,
    CallStatus,
    CustomerTier,
    FairnessMetrics,
)


def jain_fairness_index(wait_times: list[float]) -> float:
    if not wait_times:
        return 1.0
    n = len(wait_times)
    if n == 1:
        return 1.0
    total = sum(wait_times)
    if total == 0:
        return 1.0
    total_sq = sum(x * x for x in wait_times)
    if total_sq == 0:
        return 1.0
    return (total * total) / (n * total_sq)


def gini_coefficient(wait_times: list[float]) -> float:
    if not wait_times:
        return 0.0
    sorted_waits = sorted(wait_times)
    n = len(sorted_waits)
    if n == 1:
        return 0.0
    total = sum(sorted_waits)
    if total == 0:
        return 0.0
    weighted_sum = 0.0
    for i, w in enumerate(sorted_waits):
        weighted_sum += (i + 1) * w
    gini = (2.0 * weighted_sum) / (n * total) - (n + 1.0) / n
    return max(0.0, min(1.0, gini))


def percentile(sorted_values: list[float], p: float) -> float:
    if not sorted_values:
        return 0.0
    idx = (len(sorted_values) - 1) * p / 100.0
    lower = int(math.floor(idx))
    upper = int(math.ceil(idx))
    if lower == upper:
        return sorted_values[lower]
    frac = idx - lower
    return sorted_values[lower] * (1 - frac) + sorted_values[upper] * frac


def compute_metrics(calls: list[CallRecord], long_tail_threshold: float = 600.0,
                    source: str = "calculation") -> FairnessMetrics:
    completed = [c for c in calls if c.status in (CallStatus.COMPLETED, CallStatus.SERVING)]
    abandoned = [c for c in calls if c.status == CallStatus.ABANDONED]

    all_waits = [c.wait_time for c in completed if c.wait_time is not None]
    if not all_waits:
        return FairnessMetrics(
            jain_index=1.0,
            gini_coefficient=0.0,
            total_calls=len(calls),
            source=source,
        )

    ji = jain_fairness_index(all_waits)
    gc = gini_coefficient(all_waits)

    vip_waits = [c.wait_time for c in completed
                 if c.wait_time is not None and c.customer.tier == CustomerTier.VIP]
    normal_waits = [c.wait_time for c in completed
                    if c.wait_time is not None and c.customer.tier == CustomerTier.NORMAL]
    low_waits = [c.wait_time for c in completed
                 if c.wait_time is not None and c.customer.tier == CustomerTier.LOW]

    vip_avg = sum(vip_waits) / len(vip_waits) if vip_waits else None
    normal_avg = sum(normal_waits) / len(normal_waits) if normal_waits else None
    low_avg = sum(low_waits) / len(low_waits) if low_waits else None

    vip_squeeze_ratio = None
    if vip_avg is not None and normal_avg is not None and normal_avg > 0:
        vip_squeeze_ratio = vip_avg / normal_avg

    sorted_waits = sorted(all_waits)
    p90 = percentile(sorted_waits, 90)
    p99 = percentile(sorted_waits, 99)

    long_tail = [c for c in completed if c.wait_time is not None and c.wait_time > long_tail_threshold]
    mismatches = [c for c in completed if c.skill_matched is False]

    return FairnessMetrics(
        jain_index=round(ji, 4),
        gini_coefficient=round(gc, 4),
        vip_avg_wait=round(vip_avg, 2) if vip_avg is not None else None,
        normal_avg_wait=round(normal_avg, 2) if normal_avg is not None else None,
        low_avg_wait=round(low_avg, 2) if low_avg is not None else None,
        vip_squeeze_ratio=round(vip_squeeze_ratio, 4) if vip_squeeze_ratio is not None else None,
        p90_wait=round(p90, 2),
        p99_wait=round(p99, 2),
        long_tail_count=len(long_tail),
        skill_mismatch_count=len(mismatches),
        abandon_count=len(abandoned),
        total_calls=len(calls),
        source=source,
    )


def detect_anomalies(calls: list[CallRecord], metrics: FairnessMetrics,
                     long_tail_threshold: float = 600.0,
                     vip_squeeze_threshold: float = 0.7,
                     skill_mismatch_ratio_threshold: float = 0.15,
                     abandon_ratio_threshold: float = 0.1) -> list[AnomalyRecord]:
    anomalies: list[AnomalyRecord] = []
    completed = [c for c in calls if c.status in (CallStatus.COMPLETED, CallStatus.SERVING)]

    if metrics.vip_squeeze_ratio is not None and metrics.vip_squeeze_ratio < vip_squeeze_threshold:
        vip_calls = [c for c in completed if c.customer.tier == CustomerTier.VIP
                     and c.wait_time is not None and c.wait_time > 300]
        normal_fast = [c for c in completed if c.customer.tier == CustomerTier.NORMAL
                       and c.wait_time is not None and c.wait_time < 60]
        ratio = metrics.vip_squeeze_ratio
        anomalies.append(AnomalyRecord(
            anomaly_type=AnomalyType.VIP_SQUEEZE,
            severity="high" if ratio < 0.5 else "medium",
            description=f"VIP挤占：VIP平均等待/普通用户平均等待={ratio:.2f}，低于阈值{vip_squeeze_threshold}",
            affected_calls=[c.call_id for c in vip_calls[:20]],
            explanation=(
                f"VIP用户平均等待{metrics.vip_avg_wait:.1f}秒，普通用户平均等待{metrics.normal_avg_wait:.1f}秒，"
                f"比值为{ratio:.2f}。这意味着VIP用户等待时间反而远低于普通用户，"
                f"存在VIP优先策略过度倾斜的问题。"
                f"受影响VIP呼叫{len(vip_calls)}个，"
                f"同期快速服务的普通用户{len(normal_fast)}个。"
            ),
            evidence={
                "vip_avg_wait": metrics.vip_avg_wait,
                "normal_avg_wait": metrics.normal_avg_wait,
                "ratio": ratio,
                "threshold": vip_squeeze_threshold,
                "vip_long_wait_count": len(vip_calls),
            },
            source="detection",
        ))

    completed_with_skill = [c for c in completed if c.skill_matched is not None]
    if completed_with_skill:
        mismatch_ratio = metrics.skill_mismatch_count / len(completed_with_skill)
        if mismatch_ratio > skill_mismatch_ratio_threshold:
            mismatch_calls = [c for c in completed if c.skill_matched is False]
            anomalies.append(AnomalyRecord(
                anomaly_type=AnomalyType.SKILL_MISMATCH,
                severity="high" if mismatch_ratio > 0.3 else "medium",
                description=f"技能错配：{metrics.skill_mismatch_count}个呼叫({mismatch_ratio:.1%})被分配到不匹配技能的坐席",
                affected_calls=[c.call_id for c in mismatch_calls[:20]],
                explanation=(
                    f"共{len(completed_with_skill)}个需要技能匹配的呼叫中，"
                    f"{metrics.skill_mismatch_count}个({mismatch_ratio:.1%})被分配到了不匹配的坐席。"
                    f"错配会导致服务时间延长约50%，影响整体效率。"
                    f"建议增加坐席技能覆盖或优化技能匹配策略。"
                ),
                evidence={
                    "mismatch_count": metrics.skill_mismatch_count,
                    "total_skill_calls": len(completed_with_skill),
                    "mismatch_ratio": round(mismatch_ratio, 4),
                    "threshold": skill_mismatch_ratio_threshold,
                },
                source="detection",
            ))

    long_tail = [c for c in completed if c.wait_time is not None and c.wait_time > long_tail_threshold]
    if long_tail:
        lt_ratio = len(long_tail) / len(completed) if completed else 0
        severity = "high" if lt_ratio > 0.1 else ("medium" if lt_ratio > 0.05 else "low")
        anomalies.append(AnomalyRecord(
            anomaly_type=AnomalyType.LONG_TAIL_WAIT,
            severity=severity,
            description=f"长尾等待：{len(long_tail)}个呼叫等待超过{long_tail_threshold:.0f}秒({lt_ratio:.1%})",
            affected_calls=[c.call_id for c in long_tail[:20]],
            explanation=(
                f"P90等待={metrics.p90_wait:.1f}秒，P99等待={metrics.p99_wait:.1f}秒。"
                f"有{len(long_tail)}个呼叫({lt_ratio:.1%})等待超过{long_tail_threshold:.0f}秒。"
                f"长尾等待通常由高峰时段排队堆积或坐席不足导致，"
                f"建议关注高峰排班和溢出策略。"
            ),
            evidence={
                "long_tail_count": len(long_tail),
                "long_tail_ratio": round(lt_ratio, 4),
                "p90": metrics.p90_wait,
                "p99": metrics.p99_wait,
                "threshold": long_tail_threshold,
            },
            source="detection",
        ))

    if metrics.abandon_count > 0:
        abandon_ratio = metrics.abandon_count / metrics.total_calls if metrics.total_calls else 0
        if abandon_ratio > abandon_ratio_threshold:
            abandoned = [c for c in calls if c.status == CallStatus.ABANDONED]
            anomalies.append(AnomalyRecord(
                anomaly_type=AnomalyType.ABANDON_SPIKE,
                severity="high" if abandon_ratio > 0.2 else "medium",
                description=f"放弃率异常：{metrics.abandon_count}个呼叫({abandon_ratio:.1%})被放弃",
                affected_calls=[c.call_id for c in abandoned[:20]],
                explanation=(
                    f"总呼叫{metrics.total_calls}个中{metrics.abandon_count}个被放弃({abandon_ratio:.1%})，"
                    f"超过阈值{abandon_ratio_threshold:.0%}。"
                    f"放弃通常意味着等待时间超过用户耐心，"
                    f"建议缩短平均等待或提供排队位置提示。"
                ),
                evidence={
                    "abandon_count": metrics.abandon_count,
                    "total_calls": metrics.total_calls,
                    "abandon_ratio": round(abandon_ratio, 4),
                    "threshold": abandon_ratio_threshold,
                },
                source="detection",
            ))

    starvation_by_tier = {}
    for tier in CustomerTier:
        tier_calls = [c for c in completed if c.customer.tier == tier and c.wait_time is not None]
        if tier_calls:
            tier_avg = sum(c.wait_time for c in tier_calls) / len(tier_calls)
            all_avg = sum(c.wait_time for c in completed if c.wait_time is not None) / max(1, len([c for c in completed if c.wait_time is not None]))
            if tier_avg > all_avg * 2 and len(tier_calls) >= 3:
                starvation_by_tier[tier.value] = {
                    "avg_wait": tier_avg,
                    "overall_avg": all_avg,
                    "count": len(tier_calls),
                }

    if starvation_by_tier:
        for tier_val, info in starvation_by_tier.items():
            starved_calls = [c for c in completed if c.customer.tier.value == tier_val
                             and c.wait_time is not None and c.wait_time > info["overall_avg"] * 1.5]
            anomalies.append(AnomalyRecord(
                anomaly_type=AnomalyType.STARVATION,
                severity="medium",
                description=f"[{tier_val}]等级饥饿：平均等待{info['avg_wait']:.1f}秒，是全局均值的{info['avg_wait']/info['overall_avg']:.1f}倍",
                affected_calls=[c.call_id for c in starved_calls[:20]],
                explanation=(
                    f"{tier_val}等级用户平均等待{info['avg_wait']:.1f}秒，"
                    f"远超全局均值{info['overall_avg']:.1f}秒。"
                    f"可能是该等级在当前策略下被持续低优先级对待。"
                    f"建议调整策略权重或增加专属坐席。"
                ),
                evidence=info,
                source="detection",
            ))

    return anomalies
