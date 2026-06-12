import math
import random
import re
from mc_verify.models import QuestionItem, MCResult, UnitTrace, UnitStatus


def _safe_eval_formula(formula: str, variables: dict) -> float | None:
    try:
        allowed_names = {k: v for k, v in variables.items()}
        allowed_names.update({
            "sin": math.sin, "cos": math.cos, "tan": math.tan,
            "sqrt": math.sqrt, "log": math.log, "log10": math.log10,
            "exp": math.exp, "abs": abs, "pi": math.pi, "e": math.e,
            "pow": pow, "ceil": math.ceil, "floor": math.floor,
        })
        result = eval(formula, {"__builtins__": {}}, allowed_names)
        return float(result)
    except Exception:
        return None


def _extract_variables(formula: str) -> list[str]:
    pattern = re.compile(r'\b([a-zA-Z_]\w*)\b')
    reserved = {
        "sin", "cos", "tan", "sqrt", "log", "log10", "exp", "abs",
        "pi", "e", "pow", "ceil", "floor",
    }
    found = pattern.findall(formula)
    return list(dict.fromkeys(v for v in found if v not in reserved))


def simulate(
    item: QuestionItem,
    sample_count: int = 10000,
    seed: int = 42,
    tolerance: float = 0.05,
    variable_ranges: dict | None = None,
) -> MCResult:
    rng = random.Random(seed)
    formula = item.formula
    variables = _extract_variables(formula)

    default_range = (0.9, 1.1)
    var_ranges = {}
    for v in variables:
        if variable_ranges and v in variable_ranges:
            var_ranges[v] = variable_ranges[v]
        else:
            var_ranges[v] = default_range

    samples = []
    for _ in range(sample_count):
        var_vals = {}
        for v in variables:
            lo, hi = var_ranges[v]
            var_vals[v] = rng.uniform(lo, hi)
        result = _safe_eval_formula(formula, var_vals)
        if result is not None and math.isfinite(result):
            samples.append(result)

    if not samples:
        return MCResult(
            question_id=item.question_id,
            sample_count=0,
            seed=seed,
            anomalies=["仿真采样全部失败，公式可能无法求值"],
            unit_trace=item.unit_trace,
        )

    mc_mean = sum(samples) / len(samples)
    mc_std = (sum((x - mc_mean) ** 2 for x in samples) / len(samples)) ** 0.5
    mc_error = mc_std / (len(samples) ** 0.5) if len(samples) > 1 else 0.0

    relative_error = 0.0
    anomalies = []
    if item.expected_value is not None and item.expected_value != 0:
        relative_error = abs(mc_mean - item.expected_value) / abs(item.expected_value)
        if relative_error > tolerance:
            anomalies.append(
                f"相对误差 {relative_error:.4%} 超过容限 {tolerance:.4%}，"
                f"MC均值={mc_mean:.6f}，期望值={item.expected_value}"
            )

    if item.unit_trace and item.unit_trace.status != UnitStatus.OK:
        status_name = item.unit_trace.status.value
        anomalies.append(
            f"单位状态 [{status_name}]: {item.unit_trace.detail} "
            f"(来源字段: '{item.unit_trace.original_field}')"
        )

    extreme_count = sum(1 for x in samples if abs(x - mc_mean) > 3 * mc_std) if mc_std > 0 else 0
    if extreme_count > sample_count * 0.01:
        anomalies.append(
            f"异常值偏多: {extreme_count} 个采样点偏离均值超过3σ (占比 {extreme_count/sample_count:.2%})"
        )

    return MCResult(
        question_id=item.question_id,
        mc_mean=mc_mean,
        mc_std=mc_std,
        mc_error=mc_error,
        relative_error=relative_error,
        sample_count=len(samples),
        seed=seed,
        anomalies=anomalies,
        unit_trace=item.unit_trace,
    )
