from __future__ import annotations

import math
import uuid
from datetime import datetime

from .models import (
    GroupComparison,
    IntermediateStep,
    MetricData,
    PowerResult,
    SampleInfo,
)


def _norm_ppf(p: float) -> float:
    if p <= 0:
        return -8.0
    if p >= 1:
        return 8.0
    a = [
        -3.969683028665376e1,
        2.209460984245205e2,
        -2.759285104469687e2,
        1.383577518672690e2,
        -3.066479806614716e1,
        2.506628277459239e0,
    ]
    b = [
        -5.447609879822406e1,
        1.615858368580409e2,
        -1.556989798598866e2,
        6.680131188771972e1,
        -1.328068155288572e1,
    ]
    c = [
        -7.784894002430293e-3,
        -3.223964580411365e-1,
        -2.400758277161838e0,
        -2.549732539343734e0,
        4.374664141464968e0,
        2.938163982698783e0,
    ]
    d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0, 3.754408661907416e0]
    p_low = 0.02425
    p_high = 1 - p_low
    if p < p_low:
        q = math.sqrt(-2 * math.log(p))
        return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / (
            (((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1
        )
    elif p <= p_high:
        q = p - 0.5
        r = q * q
        return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (
            (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
        )
    else:
        q = math.sqrt(-2 * math.log(1 - p))
        return -(
            (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5])
            / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
        )


class PowerAnalyzer:
    def __init__(
        self,
        alpha: float = 0.05,
        desired_power: float = 0.8,
        mde: float | None = None,
        mde_relative: float | None = None,
    ):
        if not 0 < alpha < 1:
            raise ValueError(f"alpha must be in (0,1), got {alpha}")
        if not 0 < desired_power < 1:
            raise ValueError(f"desired_power must be in (0,1), got {desired_power}")
        self.alpha = alpha
        self.desired_power = desired_power
        self.mde = mde
        self.mde_relative = mde_relative

    def _compute_effect_size(
        self, metric: MetricData
    ) -> tuple[float, list[IntermediateStep]]:
        steps = []
        pooled_std = math.sqrt(
            (
                (metric.control_n - 1) * metric.control_std**2
                + (metric.treatment_n - 1) * metric.treatment_std**2
            )
            / max(1, metric.control_n + metric.treatment_n - 2)
        )
        steps.append(
            IntermediateStep(
                step_name="pooled_std",
                formula="sqrt(((n_c-1)*s_c^2 + (n_t-1)*s_t^2) / (n_c+n_t-2))",
                inputs={
                    "n_c": metric.control_n,
                    "s_c": metric.control_std,
                    "n_t": metric.treatment_n,
                    "s_t": metric.treatment_std,
                },
                output=pooled_std,
                unit=metric.unit,
                note="合并标准差，Cohen's d 的分母",
            )
        )
        mean_diff = metric.treatment_mean - metric.control_mean
        steps.append(
            IntermediateStep(
                step_name="mean_diff",
                formula="mean_t - mean_c",
                inputs={
                    "mean_t": metric.treatment_mean,
                    "mean_c": metric.control_mean,
                },
                output=mean_diff,
                unit=metric.unit,
                note="实验组与对照组均值之差",
            )
        )
        if pooled_std == 0:
            d = 0.0
        else:
            d = mean_diff / pooled_std
        steps.append(
            IntermediateStep(
                step_name="cohens_d",
                formula="d = (mean_t - mean_c) / pooled_std",
                inputs={
                    "mean_diff": mean_diff,
                    "pooled_std": pooled_std,
                },
                output=d,
                unit="Cohen's d (无量纲)",
                note="效应量 Cohen's d，衡量差异大小",
            )
        )
        return d, steps

    def _compute_required_n(
        self, metric: MetricData, effect_size: float
    ) -> tuple[int, list[IntermediateStep]]:
        steps = []
        z_alpha = _norm_ppf(1 - self.alpha / 2)
        z_beta = _norm_ppf(self.desired_power)
        steps.append(
            IntermediateStep(
                step_name="z_alpha",
                formula="Phi_inv(1 - alpha/2)",
                inputs={"alpha": self.alpha, "1-alpha/2": 1 - self.alpha / 2},
                output=z_alpha,
                unit="z值",
                note=f"显著性水平 alpha={self.alpha} 对应的双侧 z 临界值",
            )
        )
        steps.append(
            IntermediateStep(
                step_name="z_beta",
                formula="Phi_inv(desired_power)",
                inputs={"desired_power": self.desired_power},
                output=z_beta,
                unit="z值",
                note=f"目标功效 {self.desired_power} 对应的 z 值",
            )
        )
        if effect_size == 0:
            n_per_group = 999999
        else:
            n_per_group = math.ceil(2 * ((z_alpha + z_beta) / effect_size) ** 2)
        steps.append(
            IntermediateStep(
                step_name="required_n_per_group",
                formula="ceil(2 * ((z_alpha + z_beta) / d)^2)",
                inputs={
                    "z_alpha": z_alpha,
                    "z_beta": z_beta,
                    "d": effect_size,
                },
                output=n_per_group,
                unit="观测数/组",
                note="每组所需最小样本量（双侧检验）",
            )
        )
        return n_per_group, steps

    def _compute_achieved_power(
        self, metric: MetricData, effect_size: float
    ) -> tuple[float, list[IntermediateStep]]:
        steps = []
        z_alpha = _norm_ppf(1 - self.alpha / 2)
        n_min = min(metric.control_n, metric.treatment_n)
        if effect_size == 0 or n_min == 0:
            power = 0.0
        else:
            ncp = effect_size * math.sqrt(n_min / 2)
            power = 1 - _norm_ppf(z_alpha - ncp)
            power = max(0.0, min(1.0, power))
        steps.append(
            IntermediateStep(
                step_name="achieved_power",
                formula="1 - Phi(z_alpha - d*sqrt(n_min/2))",
                inputs={
                    "z_alpha": z_alpha,
                    "d": effect_size,
                    "n_min": n_min,
                    "ncp (非中心参数)": effect_size * math.sqrt(max(1, n_min) / 2) if n_min > 0 else 0,
                },
                output=power,
                unit="概率 [0,1]",
                note=f"在当前样本量下实际达到的功效",
            )
        )
        return power, steps

    def _compute_confidence_interval(
        self, metric: MetricData
    ) -> tuple[float, float, list[IntermediateStep]]:
        steps = []
        z_crit = _norm_ppf(1 - self.alpha / 2)
        se = math.sqrt(
            metric.control_std**2 / max(1, metric.control_n)
            + metric.treatment_std**2 / max(1, metric.treatment_n)
        )
        steps.append(
            IntermediateStep(
                step_name="se_diff",
                formula="sqrt(s_c^2/n_c + s_t^2/n_t)",
                inputs={
                    "s_c": metric.control_std,
                    "n_c": metric.control_n,
                    "s_t": metric.treatment_std,
                    "n_t": metric.treatment_n,
                },
                output=se,
                unit=metric.unit,
                note="均值差的标准误",
            )
        )
        mean_diff = metric.treatment_mean - metric.control_mean
        ci_lower = mean_diff - z_crit * se
        ci_upper = mean_diff + z_crit * se
        steps.append(
            IntermediateStep(
                step_name="ci_95",
                formula="diff ± z_alpha/2 * SE",
                inputs={
                    "diff": mean_diff,
                    "z_alpha/2": z_crit,
                    "SE": se,
                },
                output=[ci_lower, ci_upper],
                unit=metric.unit,
                note=f"{(1-self.alpha)*100:.0f}% 置信区间",
            )
        )
        return ci_lower, ci_upper, steps

    def _compute_mde(self, metric: MetricData) -> tuple[float, list[IntermediateStep]]:
        steps = []
        if self.mde is not None:
            steps.append(
                IntermediateStep(
                    step_name="mde",
                    formula="用户指定（绝对值）",
                    inputs={"mde_absolute": self.mde},
                    output=self.mde,
                    unit=metric.unit,
                    note="用户直接指定的最小可检测效应（绝对值）",
                )
            )
            return self.mde, steps
        if self.mde_relative is not None:
            mde_val = abs(metric.control_mean) * self.mde_relative
            steps.append(
                IntermediateStep(
                    step_name="mde",
                    formula="|mean_c| * mde_relative",
                    inputs={
                        "mean_c": metric.control_mean,
                        "mde_relative": self.mde_relative,
                    },
                    output=mde_val,
                    unit=metric.unit,
                    note=f"最小可检测效应 = 对照均值×{self.mde_relative}（相对值）",
                )
            )
            return mde_val, steps
        pooled_std = math.sqrt(
            (
                (metric.control_n - 1) * metric.control_std**2
                + (metric.treatment_n - 1) * metric.treatment_std**2
            )
            / max(1, metric.control_n + metric.treatment_n - 2)
        )
        d_default = 0.2
        mde_val = d_default * pooled_std
        steps.append(
            IntermediateStep(
                step_name="mde",
                formula="d_default * pooled_std  (d_default=0.2 小效应)",
                inputs={
                    "d_default": d_default,
                    "pooled_std": pooled_std,
                },
                output=mde_val,
                unit=metric.unit,
                note="未指定MDE时，按Cohen's d=0.2(小效应) × 合并标准差估算",
            )
        )
        return mde_val, steps

    def analyze(self, metric: MetricData) -> PowerResult:
        all_steps = []

        effect_size, es_steps = self._compute_effect_size(metric)
        all_steps.extend(es_steps)

        ci_lower, ci_upper, ci_steps = self._compute_confidence_interval(metric)
        all_steps.extend(ci_steps)

        n_required, n_steps = self._compute_required_n(metric, effect_size)
        all_steps.extend(n_steps)

        achieved_power, ap_steps = self._compute_achieved_power(metric, effect_size)
        all_steps.extend(ap_steps)

        mde_val, mde_steps = self._compute_mde(metric)
        all_steps.extend(mde_steps)

        mean_diff = metric.treatment_mean - metric.control_mean
        se = math.sqrt(
            metric.control_std**2 / max(1, metric.control_n)
            + metric.treatment_std**2 / max(1, metric.treatment_n)
        )
        z_stat = mean_diff / se if se > 0 else 0.0
        is_significant = abs(z_stat) > _norm_ppf(1 - self.alpha / 2)

        all_steps.append(
            IntermediateStep(
                step_name="z_statistic",
                formula="z = diff / SE",
                inputs={"diff": mean_diff, "SE": se},
                output=z_stat,
                unit="z值",
                note="检验统计量",
            )
        )
        all_steps.append(
            IntermediateStep(
                step_name="significance",
                formula="|z| > z_alpha/2",
                inputs={
                    "z": z_stat,
                    "z_alpha/2": _norm_ppf(1 - self.alpha / 2),
                },
                output=is_significant,
                unit="布尔值",
                note=f"在 alpha={self.alpha} 下是否显著",
            )
        )

        return PowerResult(
            result_id=f"pr_{uuid.uuid4().hex[:8]}",
            metric_id=metric.metric_id,
            metric_name=metric.metric_name,
            power=achieved_power,
            confidence_interval_lower=ci_lower,
            confidence_interval_upper=ci_upper,
            effect_size=effect_size,
            effect_size_unit="Cohen's d",
            mde=mde_val,
            alpha=self.alpha,
            achieved_power=achieved_power,
            required_n_per_group=n_required,
            actual_n_control=metric.control_n,
            actual_n_treatment=metric.treatment_n,
            is_significant=is_significant,
            intermediate_steps=all_steps,
            delay_event_ids=(
                [metric.metric_id] if metric.delay_status.value != "on_time" else []
            ),
        )

    def compute_group_comparison(
        self, metric: MetricData, control_group_id: str, treatment_group_id: str
    ) -> GroupComparison:
        steps = []
        abs_diff = metric.treatment_mean - metric.control_mean
        steps.append(
            IntermediateStep(
                step_name="absolute_diff",
                formula="mean_t - mean_c",
                inputs={"mean_t": metric.treatment_mean, "mean_c": metric.control_mean},
                output=abs_diff,
                unit=metric.unit,
                note="绝对差异",
            )
        )
        rel_diff = abs_diff / abs(metric.control_mean) if metric.control_mean != 0 else 0.0
        steps.append(
            IntermediateStep(
                step_name="relative_diff",
                formula="(mean_t - mean_c) / |mean_c|",
                inputs={"absolute_diff": abs_diff, "mean_c": metric.control_mean},
                output=rel_diff,
                unit="比例",
                note="相对差异（增量率）",
            )
        )
        if metric.control_n == 0 or metric.treatment_n == 0:
            balance_ratio = 0.0
        else:
            balance_ratio = min(metric.control_n, metric.treatment_n) / max(metric.control_n, metric.treatment_n)
        is_balanced = balance_ratio >= 0.8
        steps.append(
            IntermediateStep(
                step_name="balance_check",
                formula="min(n_c, n_t) / max(n_c, n_t)",
                inputs={
                    "n_c": metric.control_n,
                    "n_t": metric.treatment_n,
                    "threshold": 0.8,
                },
                output=balance_ratio,
                unit="比例",
                note=f"样本平衡比 {'≥' if is_balanced else '<'} 0.8 → {'均衡' if is_balanced else '不均衡'}",
            )
        )
        return GroupComparison(
            comparison_id=f"gc_{uuid.uuid4().hex[:8]}",
            control_group_id=control_group_id,
            treatment_group_id=treatment_group_id,
            metric_id=metric.metric_id,
            metric_name=metric.metric_name,
            control_mean=metric.control_mean,
            treatment_mean=metric.treatment_mean,
            absolute_diff=abs_diff,
            relative_diff=rel_diff,
            control_n=metric.control_n,
            treatment_n=metric.treatment_n,
            is_balanced=is_balanced,
            balance_ratio=balance_ratio,
            intermediate_steps=steps,
            delay_event_ids=(
                [metric.metric_id] if metric.delay_status.value != "on_time" else []
            ),
        )
