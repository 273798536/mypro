from dataclasses import dataclass, field
from typing import Optional, Tuple
import numpy as np
from scipy import stats


VALID_PARAM_RANGES = {
    "p1": (0.001, 0.999),
    "p2": (0.001, 0.999),
    "delta": (-10.0, 10.0),
    "sd": (0.001, 100.0),
    "alpha": (0.001, 0.2),
    "power": (0.5, 0.999),
    "n1": (1, 100000),
    "n2": (1, 100000),
}


def _check_extrapolation(param_name: str, value: float) -> str:
    if param_name not in VALID_PARAM_RANGES:
        return ""
    lo, hi = VALID_PARAM_RANGES[param_name]
    if value < lo:
        return f"{param_name}={value} 低于推荐下限 {lo}，属于外推越界，结果需谨慎解读"
    if value > hi:
        return f"{param_name}={value} 高于推荐上限 {hi}，属于外推越界，结果需谨慎解读"
    return ""


@dataclass
class PowerResult:
    sample_size: Optional[float]
    power: Optional[float]
    effect_size: float
    alpha: float
    test_type: str
    alternative: str
    n1: Optional[float] = None
    n2: Optional[float] = None
    notes: list = field(default_factory=list)
    warnings: list = field(default_factory=list)


def normal_quantile(p: float) -> float:
    return stats.norm.ppf(p)


def cohen_h(p1: float, p2: float) -> float:
    return 2 * (np.arcsin(np.sqrt(p1)) - np.arcsin(np.sqrt(p2)))


def cohen_d(m1: float, m2: float, pooled_sd: float) -> float:
    if pooled_sd <= 0:
        return 0.0
    return (m1 - m2) / pooled_sd


def sample_size_proportion(
    p1: float,
    p2: float,
    alpha: float = 0.05,
    power: float = 0.8,
    alternative: str = "two-sided",
    allocation_ratio: float = 1.0,
) -> PowerResult:
    notes = []
    warnings = []

    if not (0 < p1 < 1 and 0 < p2 < 1):
        warnings.append("比例 p1 或 p2 越界（需在 0 到 1 之间）")
    else:
        for pname, pval in (("p1", p1), ("p2", p2), ("alpha", alpha), ("power", power)):
            ew = _check_extrapolation(pname, pval)
            if ew:
                warnings.append(ew)
    if p1 == p2:
        warnings.append("p1 与 p2 相等，效应量为 0，样本量将发散")
    if not (0 < alpha < 1):
        raise ValueError("alpha 必须在 (0,1) 之间")
    if not (0 < power < 1):
        raise ValueError("power 必须在 (0,1) 之间")

    h = cohen_h(p1, p2)
    if alternative == "two-sided":
        z_alpha = normal_quantile(1 - alpha / 2)
    else:
        z_alpha = normal_quantile(1 - alpha)
    z_beta = normal_quantile(power)

    denom = h ** 2
    if denom < 1e-12:
        n = float("inf")
        warnings.append("效应量过小，样本量不可计算（视为无穷大）")
    else:
        n = ((z_alpha + z_beta) ** 2) * (1 + 1 / allocation_ratio) / denom

    n1 = n
    n2 = n * allocation_ratio

    notes.append(f"效应量 h = {h:.4f}（Cohen's h）")
    if alternative == "two-sided":
        notes.append("双侧检验")
    else:
        notes.append("单侧检验")

    return PowerResult(
        sample_size=n,
        power=power,
        effect_size=h,
        alpha=alpha,
        test_type="proportion",
        alternative=alternative,
        n1=n1,
        n2=n2,
        notes=notes,
        warnings=warnings,
    )


def power_proportion(
    p1: float,
    p2: float,
    n1: int,
    n2: Optional[int] = None,
    alpha: float = 0.05,
    alternative: str = "two-sided",
) -> PowerResult:
    notes = []
    warnings = []
    if n2 is None:
        n2 = n1
    if n1 <= 0 or n2 <= 0:
        raise ValueError("样本量必须为正整数")
    if not (0 < alpha < 1):
        raise ValueError("alpha 必须在 (0,1) 之间")
    if not (0 < p1 < 1 and 0 < p2 < 1):
        warnings.append("比例 p1 或 p2 越界（需在 0 到 1 之间）")
    else:
        for pname, pval in (("p1", p1), ("p2", p2), ("alpha", alpha), ("n1", n1), ("n2", n2)):
            ew = _check_extrapolation(pname, float(pval))
            if ew:
                warnings.append(ew)

    h = cohen_h(p1, p2)
    if alternative == "two-sided":
        z_alpha = normal_quantile(1 - alpha / 2)
    else:
        z_alpha = normal_quantile(1 - alpha)

    lambda_ = h * np.sqrt(1 / (1 / n1 + 1 / n2))
    power_val = 1 - stats.norm.cdf(z_alpha - lambda_)
    if alternative == "two-sided":
        power_val += stats.norm.cdf(-z_alpha - lambda_)

    notes.append(f"效应量 h = {h:.4f}")
    return PowerResult(
        sample_size=None,
        power=float(power_val),
        effect_size=h,
        alpha=alpha,
        test_type="proportion",
        alternative=alternative,
        n1=n1,
        n2=n2,
        notes=notes,
        warnings=warnings,
    )


