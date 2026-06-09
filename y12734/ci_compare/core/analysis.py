"""误差分析、反例生成与异常检测模块

核心功能：
1. 误差分析：对比不同口径的差异，识别近似误差过大
2. 反例生成：找出不同口径结论不一致的分组
3. 异常分级：区分"需补材料"和"需改口径"两类异常，附处理建议
"""
from __future__ import annotations

from typing import List, Dict, Optional

from .models import (
    CI_METHOD,
    ANOMALY_TYPE,
    ANOMALY_SEVERITY,
    StudentAnswer,
    CIResult,
    ErrorAnalysis,
    CounterExample,
    AnomalyRecord,
)
from .ci_engine import results_to_pivot


# ---------- 误差分析 ----------

def analyze_method_errors(
    ci_results: List[CIResult],
    reference: CI_METHOD = CI_METHOD.CLOPPER_PEARSON,
    approx: CI_METHOD = CI_METHOD.NORMAL_APPROX,
    width_threshold: float = 0.05,
) -> List[ErrorAnalysis]:
    """分析近似口径相对于参考口径的误差

    默认以 Clopper-Pearson 精确区间为参考，监测正态近似的误差。
    当区间宽度差异超过 width_threshold（默认5个百分点）时标记为异常。
    """
    pivot = results_to_pivot(ci_results)
    analyses: List[ErrorAnalysis] = []

    for group_key, methods in pivot.items():
        if reference.value not in methods or approx.value not in methods:
            continue

        ref = methods[reference.value]
        app = methods[approx.value]

        lower_diff = app["lower"] - ref["lower"]
        upper_diff = app["upper"] - ref["upper"]
        width_diff = app["width"] - ref["width"]

        too_large = abs(width_diff) > width_threshold

        analyses.append(ErrorAnalysis(
            group_key=group_key,
            reference_method=reference,
            approx_method=approx,
            lower_diff=round(lower_diff, 6),
            upper_diff=round(upper_diff, 6),
            width_diff=round(width_diff, 6),
            is_approx_error_too_large=too_large,
            threshold=width_threshold,
        ))

    return analyses


# ---------- 反例生成 ----------

def generate_counter_examples(
    ci_results: List[CIResult],
    decision_threshold: float = 0.6,
) -> List[CounterExample]:
    """生成反例：不同口径给出相反结论的分组

    判断规则（以 decision_threshold=0.6 为例）：
    - 口径A：置信区间下限 > 0.6 → 结论"显著高于60%"
    - 口径B：置信区间上限 < 0.6 → 结论"显著低于60%"
    若出现这种分歧，则为反例。
    """
    pivot = results_to_pivot(ci_results)
    examples: List[CounterExample] = []

    for group_key, methods in pivot.items():
        method_results: Dict[str, Dict] = {}
        conclusions: Dict[str, str] = {}

        for method_name, vals in methods.items():
            method_results[method_name] = {
                "lower": vals["lower"],
                "upper": vals["upper"],
                "p": vals["p"],
                "n": vals["n"],
            }
            if vals["lower"] > decision_threshold:
                conclusions[method_name] = "above"
            elif vals["upper"] < decision_threshold:
                conclusions[method_name] = "below"
            else:
                conclusions[method_name] = "inconclusive"

        uniq = set(conclusions.values())
        if len(uniq) > 1 and "above" in uniq and "below" in uniq:
            above_methods = [m for m, c in conclusions.items() if c == "above"]
            below_methods = [m for m, c in conclusions.items() if c == "below"]
            description = (
                f"口径结论分歧："
                f"{'/'.join(above_methods)} 判定显著高于 {decision_threshold:.0%}，"
                f"而 {'/'.join(below_methods)} 判定显著低于 {decision_threshold:.0%}。"
                f"点估计 p={method_results[list(methods.keys())[0]]['p']:.3f}，"
                f"n={method_results[list(methods.keys())[0]]['n']}"
            )

            p = method_results[list(methods.keys())[0]]["p"]
            n = method_results[list(methods.keys())[0]]["n"]
            if n < 20 or abs(p - decision_threshold) < 0.1:
                impact = "high"
            elif n < 50:
                impact = "medium"
            else:
                impact = "low"

            examples.append(CounterExample(
                group_key=group_key,
                description=description,
                method_results=method_results,
                impact_level=impact,
            ))

    return examples


