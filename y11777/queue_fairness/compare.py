from .models import (
    AnomalyRecord,
    AnomalyType,
    CallRecord,
    DispatchStrategy,
    FairnessMetrics,
    StrategyComparison,
)
from .simulator import Simulator
from .fairness import compute_metrics, detect_anomalies


def compare_strategies(
    strategies: list[DispatchStrategy],
    agents: list,
    customers: list,
    arrival_times: list[float],
    service_time_range: tuple[float, float] = (60.0, 300.0),
    long_tail_threshold: float = 600.0,
) -> list[StrategyComparison]:
    results: list[StrategyComparison] = []

    for strategy in strategies:
        sim = Simulator(strategy, [a for a in agents])
        calls = sim.run(customers, arrival_times, service_time_range)

        metrics = compute_metrics(calls, long_tail_threshold=long_tail_threshold,
                                  source=f"strategy_{strategy.name.value}")
        anomalies = detect_anomalies(calls, metrics, long_tail_threshold=long_tail_threshold)

        results.append(StrategyComparison(
            strategy=strategy,
            metrics=metrics,
            anomalies=anomalies,
            calls=calls,
        ))

    return results


def rank_strategies(comparisons: list[StrategyComparison]) -> list[tuple[str, float, str]]:
    ranked = []
    for comp in comparisons:
        m = comp.metrics
        score = 0.0
        reasons = []

        score += m.jain_index * 40
        reasons.append(f"Jain指数({m.jain_index:.3f})×40={m.jain_index * 40:.1f}")

        score += (1 - m.gini_coefficient) * 30
        reasons.append(f"低基尼({1 - m.gini_coefficient:.3f})×30={(1 - m.gini_coefficient) * 30:.1f}")

        if m.vip_squeeze_ratio is not None:
            squeeze_penalty = abs(m.vip_squeeze_ratio - 1.0) * 15
            score -= squeeze_penalty
            reasons.append(f"VIP挤占偏差×15=-{squeeze_penalty:.1f}")

        long_tail_ratio = m.long_tail_count / max(1, m.total_calls)
        score -= long_tail_ratio * 20
        reasons.append(f"长尾比({long_tail_ratio:.1%})×20=-{long_tail_ratio * 20:.1f}")

        abandon_ratio = m.abandon_count / max(1, m.total_calls)
        score -= abandon_ratio * 15
        reasons.append(f"放弃率({abandon_ratio:.1%})×15=-{abandon_ratio * 15:.1f}")

        mismatch_ratio = m.skill_mismatch_count / max(1, m.total_calls)
        score -= mismatch_ratio * 10
        reasons.append(f"错配率({mismatch_ratio:.1%})×10=-{mismatch_ratio * 10:.1f}")

        high_anomaly_count = sum(1 for a in comp.anomalies if a.severity == "high")
        score -= high_anomaly_count * 5
        reasons.append(f"高严重度异常×5=-{high_anomaly_count * 5}")

        ranked.append((comp.strategy.name.value, round(score, 2), "; ".join(reasons)))

    ranked.sort(key=lambda x: -x[1])
    return ranked