def sample_size_mean(
    delta: float,
    sd: float,
    alpha: float = 0.05,
    power: float = 0.8,
    alternative: str = "two-sided",
    allocation_ratio: float = 1.0,
) -> PowerResult:
    notes = []
    warnings = []
    if sd <= 0:
        warnings.append("标准差 sd 必须为正数")
    if not (0 < alpha < 1):
        raise ValueError("alpha 必须在 (0,1) 之间")
    if not (0 < power < 1):
        raise ValueError("power 必须在 (0,1) 之间")
    for pname, pval in (("delta", delta), ("sd", sd), ("alpha", alpha), ("power", power)):
        ew = _check_extrapolation(pname, float(pval))
        if ew:
            warnings.append(ew)

    d = delta / sd if sd > 0 else float("inf")
    if alternative == "two-sided":
        z_alpha = normal_quantile(1 - alpha / 2)
    else:
        z_alpha = normal_quantile(1 - alpha)
    z_beta = normal_quantile(power)

    if abs(d) < 1e-12:
        n = float("inf")
        warnings.append("效应量 d 为 0，样本量不可计算")
    else:
        n = ((z_alpha + z_beta) ** 2) * (1 + 1 / allocation_ratio) / (d ** 2)

    notes.append(f"效应量 d = {d:.4f}（Cohen's d）")
    return PowerResult(
        sample_size=n,
        power=power,
        effect_size=d,
        alpha=alpha,
        test_type="mean",
        alternative=alternative,
        n1=n,
        n2=n * allocation_ratio,
        notes=notes,
        warnings=warnings,
    )


def power_mean(
    delta: float,
    sd: float,
    n1: int,
    n2: Optional[int] = None,
    alpha: float = 0.05,
    alternative: str = "two-sided",
) -> PowerResult:
    notes = []
    warnings = []
    if n2 is None:
        n2 = n1
    if n1 <= 0 or n2 <= 0:
        raise ValueError("样本量必须为正整数")
    if sd <= 0:
        raise ValueError("标准差必须为正数")
    if not (0 < alpha < 1):
        raise ValueError("alpha 必须在 (0,1) 之间")
    for pname, pval in (("delta", delta), ("sd", sd), ("alpha", alpha), ("n1", n1), ("n2", n2)):
        ew = _check_extrapolation(pname, float(pval))
        if ew:
            warnings.append(ew)

    d = delta / sd
    if alternative == "two-sided":
        z_alpha = normal_quantile(1 - alpha / 2)
    else:
        z_alpha = normal_quantile(1 - alpha)

    lambda_ = d * np.sqrt(1 / (1 / n1 + 1 / n2))
    power_val = 1 - stats.norm.cdf(z_alpha - lambda_)
    if alternative == "two-sided":
        power_val += stats.norm.cdf(-z_alpha - lambda_)

    notes.append(f"效应量 d = {d:.4f}")
    return PowerResult(
        sample_size=None,
        power=float(power_val),
        effect_size=d,
        alpha=alpha,
        test_type="mean",
        alternative=alternative,
        n1=n1,
        n2=n2,
        notes=notes,
        warnings=warnings,
    )


def generate_power_curve_data(
    test_type: str,
    param_grid: dict,
    fixed_params: dict,
) -> Tuple[np.ndarray, np.ndarray, dict]:
    if test_type == "proportion":
        p1 = fixed_params.get("p1", 0.5)
        p2_range = param_grid.get("p2", np.linspace(0.3, 0.7, 50))
        n_range = param_grid.get("n", [30, 50, 100, 200])
        curves = {}
        for n in n_range:
            powers = []
            for p2 in p2_range:
                r = power_proportion(p1=p1, p2=p2, n1=n, alpha=fixed_params.get("alpha", 0.05),
                                     alternative=fixed_params.get("alternative", "two-sided"))
                powers.append(r.power)
            curves[f"n={n}"] = np.array(powers)
        return p2_range, curves, {"xlabel": "p2 (对照组比例)", "ylabel": "Power (功效)"}
    else:
        delta_range = param_grid.get("delta", np.linspace(-1, 1, 50))
        sd = fixed_params.get("sd", 1.0)
        n_range = param_grid.get("n", [30, 50, 100, 200])
        curves = {}
        for n in n_range:
            powers = []
            for delta in delta_range:
                r = power_mean(delta=delta, sd=sd, n1=n, alpha=fixed_params.get("alpha", 0.05),
                               alternative=fixed_params.get("alternative", "two-sided"))
                powers.append(r.power)
            curves[f"n={n}"] = np.array(powers)
        return delta_range, curves, {"xlabel": "delta (均值差)", "ylabel": "Power (功效)"}
