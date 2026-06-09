from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Tuple

import numpy as np
from scipy import stats


class NormalityVerdict(str, Enum):
    NORMAL = "正态"
    NON_NORMAL = "非正态"
    INCONCLUSIVE = "无法判断"
    SKIPPED = "跳过"
    ERROR = "错误"


@dataclass
class TestResult:
    test_name: str
    statistic: Optional[float]
    p_value: Optional[float]
    verdict: NormalityVerdict
    alpha: float = 0.05
    details: Dict = field(default_factory=dict)
    error_message: Optional[str] = None
    sample_size: Optional[int] = None
    requirement_met: Optional[bool] = None

    def to_dict(self) -> Dict:
        return {
            "检验方法": self.test_name,
            "统计量": self.statistic,
            "P值": self.p_value,
            "显著性水平α": self.alpha,
            "结论": self.verdict.value,
            "样本量": self.sample_size,
            "方法适用": self.requirement_met,
            "错误信息": self.error_message,
            **{f"详情_{k}": v for k, v in self.details.items()},
        }


@dataclass
class CombinedTestResult:
    dataset_name: str
    source_material: str
    individual_results: List[TestResult]
    overall_verdict: NormalityVerdict
    overall_confidence: float
    n_tests_run: int
    n_tests_skipped: int
    n_tests_error: int
    issues: List[str] = field(default_factory=list)
    gap_items: List[str] = field(default_factory=list)

    def summary_text(self) -> str:
        lines = [
            f"数据集: {self.dataset_name}",
            f"来源材料: {self.source_material}",
            f"总体结论: {self.overall_verdict.value}",
            f"置信度: {self.overall_confidence:.1%}",
            f"执行检验: {self.n_tests_run} | 跳过: {self.n_tests_skipped} | 错误: {self.n_tests_error}",
        ]
        if self.issues:
            lines.append("问题列表:")
            for issue in self.issues:
                lines.append(f"  - {issue}")
        if self.gap_items:
            lines.append("缺失项（需补充）:")
            for gap in self.gap_items:
                lines.append(f"  - {gap}")
        return "\n".join(lines)


