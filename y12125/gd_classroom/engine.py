import math
import numpy as np
from dataclasses import dataclass, field
from typing import List, Optional, Tuple, Dict, Any


@dataclass
class Step:
    iteration: int
    point: List[float]
    loss: float
    gradient: List[float]
    grad_norm: float


@dataclass
class Diagnosis:
    status: str
    issues: List[str] = field(default_factory=list)
    suggestions: List[str] = field(default_factory=list)
    converged_at: Optional[int] = None
    diverged_at: Optional[int] = None


@dataclass
class SimulationResult:
    name: str
    loss_expr: str
    learning_rate: float
    initial_point: List[float]
    max_iterations: int
    tolerance: float
    steps: List[Step] = field(default_factory=list)
    diagnosis: Diagnosis = field(default_factory=lambda: Diagnosis(status="unknown"))
    surface_bounds: Tuple[float, float, float, float] = (-5.0, 5.0, -5.0, 5.0)
    resolution: int = 200


class LossFunction:
    def __init__(self, expr: str, var_names: Optional[List[str]] = None):
        self.expr = expr.strip()
        self.var_names = var_names or self._detect_vars()
        self._compiled = compile(self.expr, "<loss>", "eval")
        self._safe_globals = {
            "__builtins__": {},
            "abs": abs, "sqrt": math.sqrt, "sin": math.sin, "cos": math.cos,
            "exp": math.exp, "log": math.log, "pi": math.pi, "e": math.e,
            "pow": pow, "min": min, "max": max,
        }

    def _detect_vars(self) -> List[str]:
        import re
        found = sorted(set(re.findall(r'\b([xyzwuv])\b', self.expr)))
        if not found:
            found = ["x"]
        return found

    def evaluate(self, point: List[float]) -> float:
        local = dict(zip(self.var_names, point))
        return float(eval(self._compiled, self._safe_globals, local))

    def gradient(self, point: List[float], eps: float = 1e-7) -> List[float]:
        grad = []
        for i in range(len(self.var_names)):
            p_plus = list(point)
            p_minus = list(point)
            p_plus[i] += eps
            p_minus[i] -= eps
            grad.append((self.evaluate(p_plus) - self.evaluate(p_minus)) / (2 * eps))
        return grad


def _check_bounds(point: List[float], bounds: Tuple[float, float, float, float], dim: int) -> bool:
    if dim == 1:
        return bounds[0] <= point[0] <= bounds[1]
    return (bounds[0] <= point[0] <= bounds[1] and
            bounds[2] <= point[1] <= bounds[3])


def _detect_oscillation(steps: List[Step], window: int = 10) -> bool:
    if len(steps) < 2 * window:
        return False
    recent = steps[-window:]
    earlier = steps[-2 * window:-window]
    recent_avg = sum(s.loss for s in recent) / len(recent)
    earlier_avg = sum(s.loss for s in earlier) / len(earlier)
    return abs(recent_avg - earlier_avg) < 1e-6 and recent_avg > 1e-3


def _detect_flatness(steps: List[Step], threshold: float = 1e-6, window: int = 5) -> bool:
    if len(steps) < window:
        return False
    recent = steps[-window:]
    avg_norm = sum(s.grad_norm for s in recent) / len(recent)
    return avg_norm < threshold and recent[-1].loss > 1e-3


