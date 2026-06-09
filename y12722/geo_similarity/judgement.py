from typing import Optional, Tuple
import math

from .models import Triangle, JudgementResult


DEFAULT_TOLERANCE = 1e-4
DEFAULT_ANGLE_TOLERANCE = 0.01


def _ratio_deviation(ratios: list) -> float:
    if not ratios:
        return 0.0
    avg = sum(ratios) / len(ratios)
    if avg == 0:
        return 0.0
    return max(abs((r - avg) / avg) for r in ratios)


def judge_sss(t1: Triangle, t2: Triangle, tolerance: float = DEFAULT_TOLERANCE) -> JudgementResult:
    formula = (
        "SSS 相似判定公式：若两个三角形三组对应边成比例，即 a1/a2 = b1/b2 = c1/c2 = k (相似比 k>0)，则两三角形相似。\n"
        "计算步骤：(1) 将两三角形的边分别从小到大排序；(2) 计算三组对应边的比值；(3) 检验三组比值的相对偏差是否在容差范围内。"
    )
    scope = (
        "适用范围：已知两个三角形的三边长（单位须一致），且三边均满足三角形不等式。\n"
        "单位：边长单位由输入统一（本工具不做单位换算）。\n"
        f"容差：比值相对偏差 ≤ {tolerance:.2e} 视为比例相等。"
    )
    s1 = t1.sides()
    s2 = t2.sides()
    for s in s2:
        if s == 0:
            return JudgementResult(
                is_similar=None,
                method="SSS",
                formula=formula,
                scope=scope,
                error_reason="三角形②存在边长为 0，无法计算比值",
                error_magnitude=float("inf"),
            )
    ratios = [s1[i] / s2[i] for i in range(3)]
    deviation = _ratio_deviation(ratios)
    details = {
        "triangle_1_sides_sorted": s1,
        "triangle_2_sides_sorted": s2,
        "side_ratios": ratios,
        "ratio_relative_deviation": deviation,
        "tolerance": tolerance,
    }
    if deviation <= tolerance:
        return JudgementResult(
            is_similar=True,
            method="SSS",
            formula=formula,
            scope=scope,
            details=details,
            error_magnitude=deviation,
        )
    else:
        warning = None
        if deviation <= tolerance * 10:
            warning = f"比值偏差 {deviation:.6e} 超过容差 {tolerance:.2e}，但差距较小，建议人工复核"
        return JudgementResult(
            is_similar=False,
            method="SSS",
            formula=formula,
            scope=scope,
            details=details,
            error_reason=f"三组对应边比值的相对偏差为 {deviation:.6e}，超过容差 {tolerance:.2e}，不满足成比例条件",
            warning=warning,
            error_magnitude=deviation,
        )


def judge_sas(t1: Triangle, t2: Triangle, tolerance: float = DEFAULT_TOLERANCE,
              angle_tolerance: float = DEFAULT_ANGLE_TOLERANCE) -> JudgementResult:
    formula = (
        "SAS 相似判定公式：若两个三角形的两组对应边成比例，且这两组边的夹角相等，则两三角形相似。\n"
        "即 a1/a2 = b1/b2 = k 且 ∠C1 = ∠C2。\n"
        "计算步骤：(1) 从每个三角形中提取已给出的夹角及其两条夹边；(2) 检验夹角是否相等（角度容差）；(3) 检验两夹边比值是否一致（比例容差）。"
    )
    scope = (
        "适用范围：每个三角形至少已知一个内角及其两条夹边；两边必须是该角的夹边。\n"
        "单位：边长单位由输入统一；角度单位为度 (°)。\n"
        f"容差：比值相对偏差 ≤ {tolerance:.2e}；角度差绝对值 ≤ {angle_tolerance:.4f}°。"
    )
    a1 = t1.angles()
    a2 = t2.angles()
    if len(a1) < 1 or len(a2) < 1:
        return JudgementResult(
            is_similar=None,
            method="SAS",
            formula=formula,
            scope=scope,
            error_reason="SAS 判定需要每个三角形至少已知 1 个夹角角度",
            error_magnitude=float("inf"),
        )
    s1 = t1.sides()
    s2 = t2.sides()
    for s in s2:
        if s == 0:
            return JudgementResult(
                is_similar=None,
                method="SAS",
                formula=formula,
                scope=scope,
                error_reason="三角形②存在边长为 0，无法计算比值",
                error_magnitude=float("inf"),
            )
    angle_diff = abs(a1[0] - a2[0])
    ratios = [s1[i] / s2[i] for i in range(2)]
    ratio_dev = _ratio_deviation(ratios)
    details = {
        "triangle_1_included_angle": a1[0],
        "triangle_2_included_angle": a2[0],
        "angle_difference_deg": angle_diff,
        "triangle_1_sides_sorted": s1,
        "triangle_2_sides_sorted": s2,
        "side_ratios": ratios,
        "ratio_relative_deviation": ratio_dev,
        "tolerance": tolerance,
        "angle_tolerance": angle_tolerance,
    }
    if angle_diff > angle_tolerance:
        return JudgementResult(
            is_similar=False,
            method="SAS",
            formula=formula,
            scope=scope,
            details=details,
            error_reason=f"夹角差 {angle_diff:.6f}° 超过角度容差 {angle_tolerance:.4f}°",
            warning=f"角度差较大 ({angle_diff:.4f}°)" if angle_diff <= angle_tolerance * 10 else None,
            error_magnitude=angle_diff,
        )
    if ratio_dev > tolerance:
        warning = None
        if ratio_dev <= tolerance * 10:
            warning = f"夹边比值偏差 {ratio_dev:.6e} 超过容差但差距较小，建议人工复核"
        return JudgementResult(
            is_similar=False,
            method="SAS",
            formula=formula,
            scope=scope,
            details=details,
            error_reason=f"两夹边比值相对偏差 {ratio_dev:.6e} 超过容差 {tolerance:.2e}",
            warning=warning,
            error_magnitude=ratio_dev,
        )
    return JudgementResult(
        is_similar=True,
        method="SAS",
        formula=formula,
        scope=scope,
        details=details,
        error_magnitude=max(angle_diff, ratio_dev),
    )


