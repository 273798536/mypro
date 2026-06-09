import math
import random
from datetime import datetime
from typing import List, Dict, Any, Callable, Tuple

from models import (
    ProcessingBatch,
    SourceData,
    CalculationResult,
    FormulaSpec,
    ConstraintCheckResult,
    ConstraintViolation,
    ConstraintStatus,
    RecordStatus,
    new_result_id,
)


DENSITY_FORMULA = FormulaSpec(
    expression="ρ = m / V",
    latex=r"\rho = \frac{m}{V}",
    description="密度计算公式：物体密度等于质量除以体积",
    applicable_range="适用于均匀固体、液体物质；温度在 0°C ~ 100°C 之间；体积测量误差 ≤ 5%",
    units="kg/m³ (千克每立方米) 或 g/cm³ (克每立方厘米)",
)

PERIOD_FORMULA = FormulaSpec(
    expression="T = 2π√(L/g)",
    latex=r"T = 2\pi\sqrt{\frac{L}{g}}",
    description="单摆周期公式：小角度近似下单摆周期",
    applicable_range="摆角 θ ≤ 5°（小角度近似）；摆长 L ≥ 0.1m；重力加速度 g ≈ 9.8 m/s²",
    units="s (秒)",
)


FORMULA_LIBRARY: Dict[str, FormulaSpec] = {
    "density": DENSITY_FORMULA,
    "period": PERIOD_FORMULA,
}


def _check_units(sources: List[SourceData]) -> Tuple[bool, List[str]]:
    missing = []
    for s in sources:
        if not s.unit:
            missing.append(f"来源数据「{s.name}」({s.source_id}) 单位缺失")
    return len(missing) == 0, missing


def _density_calc(m: float, V: float) -> float:
    return m / V


def _period_calc(L: float, g: float = 9.8) -> float:
    return 2 * math.pi * math.sqrt(L / g)


FORMULA_FN: Dict[str, Callable] = {
    "density": _density_calc,
    "period": _period_calc,
}


FORMULA_UNIT: Dict[str, str] = {
    "density": "g/cm³",
    "period": "s",
}


def monte_carlo_error(
    formula_key: str,
    sources: List[SourceData],
    n_samples: int = 10000,
    uncertainty_ratio: float = 0.01,
    seed: int = 42,
) -> Dict[str, Any]:
    random.seed(seed)
    calc_fn = FORMULA_FN[formula_key]

    nominal_values = {s.name: s.value for s in sources}
    source_names = [s.name for s in sources]
    nominal = calc_fn(**{k: nominal_values[k] for k in source_names})

    samples = []
    for _ in range(n_samples):
        perturbed = {}
        for s in sources:
            sigma = abs(s.value) * uncertainty_ratio
            perturbed[s.name] = random.gauss(s.value, sigma)
        try:
            samples.append(calc_fn(**perturbed))
        except (ValueError, ZeroDivisionError):
            continue

    if not samples:
        return {"nominal": nominal, "std": None, "ci_low": None, "ci_high": None, "samples": []}

    mean = sum(samples) / len(samples)
    variance = sum((x - mean) ** 2 for x in samples) / len(samples)
    std = math.sqrt(variance)

    sorted_samples = sorted(samples)
    ci_low = sorted_samples[int(0.025 * len(sorted_samples))]
    ci_high = sorted_samples[int(0.975 * len(sorted_samples))]

    return {
        "nominal": nominal,
        "mean": mean,
        "std": std,
        "absolute_error": std,
        "relative_error": (std / abs(nominal) * 100) if nominal != 0 else None,
        "ci_low": ci_low,
        "ci_high": ci_high,
        "n_valid": len(samples),
    }


