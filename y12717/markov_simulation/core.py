"""马尔可夫链核心计算引擎

设计原则：
1. 每次计算都留下可追溯的"参数快照 + 处理意见"；
2. 批量处理时，单个样例失败不影响其余样例，失败项独立记录；
3. 稳态、n 步转移、模拟路径共用一套底层矩阵运算，确保图、表、文一致。
"""

from __future__ import annotations

import copy
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, Sequence, Tuple, Union

import numpy as np

from .exceptions import (
    ConvergenceWarning,
    EmptyStateError,
    InvalidTransitionMatrixError,
    NonStochasticMatrixError,
    StateNotFoundError,
)

Number = Union[int, float]


@dataclass
class AuditTrail:
    """审计追踪 —— 每一次运算都有完整的参数表和处理意见"""

    operation: str
    params: Dict[str, Any]
    started_at: datetime = field(default_factory=datetime.now)
    finished_at: Optional[datetime] = None
    warning: Optional[str] = None
    suggestion: Optional[str] = None

    def finish(self, warning: Optional[str] = None, suggestion: Optional[str] = None) -> None:
        self.finished_at = datetime.now()
        self.warning = warning
        self.suggestion = suggestion


class MarkovChain:
    """离散时间马尔可夫链

    Parameters
    ----------
    states : Sequence[str]
        状态名称列表，长度 N
    transition_matrix : Sequence[Sequence[Number]]
        N×N 转移概率矩阵，每行和为 1
    initial_dist : Optional[Dict[str, Number]]
        初始分布，键为状态名，缺省时按均匀分布
    label : str
        该马尔可夫链的业务标签（用于报告、批量区分）
    tolerance : float
        行和校验容差，默认 1e-6
    """

    def __init__(
        self,
        states: Sequence[str],
        transition_matrix: Sequence[Sequence[Number]],
        initial_dist: Optional[Dict[str, Number]] = None,
        label: str = "未命名模型",
        tolerance: float = 1e-6,
    ) -> None:
        self._id = uuid.uuid4().hex[:8]
        self.label = label
        self.created_at = datetime.now()
        self.audit_trails: List[AuditTrail] = []

        states = list(states)
        if not states:
            raise EmptyStateError(context={"label": label})

        self.states: List[str] = states
        self.n_states = len(states)
        self.state_index = {s: i for i, s in enumerate(states)}

        P = np.asarray(transition_matrix, dtype=float)
        if P.shape != (self.n_states, self.n_states):
            raise InvalidTransitionMatrixError(
                n_states=self.n_states,
                matrix_shape=tuple(P.shape),
                context={"label": label, "states": states},
            )

        for i in range(self.n_states):
            row_sum = float(P[i, :].sum())
            if abs(row_sum - 1.0) > tolerance:
                raise NonStochasticMatrixError(
                    row_index=i,
                    row_sum=row_sum,
                    tolerance=tolerance,
                    context={
                        "label": label,
                        "state": states[i],
                        "row_values": P[i, :].tolist(),
                    },
                )

        self.P = P

        if initial_dist is None:
            self.initial_dist = np.ones(self.n_states) / self.n_states
        else:
            vec = np.zeros(self.n_states)
            for s, p in initial_dist.items():
                if s not in self.state_index:
                    raise StateNotFoundError(
                        state_name=s,
                        available_states=list(states),
                        context={"label": label, "initial_dist": initial_dist},
                    )
                vec[self.state_index[s]] = p
            total = vec.sum()
            if total <= 0:
                self.initial_dist = np.ones(self.n_states) / self.n_states
            else:
                self.initial_dist = vec / total

    # ------------------------------------------------------------------
    # 基础运算
    # ------------------------------------------------------------------
    def step_transition(self, n: int = 1) -> np.ndarray:
        """n 步转移矩阵 P^n"""
        trail = AuditTrail(operation="step_transition", params={"n": n})
        result = np.linalg.matrix_power(self.P, n)
        trail.finish()
        self.audit_trails.append(trail)
        return result

    def distribution_at(self, n: int) -> np.ndarray:
        """第 n 步的状态分布 π(n) = π(0) · P^n"""
        trail = AuditTrail(operation="distribution_at", params={"n": n})
        Pn = np.linalg.matrix_power(self.P, n)
        dist = self.initial_dist @ Pn
        trail.finish()
        self.audit_trails.append(trail)
        return dist

    def distribution_series(self, steps: int) -> np.ndarray:
        """返回 steps+1 个分布：π(0), π(1), ..., π(steps)"""
        trail = AuditTrail(
            operation="distribution_series", params={"steps": steps}
        )
        series = np.zeros((steps + 1, self.n_states))
        series[0] = self.initial_dist
        for t in range(1, steps + 1):
            series[t] = series[t - 1] @ self.P
        trail.finish()
        self.audit_trails.append(trail)
        return series

    def steady_state(
        self,
        max_steps: int = 10000,
        threshold: float = 1e-8,
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        """求解稳态分布

        Returns
        -------
        (pi, info)
            pi   : 稳态分布向量
            info : 包含收敛信息、处理意见等，供报告和复核使用
        """
        trail = AuditTrail(
            operation="steady_state",
            params={"max_steps": max_steps, "threshold": threshold},
        )

        pi = self.initial_dist.copy()
        steps_used = 0
        residual = float("inf")

        for t in range(1, max_steps + 1):
            pi_next = pi @ self.P
            residual = float(np.linalg.norm(pi_next - pi, ord=1))
            pi = pi_next
            steps_used = t
            if residual < threshold:
                break

        info: Dict[str, Any] = {
            "steps_used": steps_used,
            "residual": residual,
            "threshold": threshold,
            "converged": residual < threshold,
        }

        if not info["converged"]:
            warn = ConvergenceWarning(
                steps_used=steps_used,
                residual=residual,
                threshold=threshold,
                context={"label": self.label},
            )
            trail.finish(warning=warn.message, suggestion=warn.suggestion)
            info["warning"] = warn.message
            info["suggestion"] = warn.suggestion
        else:
            trail.finish()

        self.audit_trails.append(trail)
        return pi, info

    def simulate_path(
        self,
        steps: int,
        start_state: Optional[str] = None,
        seed: Optional[int] = None,
    ) -> List[str]:
        """生成一条模拟路径，用于课堂演示"""
        rng = np.random.default_rng(seed)
        trail = AuditTrail(
            operation="simulate_path",
            params={"steps": steps, "start_state": start_state, "seed": seed},
        )

        if start_state is None:
            idx = rng.choice(self.n_states, p=self.initial_dist)
        else:
            if start_state not in self.state_index:
                raise StateNotFoundError(
                    state_name=start_state,
                    available_states=list(self.states),
                    context={"label": self.label},
                )
            idx = self.state_index[start_state]

        path = [self.states[idx]]
        for _ in range(steps):
            idx = rng.choice(self.n_states, p=self.P[idx])
            path.append(self.states[idx])

        trail.finish()
        self.audit_trails.append(trail)
        return path

    # ------------------------------------------------------------------
    # 快照 / 可追溯导出
    # ------------------------------------------------------------------
    def param_snapshot(self) -> Dict[str, Any]:
        """返回参数表，供异常回溯时使用"""
        return {
            "id": self._id,
            "label": self.label,
            "created_at": self.created_at.isoformat(timespec="seconds"),
            "states": list(self.states),
            "initial_dist": {
                s: float(self.initial_dist[i])
                for i, s in enumerate(self.states)
            },
            "transition_matrix": self.P.tolist(),
        }

    def to_dict(self) -> Dict[str, Any]:
        return {
            "params": self.param_snapshot(),
            "audit_trails": [
                {
                    "operation": t.operation,
                    "params": t.params,
                    "started_at": t.started_at.isoformat(timespec="seconds"),
                    "finished_at": t.finished_at.isoformat(timespec="seconds")
                    if t.finished_at
                    else None,
                    "warning": t.warning,
                    "suggestion": t.suggestion,
                }
                for t in self.audit_trails
            ],
        }