def judge_aa(t1: Triangle, t2: Triangle, angle_tolerance: float = DEFAULT_ANGLE_TOLERANCE) -> JudgementResult:
    formula = (
        "AA (AAA) 相似判定公式：若两个三角形有两组对应角相等，则第三组角也必然相等（三角形内角和 180°），两三角形相似。\n"
        "即 ∠A1 = ∠A2 且 ∠B1 = ∠B2 ⇒ △1 ∽ △2。\n"
        "计算步骤：(1) 将两三角形的已知角度分别从小到大排序；(2) 对应角度逐一比较；(3) 若至少两组对应角度差在容差内则判定相似。"
    )
    scope = (
        "适用范围：每个三角形至少已知 2 个内角（或 3 个）。若仅知 1 个角无法使用 AA 判定。\n"
        "单位：角度单位为度 (°)。\n"
        f"容差：角度差绝对值 ≤ {angle_tolerance:.4f}° 视为角度相等。"
    )
    a1 = t1.angles()
    a2 = t2.angles()
    if len(a1) < 2 or len(a2) < 2:
        return JudgementResult(
            is_similar=None,
            method="AA",
            formula=formula,
            scope=scope,
            error_reason=f"AA 判定需要每个三角形至少已知 2 个角，当前△1={len(a1)}个，△2={len(a2)}个",
            error_magnitude=float("inf"),
        )
    matches = 0
    max_diff = 0.0
    paired = set()
    for ang1 in a1:
        best_j = -1
        best_diff = float("inf")
        for j, ang2 in enumerate(a2):
            if j in paired:
                continue
            diff = abs(ang1 - ang2)
            if diff < best_diff:
                best_diff = diff
                best_j = j
        if best_j >= 0 and best_diff <= angle_tolerance:
            matches += 1
            paired.add(best_j)
            max_diff = max(max_diff, best_diff)
    details = {
        "triangle_1_angles_sorted": a1,
        "triangle_2_angles_sorted": a2,
        "matched_angle_pairs": matches,
        "max_matched_angle_diff_deg": max_diff,
        "angle_tolerance": angle_tolerance,
    }
    if matches >= 2:
        return JudgementResult(
            is_similar=True,
            method="AA",
            formula=formula,
            scope=scope,
            details=details,
            error_magnitude=max_diff,
        )
    else:
        warning = None
        if matches == 1:
            warning = f"仅匹配到 {matches} 组对应角（需要 2 组），建议补充数据或用其他方法判定"
        return JudgementResult(
            is_similar=False,
            method="AA",
            formula=formula,
            scope=scope,
            details=details,
            error_reason=f"仅匹配到 {matches} 组对应角相等，不足 2 组，AA 判定不相似",
            warning=warning,
            error_magnitude=max_diff,
        )


def auto_judge(t1: Triangle, t2: Triangle, tolerance: float = DEFAULT_TOLERANCE,
               angle_tolerance: float = DEFAULT_ANGLE_TOLERANCE) -> JudgementResult:
    err_t1 = t1.validate()
    if err_t1:
        return JudgementResult(
            is_similar=None,
            method="AUTO",
            formula="自动判定：根据已知条件自动选择 SSS / SAS / AA",
            scope="需要三角形本身合法",
            error_reason=f"三角形①校验失败：{err_t1}",
            error_magnitude=float("inf"),
        )
    err_t2 = t2.validate()
    if err_t2:
        return JudgementResult(
            is_similar=None,
            method="AUTO",
            formula="自动判定：根据已知条件自动选择 SSS / SAS / AA",
            scope="需要三角形本身合法",
            error_reason=f"三角形②校验失败：{err_t2}",
            error_magnitude=float("inf"),
        )
    a1 = t1.angles()
    a2 = t2.angles()
    if len(a1) >= 2 and len(a2) >= 2:
        return judge_aa(t1, t2, angle_tolerance)
    if len(a1) >= 1 and len(a2) >= 1:
        return judge_sas(t1, t2, tolerance, angle_tolerance)
    return judge_sss(t1, t2, tolerance)