CONSTRAINT_RULES = {
    "density": [
        {
            "name": "质量为正",
            "expr": "m > 0",
            "check": lambda srcs: next((s for s in srcs if s.name == "m"), None).value > 0,
            "expected": "m > 0",
            "message": "质量必须为正数，物理上不存在负质量",
            "actual": lambda srcs: f"m = {next((s for s in srcs if s.name == 'm'), None).value}",
        },
        {
            "name": "体积为正",
            "expr": "V > 0",
            "check": lambda srcs: next((s for s in srcs if s.name == "V"), None).value > 0,
            "expected": "V > 0",
            "message": "体积必须为正数，分母不能为零或负数",
            "actual": lambda srcs: f"V = {next((s for s in srcs if s.name == 'V'), None).value}",
        },
        {
            "name": "密度合理范围",
            "expr": "0.001 ≤ ρ ≤ 25",
            "check": lambda srcs: 0.001 <= (next((s for s in srcs if s.name == "m"), None).value / next((s for s in srcs if s.name == "V"), None).value) <= 25,
            "expected": "ρ ∈ [0.001, 25] g/cm³",
            "message": "计算得到的密度超出常见物质范围（0.001~25 g/cm³），请检查数据",
            "actual": lambda srcs: f"ρ = {next((s for s in srcs if s.name == 'm'), None).value / next((s for s in srcs if s.name == 'V'), None).value:.4f} g/cm³",
        },
    ],
    "period": [
        {
            "name": "摆长为正",
            "expr": "L > 0",
            "check": lambda srcs: next((s for s in srcs if s.name == "L"), None).value > 0,
            "expected": "L > 0",
            "message": "摆长必须为正数",
            "actual": lambda srcs: f"L = {next((s for s in srcs if s.name == 'L'), None).value}",
        },
        {
            "name": "摆长适用范围",
            "expr": "L ≥ 0.1 m",
            "check": lambda srcs: next((s for s in srcs if s.name == "L"), None).value >= 0.1,
            "expected": "L ≥ 0.1 m",
            "message": "摆长过短（< 0.1m），超出单摆公式适用范围",
            "actual": lambda srcs: f"L = {next((s for s in srcs if s.name == 'L'), None).value} m",
        },
    ],
}


def run_constraint_check(
    formula_key: str, sources: List[SourceData]
) -> ConstraintCheckResult:
    violations = []
    passed = []
    rules = CONSTRAINT_RULES.get(formula_key, [])

    for rule in rules:
        try:
            if rule["check"](sources):
                passed.append(rule["name"])
            else:
                violations.append(
                    ConstraintViolation(
                        constraint_name=rule["name"],
                        constraint_expr=rule["expr"],
                        message=rule["message"],
                        actual_value=rule["actual"](sources),
                        expected_range=rule["expected"],
                    )
                )
        except Exception as e:
            violations.append(
                ConstraintViolation(
                    constraint_name=rule["name"],
                    constraint_expr=rule["expr"],
                    message=f"约束校验异常: {str(e)}",
                    actual_value="(执行出错)",
                    expected_range=rule["expected"],
                )
            )

    status = ConstraintStatus.PASS if not violations else ConstraintStatus.FAIL
    return ConstraintCheckResult(status=status, violations=violations, passed=passed)


def process_batch(batch: ProcessingBatch, formula_key: str) -> ProcessingBatch:
    sources = batch.sources

    units_ok, unit_warnings = _check_units(sources)
    if not units_ok:
        batch.status = RecordStatus.UNIT_MISSING
        batch.note = "；".join(unit_warnings)
        batch.calculation = CalculationResult(
            result_id=new_result_id(),
            value=None,
            unit=None,
            formula=FORMULA_LIBRARY.get(formula_key, DENSITY_FORMULA),
            warnings=unit_warnings,
            error_message="单位缺失，计算中止",
        )
        batch.constraint_check = ConstraintCheckResult(
            status=ConstraintStatus.SKIPPED,
            violations=[],
            passed=[],
        )
        return batch

    mc_result = monte_carlo_error(formula_key, sources)
    formula = FORMULA_LIBRARY.get(formula_key, DENSITY_FORMULA)
    out_unit = FORMULA_UNIT.get(formula_key, "")

    warnings = []
    if mc_result.get("relative_error") and mc_result["relative_error"] > 10:
        warnings.append(
            f"相对误差较大（{mc_result['relative_error']:.2f}%），请检查原始数据精度"
        )

    batch.calculation = CalculationResult(
        result_id=new_result_id(),
        value=mc_result.get("nominal"),
        unit=out_unit,
        formula=formula,
        absolute_error=mc_result.get("absolute_error"),
        relative_error=mc_result.get("relative_error"),
        confidence_interval={
            "low": mc_result.get("ci_low"),
            "high": mc_result.get("ci_high"),
        }
        if mc_result.get("ci_low") is not None
        else None,
        monte_carlo_samples=mc_result.get("n_valid", 0),
        warnings=warnings,
    )

    constraint_result = run_constraint_check(formula_key, sources)
    batch.constraint_check = constraint_result

    if constraint_result.status == ConstraintStatus.FAIL:
        batch.status = RecordStatus.CONSTRAINT_FAILED
        fail_msgs = [v.message for v in constraint_result.violations]
        if batch.note:
            batch.note += "；" + "；".join(fail_msgs)
        else:
            batch.note = "；".join(fail_msgs)
    else:
        batch.status = RecordStatus.CALCULATED

    return batch
