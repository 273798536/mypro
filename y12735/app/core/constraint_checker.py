from __future__ import annotations

from app.models import ConstraintViolation, FitConstraint, FitResult


def check_constraints(fit_result: FitResult, constraints: list[FitConstraint]) -> list[ConstraintViolation]:
    violations: list[ConstraintViolation] = []

    name_to_idx = {name: i for i, name in enumerate(fit_result.param_names)}

    for c in constraints:
        if c.param_name not in name_to_idx:
            continue
        idx = name_to_idx[c.param_name]
        actual = fit_result.params[idx]

        if c.lower is not None and actual < c.lower:
            short = f"约束违反：{c.param_name}={actual:.4g} < 下限 {c.lower:.4g}"
            detailed = (
                f"拟合参数【{c.param_name}】的计算值为 {actual:.6g}，"
                f"低于预设下限 {c.lower:.6g}（差值 {actual - c.lower:.4g}）。"
                f"{c.description or ''} 出现该情况通常意味着：样本覆盖范围不足、"
                f"存在异常高杠杆点、或原始计算草稿对应页的数据存在录入错误。"
            )
            violations.append(
                ConstraintViolation(
                    constraint=c,
                    actual_value=actual,
                    short_explanation=short,
                    detailed_explanation=detailed,
                )
            )
        elif c.upper is not None and actual > c.upper:
            short = f"约束违反：{c.param_name}={actual:.4g} > 上限 {c.upper:.4g}"
            detailed = (
                f"拟合参数【{c.param_name}】的计算值为 {actual:.6g}，"
                f"高于预设上限 {c.upper:.6g}（差值 {actual - c.upper:.4g}）。"
                f"{c.description or ''} 请检查计算草稿该参数的物理意义、单位换算及是否存在缺页。"
            )
            violations.append(
                ConstraintViolation(
                    constraint=c,
                    actual_value=actual,
                    short_explanation=short,
                    detailed_explanation=detailed,
                )
            )

    return violations
