"""贝叶斯分析核心算法"""

import numpy as np
from scipy.stats import beta
from typing import List, Tuple, Dict, Any

from .models import (
    SampleRecord,
    PriorParams,
    BayesianResult,
    TraceInfo,
)


class BayesianAnalyzer:
    """贝叶斯质检分析器"""

    def __init__(
        self,
        credible_level: float = 0.95,
        defect_threshold: float = 0.02,
        warning_sample_size: int = 20,
        strong_prior_threshold: float = 0.8,
    ):
        """
        初始化分析器

        Args:
            credible_level: 置信水平 (默认95%)
            defect_threshold: 可接受缺陷率阈值 (默认2%)
            warning_sample_size: 样本量告警阈值 (默认<20条时告警)
            strong_prior_threshold: 强先验判定阈值 (先验权重占比>80%时告警)
        """
        self.credible_level = credible_level
        self.defect_threshold = defect_threshold
        self.warning_sample_size = warning_sample_size
        self.strong_prior_threshold = strong_prior_threshold

    def _update_posterior(
        self,
        prior: PriorParams,
        total_samples: int,
        defective_count: int,
    ) -> Tuple[float, float]:
        """
        计算后验Beta分布参数
        共轭先验: Beta(alpha, beta) + 二项分布(k个缺陷, n个样本)
              -> Beta(alpha + k, beta + n - k)
        """
        posterior_alpha = prior.alpha + defective_count
        posterior_beta = prior.beta + (total_samples - defective_count)
        return posterior_alpha, posterior_beta

    def _compute_credible_interval(
        self,
        alpha: float,
        beta_param: float,
    ) -> Tuple[float, float]:
        """计算最高后验密度置信区间"""
        lower_quantile = (1 - self.credible_level) / 2
        upper_quantile = 1 - lower_quantile

        ci_low = beta.ppf(lower_quantile, alpha, beta_param)
        ci_high = beta.ppf(upper_quantile, alpha, beta_param)

        return max(0.0, ci_low), min(1.0, ci_high)

    def _make_decision(
        self,
        mean_defect_rate: float,
        ci_low: float,
        ci_high: float,
    ) -> Tuple[str, str]:
        """
        根据后验分布做出质检决策

        Returns:
            (decision, recommendation)
            decision: 合格/可疑/不合格
            recommendation: 具体建议
        """
        if ci_high <= self.defect_threshold:
            decision = "合格"
            recommendation = "批次通过，无需加检"
        elif ci_low >= self.defect_threshold:
            decision = "不合格"
            recommendation = "批次拒收，建议全检或退回"
        else:
            decision = "可疑"
            if mean_defect_rate > self.defect_threshold:
                recommendation = "缺陷率均值超过阈值，建议加检后重新评估"
            else:
                recommendation = "置信区间包含阈值，建议补充抽样后重新评估"

        return decision, recommendation

    def _check_warnings(
        self,
        samples: List[SampleRecord],
        prior: PriorParams,
        total_samples: int,
        defective_count: int,
        posterior_alpha: float,
        posterior_beta: float,
    ) -> List[str]:
        """检查边缘情况并生成告警"""
        warnings = []

        if total_samples < self.warning_sample_size:
            warnings.append(
                f"样本量过少: 当前{total_samples}条，建议至少{self.warning_sample_size}条以获得更可靠的结论"
            )

        prior_weight = prior.effective_sample_size / (
            prior.effective_sample_size + total_samples
        )
        if prior_weight > self.strong_prior_threshold:
            warnings.append(
                f"先验影响过强: 先验权重占比{prior_weight:.1%}，可能主导后验结果，建议增加样本量或调整先验参数"
            )

        sample_ids = [s.sample_id for s in samples]
        if len(sample_ids) != len(set(sample_ids)):
            warnings.append("存在重复样本ID，可能存在缺陷漏标或重复记录")

        if total_samples > 0 and defective_count == 0:
            zero_defect_ci_high = beta.ppf(
                self.credible_level, prior.alpha, prior.beta + total_samples
            )
            if zero_defect_ci_high > self.defect_threshold:
                warnings.append(
                    f"零缺陷但置信区间上限{zero_defect_ci_high:.2%}仍超过阈值{self.defect_threshold:.2%}，存在缺陷漏检风险"
                )

        return warnings

    def analyze(
        self,
        batch_id: str,
        samples: List[SampleRecord],
        prior: PriorParams,
        compared_results: Dict[str, BayesianResult] = None,
    ) -> BayesianResult:
        """
        执行贝叶斯质检分析

        Args:
            batch_id: 批次ID
            samples: 抽样记录列表
            prior: 先验参数
            compared_results: 用于批次对比的历史结果

        Returns:
            BayesianResult: 分析结果
        """
        total_samples = len(samples)
        defective_count = sum(1 for s in samples if s.is_defective)

        trace = TraceInfo(
            batch_id=batch_id,
            source_files=list({s.source_file for s in samples}),
            sample_ids=[s.sample_id for s in samples],
            prior_source=prior.source,
        )

        trace.add_step(
            f"输入数据: {total_samples}个样本, {defective_count}个缺陷品"
        )
        trace.add_step(
            f"先验参数: Beta(α={prior.alpha:.2f}, β={prior.beta:.2f}), "
            f"均值={prior.mean:.2%}, 等效样本量={prior.effective_sample_size:.1f}"
        )

        posterior_alpha, posterior_beta = self._update_posterior(
            prior, total_samples, defective_count
        )
        trace.add_step(
            f"后验更新: Beta(α={posterior_alpha:.2f}, β={posterior_beta:.2f})"
        )

        mean_defect_rate = posterior_alpha / (posterior_alpha + posterior_beta)
        trace.add_step(f"后验缺陷率均值: {mean_defect_rate:.2%}")

        ci_low, ci_high = self._compute_credible_interval(
            posterior_alpha, posterior_beta
        )
        trace.add_step(
            f"{self.credible_level:.0%}置信区间: [{ci_low:.2%}, {ci_high:.2%}]"
        )

        decision, recommendation = self._make_decision(
            mean_defect_rate, ci_low, ci_high
        )
        trace.add_step(f"决策: {decision}, 建议: {recommendation}")

        warnings = self._check_warnings(
            samples, prior, total_samples, defective_count,
            posterior_alpha, posterior_beta
        )
        for w in warnings:
            trace.add_step(f"告警: {w}")

        compared_batches = {}
        if compared_results:
            for other_batch_id, other_result in compared_results.items():
                if other_batch_id != batch_id:
                    diff = mean_defect_rate - other_result.mean_defect_rate
                    compared_batches[other_batch_id] = {
                        "mean_defect_rate": other_result.mean_defect_rate,
                        "difference": diff,
                        "relative_change_pct": (diff / other_result.mean_defect_rate * 100)
                        if other_result.mean_defect_rate > 0 else float("inf"),
                        "ci_overlap": self._check_ci_overlap(
                            ci_low, ci_high,
                            other_result.credible_interval_low,
                            other_result.credible_interval_high,
                        ),
                    }
                    trace.add_step(
                        f"批次对比: vs {other_batch_id}, 差异{diff:+.2%}"
                    )

        return BayesianResult(
            batch_id=batch_id,
            total_samples=total_samples,
            defective_count=defective_count,
            prior=prior,
            posterior_alpha=posterior_alpha,
            posterior_beta=posterior_beta,
            mean_defect_rate=mean_defect_rate,
            credible_interval_low=ci_low,
            credible_interval_high=ci_high,
            credible_level=self.credible_level,
            decision=decision,
            recommendation=recommendation,
            trace=trace,
            warnings=warnings,
            compared_batches=compared_batches,
        )

    @staticmethod
    def _check_ci_overlap(
        low1: float, high1: float, low2: float, high2: float
    ) -> bool:
        """检查两个置信区间是否有重叠"""
        return not (high1 < low2 or high2 < low1)
