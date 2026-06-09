"""自定义异常体系

每类异常都携带：
- message:      人可读的错误说明（供普通话报告用）
- suggestion:   处理意见（供数据分析员补数时参考）
- context:      相关参数快照（供异常回溯查参数表）
"""

from __future__ import annotations

from typing import Any, Dict, Optional


class MarkovError(Exception):
    """马尔可夫链模拟的根异常"""

    def __init__(
        self,
        message: str,
        suggestion: str = "",
        context: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.suggestion = suggestion
        self.context = context or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "error_type": self.__class__.__name__,
            "message": self.message,
            "suggestion": self.suggestion,
            "context": self.context,
        }

    def __str__(self) -> str:
        parts = [f"[{self.__class__.__name__}] {self.message}"]
        if self.suggestion:
            parts.append(f"  处理意见: {self.suggestion}")
        if self.context:
            parts.append(f"  参数快照: {self.context}")
        return "\n".join(parts)


class EmptyStateError(MarkovError):
    """状态集合为空"""

    def __init__(
        self,
        message: str = "输入的状态集合为空，无法构建马尔可夫链",
        suggestion: str = "请检查数据导入流程，至少提供 1 个状态名称；若为批量数据请标记该条跳过。",
        context: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(message, suggestion, context)


class InvalidTransitionMatrixError(MarkovError):
    """转移矩阵维度与状态数不匹配"""

    def __init__(
        self,
        n_states: int,
        matrix_shape: tuple,
        suggestion: str = "请核对转移矩阵行数/列数是否与状态列表长度完全一致。",
        context: Optional[Dict[str, Any]] = None,
    ) -> None:
        message = (
            f"转移矩阵维度 {matrix_shape} 与状态数 {n_states} 不匹配"
        )
        ctx = {"n_states": n_states, "matrix_shape": matrix_shape}
        if context:
            ctx.update(context)
        super().__init__(message, suggestion, ctx)


class NonStochasticMatrixError(MarkovError):
    """矩阵行和不为 1（非随机矩阵）"""

    def __init__(
        self,
        row_index: int,
        row_sum: float,
        tolerance: float = 1e-6,
        suggestion: str = "请检查该行是否全部填写，或对数值做归一化处理（允许误差 ≤ 1e-6）。",
        context: Optional[Dict[str, Any]] = None,
    ) -> None:
        message = (
            f"第 {row_index} 行概率和为 {row_sum:.6f}，超出容差 ±{tolerance}"
        )
        ctx = {
            "row_index": row_index,
            "row_sum": row_sum,
            "tolerance": tolerance,
        }
        if context:
            ctx.update(context)
        super().__init__(message, suggestion, ctx)


class StateNotFoundError(MarkovError):
    """初始分布中引用了不存在的状态"""

    def __init__(
        self,
        state_name: str,
        available_states: list,
        suggestion: str = "请核对初始分布的状态名是否拼写正确，或补充缺失状态定义。",
        context: Optional[Dict[str, Any]] = None,
    ) -> None:
        message = f"初始分布引用了不存在的状态 '{state_name}'"
        ctx = {
            "state_name": state_name,
            "available_states": available_states,
        }
        if context:
            ctx.update(context)
        super().__init__(message, suggestion, ctx)


class ConvergenceWarning(MarkovError):
    """稳态计算未在规定步数内收敛（非致命，仅告警）"""

    def __init__(
        self,
        steps_used: int,
        residual: float,
        threshold: float = 1e-8,
        suggestion: str = "可增大 max_steps 参数继续迭代，或检查转移矩阵是否存在周期性。",
        context: Optional[Dict[str, Any]] = None,
    ) -> None:
        message = (
            f"迭代 {steps_used} 步后残差 {residual:.2e} 仍大于阈值 {threshold:.2e}"
        )
        ctx = {
            "steps_used": steps_used,
            "residual": residual,
            "threshold": threshold,
        }
        if context:
            ctx.update(context)
        super().__init__(message, suggestion, ctx)
