import numpy as np
from typing import Callable, Tuple, Dict, Optional, List
from dataclasses import dataclass, field
from enum import Enum
from core import (
    trapezoidal_rule, simpsons_rule, compute_step_size,
    check_interval_contains_singularity, check_interval_reversed,
    check_step_size_too_large
)


class ErrorStatus(str, Enum):
    OK = "正常"
    SINGULARITY = "待确认-奇点附近"
    INTERVAL_REVERSED = "待确认-区间反向"
    STEP_TOO_LARGE = "待确认-步长过大"
    MULTIPLE_ISSUES = "待确认-多重问题"


class ReviewAction(str, Enum):
    NONE = "无需复核"
    CHECK_SINGULARITY = "请数值分析老师核奇点处理方案"
    CHECK_INTERVAL = "请授课老师核区间端点录入"
    CHECK_STEP = "请助教核步长选取合理性"
    CHECK_ALL = "请先核问题类型再分配"


@dataclass
class ErrorEstimate:
    status: ErrorStatus
    action: ReviewAction
    trapezoidal_approx: float
    simpsons_approx: float
    exact_value: Optional[float] = None
    trapezoidal_error: Optional[float] = None
    simpsons_error: Optional[float] = None
    trapezoidal_relative_error: Optional[float] = None
    simpsons_relative_error: Optional[float] = None
    step_size: float = 0.0
    n_intervals: int = 0
    has_singularity: bool = False
    singularity_points: List[float] = field(default_factory=list)
    is_interval_reversed: bool = False
    is_step_too_large: bool = False
    step_ratio: float = 0.0
    notes: List[str] = field(default_factory=list)
    trapezoidal_theoretical_bound: Optional[float] = None
    simpsons_theoretical_bound: Optional[float] = None


def estimate_trapezoidal_error_bound(f_double_prime_max: float, a: float, b: float, n: int) -> float:
    h = compute_step_size(a, b, n)
    return (abs(b - a) / 12) * (h ** 2) * f_double_prime_max


def estimate_simpsons_error_bound(f_fourth_prime_max: float, a: float, b: float, n: int) -> float:
    if n % 2 != 0:
        n += 1
    h = compute_step_size(a, b, n)
    return (abs(b - a) / 180) * (h ** 4) * f_fourth_prime_max


def compute_actual_errors(approx: float, exact: float) -> Tuple[float, float]:
    absolute_error = abs(approx - exact)
    relative_error = absolute_error / abs(exact) if exact != 0 else float('inf')
    return absolute_error, relative_error


def determine_status_and_action(
    has_singularity: bool,
    is_interval_reversed: bool,
    is_step_too_large: bool
) -> Tuple[ErrorStatus, ReviewAction]:
    issues = []
    if has_singularity:
        issues.append('singularity')
    if is_interval_reversed:
        issues.append('interval')
    if is_step_too_large:
        issues.append('step')
    
    if len(issues) == 0:
        return ErrorStatus.OK, ReviewAction.NONE
    elif len(issues) > 1:
        return ErrorStatus.MULTIPLE_ISSUES, ReviewAction.CHECK_ALL
    elif has_singularity:
        return ErrorStatus.SINGULARITY, ReviewAction.CHECK_SINGULARITY
    elif is_interval_reversed:
        return ErrorStatus.INTERVAL_REVERSED, ReviewAction.CHECK_INTERVAL
    else:
        return ErrorStatus.STEP_TOO_LARGE, ReviewAction.CHECK_STEP


def perform_error_analysis(
    f: Callable[[float], float],
    a: float,
    b: float,
    n: int,
    exact_value: Optional[float] = None,
    f_double_prime_max: Optional[float] = None,
    f_fourth_prime_max: Optional[float] = None
) -> ErrorEstimate:
    notes = []
    
    has_singularity, singularity_points = check_interval_contains_singularity(f, a, b)
    if has_singularity:
        notes.append(f"检测到奇点: {singularity_points}")
    
    is_interval_reversed = check_interval_reversed(a, b)
    if is_interval_reversed:
        notes.append(f"区间反向: a={a} > b={b}")
    
    is_step_too_large, step_ratio = check_step_size_too_large(a, b, n, f)
    if is_step_too_large:
        notes.append(f"步长过大: h/L = {step_ratio:.4f}")
    
    status, action = determine_status_and_action(has_singularity, is_interval_reversed, is_step_too_large)
    
    h = compute_step_size(a, b, n)
    
    try:
        trap_approx, _, _ = trapezoidal_rule(f, a, b, n)
    except Exception as e:
        trap_approx = float('nan')
        notes.append(f"梯形公式计算失败: {str(e)}")
    
    try:
        simp_approx, _, _ = simpsons_rule(f, a, b, n)
    except Exception as e:
        simp_approx = float('nan')
        notes.append(f"辛普森公式计算失败: {str(e)}")
    
    trap_error = None
    simp_error = None
    trap_rel_error = None
    simp_rel_error = None
    
    if exact_value is not None and not np.isnan(trap_approx):
        trap_error, trap_rel_error = compute_actual_errors(trap_approx, exact_value)
    if exact_value is not None and not np.isnan(simp_approx):
        simp_error, simp_rel_error = compute_actual_errors(simp_approx, exact_value)
    
    trap_bound = None
    simp_bound = None
    
    if f_double_prime_max is not None:
        trap_bound = estimate_trapezoidal_error_bound(f_double_prime_max, a, b, n)
    if f_fourth_prime_max is not None:
        simp_bound = estimate_simpsons_error_bound(f_fourth_prime_max, a, b, n)
    
    return ErrorEstimate(
        status=status,
        action=action,
        trapezoidal_approx=trap_approx,
        simpsons_approx=simp_approx,
        exact_value=exact_value,
        trapezoidal_error=trap_error,
        simpsons_error=simp_error,
        trapezoidal_relative_error=trap_rel_error,
        simpsons_relative_error=simp_rel_error,
        step_size=h,
        n_intervals=n,
        has_singularity=has_singularity,
        singularity_points=singularity_points,
        is_interval_reversed=is_interval_reversed,
        is_step_too_large=is_step_too_large,
        step_ratio=step_ratio,
        notes=notes,
        trapezoidal_theoretical_bound=trap_bound,
        simpsons_theoretical_bound=simp_bound
    )


def analyze_step_convergence(
    f: Callable[[float], float],
    a: float,
    b: float,
    n_values: List[int],
    exact_value: Optional[float] = None
) -> Dict[int, ErrorEstimate]:
    results = {}
    for n in n_values:
        results[n] = perform_error_analysis(f, a, b, n, exact_value)
    return results