class NormalityTester:
    def __init__(self, alpha: float = 0.05):
        self.alpha = alpha
        self._method_requirements = {
            "shapiro": (3, 5000),
            "ks": (5, None),
            "anderson": (8, None),
            "jarque_bera": (20, None),
            "dagostino": (20, None),
            "lilliefors": (5, None),
        }

    def _check_requirements(
        self, method: str, n: int
    ) -> Tuple[bool, Optional[str]]:
        if method not in self._method_requirements:
            return True, None
        min_n, max_n = self._method_requirements[method]
        if n < min_n:
            return False, f"样本量不足（需≥{min_n}，实际{n}）"
        if max_n and n > max_n:
            return False, f"样本量过大（需≤{max_n}，实际{n}）"
        return True, None

    def shapiro_wilk(self, data: np.ndarray) -> TestResult:
        n = len(data)
        ok, msg = self._check_requirements("shapiro", n)
        if not ok:
            return TestResult(
                test_name="Shapiro-Wilk检验",
                statistic=None,
                p_value=None,
                verdict=NormalityVerdict.SKIPPED,
                alpha=self.alpha,
                sample_size=n,
                requirement_met=False,
                error_message=msg,
            )
        try:
            stat, p = stats.shapiro(data)
            verdict = (
                NormalityVerdict.NORMAL if p > self.alpha else NormalityVerdict.NON_NORMAL
            )
            return TestResult(
                test_name="Shapiro-Wilk检验",
                statistic=round(float(stat), 6),
                p_value=round(float(p), 6),
                verdict=verdict,
                alpha=self.alpha,
                sample_size=n,
                requirement_met=True,
                details={
                    "判断规则": f"P值 > {self.alpha}则不拒绝正态假设",
                    "决策": "不拒绝H0（正态）" if p > self.alpha else "拒绝H0（非正态）",
                },
            )
        except Exception as e:
            return TestResult(
                test_name="Shapiro-Wilk检验",
                statistic=None,
                p_value=None,
                verdict=NormalityVerdict.ERROR,
                alpha=self.alpha,
                sample_size=n,
                requirement_met=True,
                error_message=str(e),
            )

    def kolmogorov_smirnov(self, data: np.ndarray) -> TestResult:
        n = len(data)
        ok, msg = self._check_requirements("ks", n)
        if not ok:
            return TestResult(
                test_name="Kolmogorov-Smirnov检验",
                statistic=None,
                p_value=None,
                verdict=NormalityVerdict.SKIPPED,
                alpha=self.alpha,
                sample_size=n,
                requirement_met=False,
                error_message=msg,
            )
        try:
            mu, sigma = np.mean(data), np.std(data, ddof=1)
            if sigma == 0:
                return TestResult(
                    test_name="Kolmogorov-Smirnov检验",
                    statistic=None,
                    p_value=None,
                    verdict=NormalityVerdict.ERROR,
                    alpha=self.alpha,
                    sample_size=n,
                    requirement_met=True,
                    error_message="样本标准差为0，无法检验",
                )
            standardized = (data - mu) / sigma
            stat, p = stats.kstest(standardized, "norm")
            verdict = (
                NormalityVerdict.NORMAL if p > self.alpha else NormalityVerdict.NON_NORMAL
            )
            return TestResult(
                test_name="Kolmogorov-Smirnov检验",
                statistic=round(float(stat), 6),
                p_value=round(float(p), 6),
                verdict=verdict,
                alpha=self.alpha,
                sample_size=n,
                requirement_met=True,
                details={
                    "均值μ": round(float(mu), 4),
                    "标准差σ": round(float(sigma), 4),
                    "判断规则": f"P值 > {self.alpha}则不拒绝正态假设",
                    "决策": "不拒绝H0（正态）" if p > self.alpha else "拒绝H0（非正态）",
                },
            )
        except Exception as e:
            return TestResult(
                test_name="Kolmogorov-Smirnov检验",
                statistic=None,
                p_value=None,
                verdict=NormalityVerdict.ERROR,
                alpha=self.alpha,
                sample_size=n,
                requirement_met=True,
                error_message=str(e),
            )

    def anderson_darling(self, data: np.ndarray) -> TestResult:
        n = len(data)
        ok, msg = self._check_requirements("anderson", n)
        if not ok:
            return TestResult(
                test_name="Anderson-Darling检验",
                statistic=None,
                p_value=None,
                verdict=NormalityVerdict.SKIPPED,
                alpha=self.alpha,
                sample_size=n,
                requirement_met=False,
                error_message=msg,
            )
        try:
            result = stats.anderson(data, dist="norm")
            stat = float(result.statistic)
            critical_values = result.critical_values
            significance_levels = result.significance_level

            alpha_idx = None
            for i, sl in enumerate(significance_levels):
                if abs(sl / 100 - self.alpha) < 0.01:
                    alpha_idx = i
                    break

            if alpha_idx is None:
                alpha_idx = 2

            crit = critical_values[alpha_idx]
            verdict = (
                NormalityVerdict.NORMAL if stat < crit else NormalityVerdict.NON_NORMAL
            )

            details = {}
            for i, sl in enumerate(significance_levels):
                details[f"临界值(α={sl/100})"] = round(float(critical_values[i]), 6)
            details["判断规则"] = f"统计量 < 临界值({round(float(crit), 6)})则不拒绝正态假设"
            details["决策"] = "不拒绝H0（正态）" if stat < crit else "拒绝H0（非正态）"

            return TestResult(
                test_name="Anderson-Darling检验",
                statistic=round(stat, 6),
                p_value=None,
                verdict=verdict,
                alpha=self.alpha,
                sample_size=n,
                requirement_met=True,
                details=details,
            )
        except Exception as e:
            return TestResult(
                test_name="Anderson-Darling检验",
                statistic=None,
                p_value=None,
                verdict=NormalityVerdict.ERROR,
                alpha=self.alpha,
                sample_size=n,
                requirement_met=True,
                error_message=str(e),
            )

    def jarque_bera(self, data: np.ndarray) -> TestResult:
        n = len(data)
        ok, msg = self._check_requirements("jarque_bera", n)
        if not ok:
            return TestResult(
                test_name="Jarque-Bera检验",
                statistic=None,
                p_value=None,
                verdict=NormalityVerdict.SKIPPED,
                alpha=self.alpha,
                sample_size=n,
                requirement_met=False,
                error_message=msg,
            )
        try:
            stat, p = stats.jarque_bera(data)
            skew = stats.skew(data)
            kurt = stats.kurtosis(data)
            verdict = (
                NormalityVerdict.NORMAL if p > self.alpha else NormalityVerdict.NON_NORMAL
            )
            return TestResult(
                test_name="Jarque-Bera检验",
                statistic=round(float(stat), 6),
                p_value=round(float(p), 6),
                verdict=verdict,
                alpha=self.alpha,
                sample_size=n,
                requirement_met=True,
                details={
                    "偏度S": round(float(skew), 4),
                    "峰度K": round(float(kurt), 4),
                    "正态偏度": 0,
                    "正态峰度": 0,
                    "判断规则": f"P值 > {self.alpha}则不拒绝正态假设",
                    "决策": "不拒绝H0（正态）" if p > self.alpha else "拒绝H0（非正态）",
                },
            )
        except Exception as e:
            return TestResult(
                test_name="Jarque-Bera检验",
                statistic=None,
                p_value=None,
                verdict=NormalityVerdict.ERROR,
                alpha=self.alpha,
                sample_size=n,
                requirement_met=True,
                error_message=str(e),
            )

    def dagostino_pearson(self, data: np.ndarray) -> TestResult:
        n = len(data)
        ok, msg = self._check_requirements("dagostino", n)
        if not ok:
            return TestResult(
                test_name="D'Agostino-Pearson检验",
                statistic=None,
                p_value=None,
                verdict=NormalityVerdict.SKIPPED,
                alpha=self.alpha,
                sample_size=n,
                requirement_met=False,
                error_message=msg,
            )
        try:
            stat, p = stats.normaltest(data)
            verdict = (
                NormalityVerdict.NORMAL if p > self.alpha else NormalityVerdict.NON_NORMAL
            )
            return TestResult(
                test_name="D'Agostino-Pearson检验",
                statistic=round(float(stat), 6),
                p_value=round(float(p), 6),
                verdict=verdict,
                alpha=self.alpha,
                sample_size=n,
                requirement_met=True,
                details={
                    "判断规则": f"P值 > {self.alpha}则不拒绝正态假设",
                    "决策": "不拒绝H0（正态）" if p > self.alpha else "拒绝H0（非正态）",
                },
            )
        except Exception as e:
            return TestResult(
                test_name="D'Agostino-Pearson检验",
                statistic=None,
                p_value=None,
                verdict=NormalityVerdict.ERROR,
                alpha=self.alpha,
                sample_size=n,
                requirement_met=True,
                error_message=str(e),
            )

    def run_all_tests(
        self,
        data: np.ndarray,
        dataset_name: str = "未命名",
        source_material: str = "未知材料",
        gaps: Optional[List[str]] = None,
    ) -> CombinedTestResult:
        issues: List[str] = []
        methods = [
            self.shapiro_wilk,
            self.kolmogorov_smirnov,
            self.anderson_darling,
            self.jarque_bera,
            self.dagostino_pearson,
        ]

        results: List[TestResult] = []
        for method in methods:
            result = method(data)
            results.append(result)
            if result.verdict == NormalityVerdict.SKIPPED:
                issues.append(f"{result.test_name}被跳过：{result.error_message}")
            elif result.verdict == NormalityVerdict.ERROR:
                issues.append(f"{result.test_name}出错：{result.error_message}")

        run_results = [
            r
            for r in results
            if r.verdict in (NormalityVerdict.NORMAL, NormalityVerdict.NON_NORMAL)
        ]
        n_run = len(run_results)
        n_skipped = sum(1 for r in results if r.verdict == NormalityVerdict.SKIPPED)
        n_error = sum(1 for r in results if r.verdict == NormalityVerdict.ERROR)

        if n_run == 0:
            overall = NormalityVerdict.INCONCLUSIVE
            confidence = 0.0
            issues.append("没有任何检验成功执行，无法得出结论")
        else:
            normal_count = sum(
                1 for r in run_results if r.verdict == NormalityVerdict.NORMAL
            )
            normal_ratio = normal_count / n_run

            if normal_ratio >= 0.75:
                overall = NormalityVerdict.NORMAL
            elif normal_ratio <= 0.25:
                overall = NormalityVerdict.NON_NORMAL
            else:
                overall = NormalityVerdict.INCONCLUSIVE
                issues.append(f"检验结果不一致（{normal_count}/{n_run}支持正态）")

            confidence = max(normal_ratio, 1 - normal_ratio)

        return CombinedTestResult(
            dataset_name=dataset_name,
            source_material=source_material,
            individual_results=results,
            overall_verdict=overall,
            overall_confidence=confidence,
            n_tests_run=n_run,
            n_tests_skipped=n_skipped,
            n_tests_error=n_error,
            issues=issues,
            gap_items=gaps or [],
        )