# ---------- 异常检测与分级 ----------

def detect_anomalies(
    answers: List[StudentAnswer],
    ci_results: List[CIResult],
    error_analyses: List[ErrorAnalysis],
    counter_examples: List[CounterExample],
    min_sample_size: int = 10,
    approx_error_threshold: float = 0.05,
) -> List[AnomalyRecord]:
    """检测并分级所有异常

    两类异常：
    - NEED_MATERIAL（需补材料）：数据本身问题
    - NEED_METHOD（需改口径）：方法适用性问题

    此函数是纯函数，评分补录后重新调用即可得到更新的异常列表。
    """
    anomalies: List[AnomalyRecord] = []

    # 1. 未评分的记录 → 需补材料
    unrated = [a for a in answers if a.is_correct is None]
    if unrated:
        by_question: Dict[str, int] = {}
        for a in unrated:
            by_question[a.question_id] = by_question.get(a.question_id, 0) + 1
        top_q = sorted(by_question.items(), key=lambda x: -x[1])[:5]
        anomalies.append(AnomalyRecord(
            anomaly_type=ANOMALY_TYPE.NEED_MATERIAL,
            severity=ANOMALY_SEVERITY.WARNING if len(unrated) < 10 else ANOMALY_SEVERITY.CRITICAL,
            title=f"有 {len(unrated)} 条答题记录未评分",
            description=(
                "以下题目存在未评分记录："
                + "；".join(f"{qid}: {cnt}条" for qid, cnt in top_q)
                + ("…" if len(by_question) > 5 else "")
                + "。请补录评分后重新计算。"
            ),
            values={"total_unrated": len(unrated), "by_question": by_question},
        ))

    # 2. 样本量过小的分组 → 需补材料
    pivot = results_to_pivot(ci_results)
    small_samples = []
    for group_key, methods in pivot.items():
        first_method = list(methods.values())[0]
        if first_method["n"] < min_sample_size:
            small_samples.append((group_key, first_method["n"]))

    if small_samples:
        small_samples.sort(key=lambda x: x[1])
        anomalies.append(AnomalyRecord(
            group_key=None,
            anomaly_type=ANOMALY_TYPE.NEED_MATERIAL,
            severity=ANOMALY_SEVERITY.WARNING,
            title=f"有 {len(small_samples)} 个分组样本量不足 {min_sample_size}",
            description=(
                f"样本量低于 {min_sample_size} 时，置信区间结果可靠性较差。"
                f"样本量最小的分组："
                + "；".join(f"{g}: n={n}" for g, n in small_samples[:5])
                + "。建议补充答题数据或合并细分组。"
            ),
            values={"groups": small_samples, "threshold": min_sample_size},
        ))

    # 3. 极端正确率（0% 或 100%）→ 需改口径
    extreme = []
    for group_key, methods in pivot.items():
        first_method = list(methods.values())[0]
        if first_method["p"] in (0.0, 1.0):
            extreme.append((group_key, first_method["p"], first_method["n"]))

    if extreme:
        anomalies.append(AnomalyRecord(
            anomaly_type=ANOMALY_TYPE.NEED_METHOD,
            severity=ANOMALY_SEVERITY.INFO,
            title=f"有 {len(extreme)} 个分组正确率为 0% 或 100%",
            description=(
                "极端正确率下，正态近似区间会退化为点（宽度为0），"
                "此时应使用 Wilson 或 Clopper-Pearson 口径。"
                + "；".join(f"{g}: p={'100%' if p == 1 else '0%'}, n={n}" for g, p, n in extreme[:5])
            ),
            affected_methods=[CI_METHOD.NORMAL_APPROX],
            values={"groups": extreme},
        ))

    # 4. 正态近似条件不满足（np < 5 或 n(1-p) < 5）→ 需改口径
    normal_violations = []
    for group_key, methods in pivot.items():
        m = methods.get(CI_METHOD.NORMAL_APPROX.value)
        if not m:
            continue
        n, p = m["n"], m["p"]
        if n * p < 5 or n * (1 - p) < 5:
            normal_violations.append((group_key, n, p, min(n * p, n * (1 - p))))

    if normal_violations:
        normal_violations.sort(key=lambda x: x[3])
        anomalies.append(AnomalyRecord(
            anomaly_type=ANOMALY_TYPE.NEED_METHOD,
            severity=ANOMALY_SEVERITY.WARNING,
            title=f"有 {len(normal_violations)} 个分组不满足正态近似条件",
            description=(
                "正态近似要求 np ≥ 5 且 n(1-p) ≥ 5。以下分组不满足："
                + "；".join(f"{g}: n={n}, p={p:.3f}, min(np,n(1-p))={v:.2f}" for g, n, p, v in normal_violations[:5])
                + "。建议改用 Wilson 或 Clopper-Pearson 口径。"
            ),
            affected_methods=[CI_METHOD.NORMAL_APPROX],
            values={"groups": normal_violations},
        ))

    # 5. 近似误差过大 → 需改口径
    large_errors = [e for e in error_analyses if e.is_approx_error_too_large]
    if large_errors:
        large_errors.sort(key=lambda e: -abs(e.width_diff))
        anomalies.append(AnomalyRecord(
            anomaly_type=ANOMALY_TYPE.NEED_METHOD,
            severity=ANOMALY_SEVERITY.WARNING,
            title=f"有 {len(large_errors)} 个分组近似误差超过 {approx_error_threshold:.0%}",
            description=(
                f"以 {large_errors[0].reference_method.display_name} 为参考，"
                f"{large_errors[0].approx_method.display_name} 的区间宽度误差超过阈值 "
                f"{approx_error_threshold:.0%}。差异最大的分组："
                + "；".join(
                    f"{e.group_key}: 宽度差 {e.width_diff:+.3f} "
                    f"(参考宽度 {abs(e.width_diff) - e.width_diff + 0 if e.width_diff > 0 else 0:.3f}→近似宽度)"
                    for e in large_errors[:5]
                )
                + "。这些分组的近似结果已被拦截，导出报告中将标注。"
            ),
            affected_methods=[CI_METHOD.NORMAL_APPROX],
            values={
                "groups": [e.group_key for e in large_errors],
                "threshold": approx_error_threshold,
                "max_diff": large_errors[0].width_diff if large_errors else 0,
            },
        ))

    # 6. 反例（口径结论分歧）→ 需改口径
    if counter_examples:
        high_impact = [e for e in counter_examples if e.impact_level == "high"]
        anomalies.append(AnomalyRecord(
            anomaly_type=ANOMALY_TYPE.NEED_METHOD,
            severity=ANOMALY_SEVERITY.CRITICAL if high_impact else ANOMALY_SEVERITY.WARNING,
            title=f"发现 {len(counter_examples)} 个反例（口径结论分歧）",
            description=(
                f"在这些分组上，不同置信区间口径给出了相反的统计结论。"
                f"其中高影响 {len(high_impact)} 个，中低影响 {len(counter_examples) - len(high_impact)} 个。"
                f"示例：{counter_examples[0].description if counter_examples else ''}。"
                "请评估决策阈值或口径选择是否合理。"
            ),
            affected_methods=list(CI_METHOD),
            values={
                "total": len(counter_examples),
                "high_impact": len(high_impact),
                "examples": [e.group_key for e in counter_examples[:5]],
            },
        ))

    return anomalies


# ---------- 总入口 ----------

def run_full_analysis(
    answers: List[StudentAnswer],
    confidence: float = 0.95,
    min_sample_size: int = 10,
    approx_error_threshold: float = 0.05,
    decision_threshold: float = 0.6,
    group_by: str = "question_id",
) -> Dict[str, List]:
    """运行完整分析流程，返回所有结果

    图表、明细表、导出报告均使用此函数返回的同一份数据。
    """
    from .ci_engine import compute_all_ci

    ci_results = compute_all_ci(answers, group_by=group_by, confidence=confidence)
    error_analyses = analyze_method_errors(
        ci_results,
        reference=CI_METHOD.CLOPPER_PEARSON,
        approx=CI_METHOD.NORMAL_APPROX,
        width_threshold=approx_error_threshold,
    )
    counter_examples = generate_counter_examples(
        ci_results,
        decision_threshold=decision_threshold,
    )
    anomalies = detect_anomalies(
        answers,
        ci_results,
        error_analyses,
        counter_examples,
        min_sample_size=min_sample_size,
        approx_error_threshold=approx_error_threshold,
    )

    return {
        "ci_results": ci_results,
        "error_analyses": error_analyses,
        "counter_examples": counter_examples,
        "anomalies": anomalies,
    }