def simulate(
    loss_expr: str,
    learning_rate: float,
    initial_point: List[float],
    max_iterations: int = 200,
    tolerance: float = 1e-6,
    name: str = "untitled",
    bounds: Optional[Tuple[float, float, float, float]] = None,
    resolution: int = 200,
) -> SimulationResult:
    loss_fn = LossFunction(loss_expr)
    dim = len(loss_fn.var_names)
    if len(initial_point) != dim:
        raise ValueError(
            f"损失函数需要 {dim} 个变量 {loss_fn.var_names}，但初始点给了 {len(initial_point)} 个分量"
        )

    if bounds is None:
        if dim == 1:
            bounds = (-5.0, 5.0, -5.0, 5.0)
        else:
            margin_x = max(abs(initial_point[0]) * 2, 5.0)
            margin_y = max(abs(initial_point[1]) * 2, 5.0) if dim >= 2 else 5.0
            bounds = (-margin_x, margin_x, -margin_y, margin_y)

    if not _check_bounds(initial_point, bounds, dim):
        raise ValueError(
            f"初始点 {initial_point} 越界：可视化范围 x∈[{bounds[0]},{bounds[1]}]"
            + (f", y∈[{bounds[2]},{bounds[3]}]" if dim >= 2 else "")
        )

    result = SimulationResult(
        name=name,
        loss_expr=loss_expr,
        learning_rate=learning_rate,
        initial_point=list(initial_point),
        max_iterations=max_iterations,
        tolerance=tolerance,
        surface_bounds=bounds,
        resolution=resolution,
    )

    point = list(initial_point)
    diagnosis = Diagnosis(status="running")

    for i in range(max_iterations):
        try:
            loss = loss_fn.evaluate(point)
        except (ValueError, OverflowError) as exc:
            diagnosis.status = "diverged"
            diagnosis.diverged_at = i
            diagnosis.issues.append(f"第 {i} 步损失值溢出：{exc}")
            diagnosis.suggestions.append("学习率过大导致发散，请尝试将学习率缩小 10 倍")
            break

        grad = loss_fn.gradient(point)
        grad_norm = math.sqrt(sum(g * g for g in grad))

        step = Step(
            iteration=i,
            point=list(point),
            loss=loss,
            gradient=grad,
            grad_norm=grad_norm,
        )
        result.steps.append(step)

        if grad_norm < tolerance:
            diagnosis.status = "converged"
            diagnosis.converged_at = i
            break

        if not math.isfinite(loss) or not math.isfinite(grad_norm):
            diagnosis.status = "diverged"
            diagnosis.diverged_at = i
            diagnosis.issues.append(f"第 {i} 步出现非有限值 (loss={loss}, |∇|={grad_norm})")
            diagnosis.suggestions.append("学习率过大导致发散，请尝试将学习率缩小 10 倍")
            break

        if not _check_bounds(point, bounds, dim):
            diagnosis.status = "diverged"
            diagnosis.diverged_at = i
            diagnosis.issues.append(f"第 {i} 步迭代点越界：{point}")
            diagnosis.suggestions.append("学习率过大导致迭代点飞出可视化区域，请缩小学习率或扩大可视化范围")
            break

        if i > 0 and abs(result.steps[-1].loss - result.steps[-2].loss) > 1e6:
            diagnosis.status = "diverged"
            diagnosis.diverged_at = i
            diagnosis.issues.append(f"第 {i} 步损失值暴增 (Δloss={abs(result.steps[-1].loss - result.steps[-2].loss):.2e})")
            diagnosis.suggestions.append("学习率过大，损失值在单步内暴增。请将学习率缩小 10 倍后重试")
            break

        point = [p - learning_rate * g for p, g in zip(point, grad)]

    if diagnosis.status == "running":
        if _detect_oscillation(result.steps):
            diagnosis.status = "oscillating"
            diagnosis.issues.append("损失值在迭代后期反复震荡，未持续下降")
            diagnosis.suggestions.append("学习率可能偏大，尝试缩小到当前值的 1/3 ~ 1/5")
        elif _detect_flatness(result.steps):
            diagnosis.status = "flat"
            diagnosis.issues.append("梯度接近零但损失值不为零，可能陷入局部平坦区或鞍点")
            diagnosis.suggestions.append("初始点可能落在平坦区，尝试更换初始点或使用动量法/Adam 等自适应方法")
        else:
            diagnosis.status = "max_iter"
            diagnosis.issues.append(f"达到最大迭代次数 {max_iterations}，尚未收敛")
            diagnosis.suggestions.append("可尝试增大 max_iterations 或适当增大学习率")

    if dim == 1:
        first_step = result.steps[0] if result.steps else None
        if first_step and abs(first_step.grad_norm) > 0 and learning_rate * first_step.grad_norm > (bounds[1] - bounds[0]):
            diagnosis.issues.insert(0, "⚠ 第一步步长已超过可视化范围，学习率极可能过大")
            if "学习率过大" not in " ".join(diagnosis.suggestions):
                diagnosis.suggestions.insert(0, "学习率过大，请将学习率缩小 10 倍后重试")

    result.diagnosis = diagnosis
    return result


def compute_surface(
    loss_fn: LossFunction,
    bounds: Tuple[float, float, float, float],
    resolution: int = 200,
) -> Dict[str, Any]:
    dim = len(loss_fn.var_names)
    if dim == 1:
        xs = np.linspace(bounds[0], bounds[1], resolution)
        zs = []
        for x in xs:
            try:
                zs.append(loss_fn.evaluate([float(x)]))
            except (ValueError, OverflowError):
                zs.append(float("nan"))
        return {"dim": 1, "xs": xs.tolist(), "zs": zs}
    else:
        xs = np.linspace(bounds[0], bounds[1], resolution)
        ys = np.linspace(bounds[2], bounds[3], resolution)
        zs = []
        for y_val in ys:
            row = []
            for x_val in xs:
                try:
                    row.append(loss_fn.evaluate([float(x_val), float(y_val)]))
                except (ValueError, OverflowError):
                    row.append(float("nan"))
            zs.append(row)
        return {"dim": 2, "xs": xs.tolist(), "ys": ys.tolist(), "zs": zs}
