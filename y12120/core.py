import numpy as np
from typing import Callable, Tuple, List, Optional


def trapezoidal_rule(f: Callable[[float], float], a: float, b: float, n: int) -> Tuple[float, np.ndarray, np.ndarray]:
    h = (b - a) / n
    x = np.linspace(a, b, n + 1)
    y = f(x)
    integral = h * (0.5 * y[0] + np.sum(y[1:-1]) + 0.5 * y[-1])
    return integral, x, y


def simpsons_rule(f: Callable[[float], float], a: float, b: float, n: int) -> Tuple[float, np.ndarray, np.ndarray]:
    if n % 2 != 0:
        n += 1
    h = (b - a) / n
    x = np.linspace(a, b, n + 1)
    y = f(x)
    integral = (h / 3) * (y[0] + 4 * np.sum(y[1:-1:2]) + 2 * np.sum(y[2:-2:2]) + y[-1])
    return integral, x, y


def compute_step_size(a: float, b: float, n: int) -> float:
    return abs(b - a) / n


def generate_function_from_expr(expr_str: str) -> Callable[[float], float]:
    import sympy as sp
    x_sym = sp.Symbol('x')
    expr = sp.sympify(expr_str)
    f_lambda = sp.lambdify(x_sym, expr, modules=['numpy', 'sympy'])
    return f_lambda, expr


def evaluate_function_safely(f: Callable[[float], float], x: float) -> Tuple[float, bool]:
    try:
        val = float(f(x))
        if np.isnan(val) or np.isinf(val):
            return val, False
        return val, True
    except (ZeroDivisionError, ValueError, OverflowError):
        return np.nan, False


def check_interval_contains_singularity(f: Callable[[float], float], a: float, b: float, n_check: int = 200) -> Tuple[bool, List[float]]:
    x_check = np.linspace(a, b, n_check)
    singularities = []
    for xi in x_check:
        _, valid = evaluate_function_safely(f, xi)
        if not valid:
            singularities.append(float(xi))
    has_singularity = len(singularities) > 0
    return has_singularity, singularities


def check_interval_reversed(a: float, b: float) -> bool:
    return a > b


def check_step_size_too_large(a: float, b: float, n: int, f: Optional[Callable[[float], float]] = None, threshold_ratio: float = 0.1) -> Tuple[bool, float]:
    h = compute_step_size(a, b, n)
    interval_length = abs(b - a)
    ratio = h / interval_length if interval_length > 0 else 0
    too_large = ratio > threshold_ratio
    
    if f is not None and not too_large:
        try:
            x_sample = np.linspace(a, b, min(1000, n * 10 + 1))
            y_sample = f(x_sample)
            y_valid = y_sample[np.isfinite(y_sample)]
            if len(y_valid) >= 2:
                y_range = np.max(y_valid) - np.min(y_valid)
                if y_range > 0:
                    dy = np.abs(np.diff(y_valid))
                    max_dy = np.max(dy)
                    if max_dy / y_range > 0.5 and n < 20:
                        too_large = True
        except:
            pass
    
    return too_large, ratio
