import random
import math
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass

from .models import (
    ParameterVersion,
    ValidationResult,
    AnomalyPoint,
    ValidationStatus,
)


@dataclass
class ParamStats:
    mean: float
    std: float
    median: float
    p5: float
    p95: float
    min_val: float
    max_val: float


class MonteCarloValidator:
    def __init__(
        self,
        simulation_count: int = 10000,
        confidence_level: float = 0.95,
        seed: Optional[int] = 42,
        z_threshold: float = 3.0,
    ):
        self.simulation_count = simulation_count
        self.confidence_level = confidence_level
        self.z_threshold = z_threshold
        if seed is not None:
            random.seed(seed)

    def validate(
        self,
        version: ParameterVersion,
        baseline_stats: Optional[Dict[str, ParamStats]] = None,
    ) -> ValidationResult:
        records = version.records
        total_records = len(records)

        if total_records == 0:
            return ValidationResult(
                version=version.version,
                status=ValidationStatus.FAILED,
                total_records=0,
                anomaly_count=0,
                anomalies=[],
                stats={},
                simulation_count=0,
                confidence_level=self.confidence_level,
            )

        param_names = self._collect_param_names(records)

        if baseline_stats is None:
            baseline_stats = self._compute_baseline_stats(records, param_names)

        anomalies = []
        for record_id, record in records.items():
            for param_name in param_names:
                if param_name not in record.params:
                    continue
                actual_value = record.params[param_name]
                stats = baseline_stats.get(param_name)
                if stats is None or stats.std == 0:
                    continue

                z_score = (actual_value - stats.mean) / stats.std
                deviation = actual_value - stats.mean

                boundary_upper = stats.mean + self.z_threshold * stats.std
                boundary_lower = stats.mean - self.z_threshold * stats.std

                is_outside = abs(z_score) > self.z_threshold

                if is_outside:
                    is_extrap = actual_value > stats.p95 or actual_value < stats.p5
                    direction = None
                    if actual_value > stats.p95:
                        direction = "upper"
                    elif actual_value < stats.p5:
                        direction = "lower"

                    explanation = self._generate_explanation(
                        param_name, actual_value, stats, z_score, is_extrap
                    )

                    anomalies.append(
                        AnomalyPoint(
                            record_id=record_id,
                            param_name=param_name,
                            expected_value=stats.mean,
                            actual_value=actual_value,
                            deviation=deviation,
                            z_score=z_score,
                            boundary_upper=boundary_upper,
                            boundary_lower=boundary_lower,
                            is_extrapolation=is_extrap,
                            extrapolation_direction=direction,
                            explanation=explanation,
                        )
                    )

        mc_stats = self._run_monte_carlo(records, param_names, baseline_stats)

        status = ValidationStatus.PASSED if len(anomalies) == 0 else ValidationStatus.FAILED

        return ValidationResult(
            version=version.version,
            status=status,
            total_records=total_records,
            anomaly_count=len(anomalies),
            anomalies=anomalies,
            stats=mc_stats,
            simulation_count=self.simulation_count,
            confidence_level=self.confidence_level,
        )

    def _collect_param_names(self, records: Dict) -> List[str]:
        param_set = set()
        for record in records.values():
            param_set.update(record.params.keys())
        return sorted(param_set)

    def _compute_baseline_stats(
        self, records: Dict, param_names: List[str]
    ) -> Dict[str, ParamStats]:
        stats = {}
        for param_name in param_names:
            values = [
                r.params[param_name]
                for r in records.values()
                if param_name in r.params
            ]
            if len(values) < 2:
                continue
            values_sorted = sorted(values)
            n = len(values_sorted)
            mean_val = sum(values_sorted) / n
            variance = sum((v - mean_val) ** 2 for v in values_sorted) / (n - 1)
            std_val = math.sqrt(variance)

            p5_idx = max(0, int(n * 0.05))
            p95_idx = min(n - 1, int(n * 0.95))
            median_idx = n // 2

            stats[param_name] = ParamStats(
                mean=mean_val,
                std=std_val,
                median=values_sorted[median_idx],
                p5=values_sorted[p5_idx],
                p95=values_sorted[p95_idx],
                min_val=values_sorted[0],
                max_val=values_sorted[-1],
            )
        return stats

    def _run_monte_carlo(
        self,
        records: Dict,
        param_names: List[str],
        baseline_stats: Dict[str, ParamStats],
    ) -> Dict:
        mc_results = {}

        for param_name in param_names:
            stats = baseline_stats.get(param_name)
            if stats is None or stats.std == 0:
                continue

            simulated = []
            for _ in range(self.simulation_count):
                sim = random.gauss(stats.mean, stats.std)
                simulated.append(sim)

            simulated_sorted = sorted(simulated)
            n = len(simulated_sorted)
            lower_idx = int(n * (1 - self.confidence_level) / 2)
            upper_idx = int(n * (1 - (1 - self.confidence_level) / 2)) - 1

            mc_results[param_name] = {
                "mean": stats.mean,
                "std": stats.std,
                "ci_lower": simulated_sorted[lower_idx],
                "ci_upper": simulated_sorted[upper_idx],
                "p5": simulated_sorted[int(n * 0.05)],
                "p95": simulated_sorted[int(n * 0.95)],
                "min": simulated_sorted[0],
                "max": simulated_sorted[-1],
                "boundary_3sigma_upper": stats.mean + 3 * stats.std,
                "boundary_3sigma_lower": stats.mean - 3 * stats.std,
            }

        return mc_results

    def _generate_explanation(
        self,
        param_name: str,
        actual_value: float,
        stats: ParamStats,
        z_score: float,
        is_extrap: bool,
    ) -> str:
        direction = "偏高" if actual_value > stats.mean else "偏低"
        sigma_text = f"{abs(z_score):.2f}σ"

        if is_extrap:
            extrap_dir = "上沿" if actual_value > stats.p95 else "下沿"
            return (
                f"{param_name}={actual_value:.4f}，较均值{stats.mean:.4f}{direction}"
                f"约{abs(actual_value - stats.mean):.4f}（{sigma_text}），"
                f"超出样本{extrap_dir}外推区间，需人工确认是否合理。"
            )
        else:
            return (
                f"{param_name}={actual_value:.4f}，较均值{stats.mean:.4f}{direction}"
                f"约{abs(actual_value - stats.mean):.4f}（{sigma_text}），"
                f"偏离{self.z_threshold}σ置信边界。"
            )
