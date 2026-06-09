"""置信区间计算引擎

实现三种主流口径：
1. Wilson 得分区间 - 推荐，小样本表现好
2. Clopper-Pearson 精确区间 - 保守，基于 Beta 分布
3. 正态近似区间 - 最简，大样本可用，近似误差需关注

所有函数均为纯函数，便于测试和组合。
"""
from __future__ import annotations

from typing import List, Dict, Tuple
import math

import numpy as np
from scipy import stats

from .models import CI_METHOD, CIResult, StudentAnswer


# ---------- 单口径置信区间计算 ----------

def ci_wilson(k: int, n: int, confidence: float = 0.95) -> Tuple[float, float]:
    """Wilson 得分区间

    Wilson 区间在小样本和极端概率下表现稳健，是建模社推荐口径。

    公式：
        p̃ = (k + z²/2) / (n + z²)
        半宽 = z * sqrt( (p̃*(1-p̃) + z²/(4n)) / (n + z²) )
    """
    if n == 0:
        return (0.0, 1.0)
    alpha = 1 - confidence
    z = stats.norm.ppf(1 - alpha / 2)
    z_sq = z ** 2
    p_adj = (k + z_sq / 2) / (n + z_sq)
    half_width = z * math.sqrt((p_adj * (1 - p_adj) + z_sq / (4 * n)) / (n + z_sq))
    lower = max(0.0, p_adj - half_width)
    upper = min(1.0, p_adj + half_width)
    return (lower, upper)


def ci_clopper_pearson(k: int, n: int, confidence: float = 0.95) -> Tuple[float, float]:
    """Clopper-Pearson 精确区间

    基于 Beta 分布的精确区间，结果偏保守（区间更宽）。
    常用于需要严格控制覆盖率的场景。

    公式：
        下限 = Beta(alpha/2, k, n-k+1) 的分位数
        上限 = Beta(1-alpha/2, k+1, n-k) 的分位数
    """
    if n == 0:
        return (0.0, 1.0)
    alpha = 1 - confidence
    if k == 0:
        lower = 0.0
    else:
        lower = stats.beta.ppf(alpha / 2, k, n - k + 1)
    if k == n:
        upper = 1.0
    else:
        upper = stats.beta.ppf(1 - alpha / 2, k + 1, n - k)
    return (float(lower), float(upper))


def ci_normal_approx(k: int, n: int, confidence: float = 0.95) -> Tuple[float, float]:
    """正态近似区间（Wald 区间）

    最简单的口径，但在 n*p<5 或 n*(1-p)<5 时近似误差较大，
    是本工具重点监测的对象。

    公式：
        p̂ = k / n
        半宽 = z * sqrt(p̂*(1-p̂)/n)
    """
    if n == 0:
        return (0.0, 1.0)
    alpha = 1 - confidence
    z = stats.norm.ppf(1 - alpha / 2)
    p_hat = k / n
    se = math.sqrt(p_hat * (1 - p_hat) / n)
    half_width = z * se
    lower = max(0.0, p_hat - half_width)
    upper = min(1.0, p_hat + half_width)
    return (lower, upper)


# 口径 -> 计算函数 映射
_CI_FUNCTIONS = {
    CI_METHOD.WILSON: ci_wilson,
    CI_METHOD.CLOPPER_PEARSON: ci_clopper_pearson,
    CI_METHOD.NORMAL_APPROX: ci_normal_approx,
}


def compute_ci(k: int, n: int, method: CI_METHOD, confidence: float = 0.95) -> Tuple[float, float]:
    """统一的置信区间计算入口"""
    if method not in _CI_FUNCTIONS:
        raise ValueError(f"未知的置信区间口径: {method}")
    return _CI_FUNCTIONS[method](k, n, confidence)


# ---------- 分组统计 ----------

def group_stats(answers: List[StudentAnswer], group_by: str = "question_id") -> Dict[str, Tuple[int, int]]:
    """按指定维度分组统计 (n, k)

    Args:
        answers: 答题记录列表
        group_by: 分组维度，"question_id" 或 "student_id" 或 tag 名

    Returns:
        {group_key: (样本量 n, 正确数 k)} 的字典，仅统计已评分的记录
    """
    stats_dict: Dict[str, Dict[str, int]] = {}

    for ans in answers:
        if ans.is_correct is None:
            continue

        if group_by == "question_id":
            key = ans.question_id
        elif group_by == "student_id":
            key = ans.student_id
        else:
            if group_by in ans.tags:
                key = group_by
            else:
                continue

        if key not in stats_dict:
            stats_dict[key] = {"n": 0, "k": 0}
        stats_dict[key]["n"] += 1
        if ans.is_correct:
            stats_dict[key]["k"] += 1

    return {k: (v["n"], v["k"]) for k, v in stats_dict.items()}


def group_stats_by_tag_values(
    answers: List[StudentAnswer],
    tag_name: str,
) -> Dict[str, Tuple[int, int]]:
    """按标签值分组（tags 列表中形如 "知识点:函数" 的 key:value 格式）

    Args:
        answers: 答题记录
        tag_name: 标签名，如 "知识点"

    Returns:
        {标签值: (n, k)}
    """
    prefix = f"{tag_name}:"
    stats_dict: Dict[str, Dict[str, int]] = {}

    for ans in answers:
        if ans.is_correct is None:
            continue
        for tag in ans.tags:
            if tag.startswith(prefix):
                value = tag[len(prefix):]
                if value not in stats_dict:
                    stats_dict[value] = {"n": 0, "k": 0}
                stats_dict[value]["n"] += 1
                if ans.is_correct:
                    stats_dict[value]["k"] += 1

    return {k: (v["n"], v["k"]) for k, v in stats_dict.items()}


# ---------- 多口径批量计算 ----------

def compute_all_ci(
    answers: List[StudentAnswer],
    methods: List[CI_METHOD] | None = None,
    group_by: str = "question_id",
    confidence: float = 0.95,
) -> List[CIResult]:
    """对所有分组计算所有口径的置信区间

    图表、明细表、导出数据均使用此函数的返回结果，确保数据源唯一。

    Args:
        answers: 答题记录
        methods: 要计算的口径列表，默认全部三种
        group_by: 分组维度
        confidence: 置信水平

    Returns:
        CIResult 列表
    """
    if methods is None:
        methods = list(CI_METHOD)

    stats_map = group_stats(answers, group_by)
    results: List[CIResult] = []

    for group_key, (n, k) in stats_map.items():
        p = k / n if n > 0 else 0.0
        for method in methods:
            lower, upper = compute_ci(k, n, method, confidence)
            results.append(CIResult(
                group_key=group_key,
                method=method,
                n=n,
                k=k,
                p=round(p, 6),
                ci_lower=round(lower, 6),
                ci_upper=round(upper, 6),
                ci_width=round(upper - lower, 6),
                confidence_level=confidence,
            ))

    return results


def results_to_pivot(ci_results: List[CIResult]) -> Dict[str, Dict[str, Dict[str, float]]]:
    """将 CIResult 列表转换为透视结构，便于前端展示

    Returns:
        {
            group_key: {
                method_name: {"lower": ..., "upper": ..., "width": ..., "p": ..., "n": ...}
            }
        }
    """
    pivot: Dict[str, Dict[str, Dict[str, float]]] = {}
    for r in ci_results:
        if r.group_key not in pivot:
            pivot[r.group_key] = {}
        pivot[r.group_key][r.method.value] = {
            "lower": r.ci_lower,
            "upper": r.ci_upper,
            "width": r.ci_width,
            "p": r.p,
            "n": r.n,
            "k": r.k,
        }
    return pivot
