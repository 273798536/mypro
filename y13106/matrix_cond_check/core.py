from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any, Tuple
import math


@dataclass
class BoundaryConfig:
    default_lower: float = 1.0
    default_upper: float = 100.0
    strict_extrapolation: bool = True
    warn_ratio: float = 0.8

    def is_within_boundary(self, value: float, lower: Optional[float] = None, upper: Optional[float] = None) -> Tuple[bool, str]:
        lo = lower if lower is not None else self.default_lower
        hi = upper if upper is not None else self.default_upper
        if value < lo:
            return False, f"低于下界 {lo}，差值 {lo - value:.6g}"
        if value > hi:
            return False, f"高于上界 {hi}，差值 {value - hi:.6g}"
        return True, "在边界内"

    def is_near_boundary(self, value: float, lower: Optional[float] = None, upper: Optional[float] = None) -> bool:
        lo = lower if lower is not None else self.default_lower
        hi = upper if upper is not None else self.default_upper
        range_span = hi - lo
        if range_span <= 0:
            return False
        warn_threshold = self.warn_ratio * range_span
        return (value - lo < warn_threshold) or (hi - value < warn_threshold)


@dataclass
class CheckResult:
    matrix_name: str
    condition_number: Optional[float]
    lower_bound: float
    upper_bound: float
    unit: str
    is_valid: bool
    boundary_msg: str
    is_extrapolated: bool
    is_near_boundary: bool
    source_line: int
    source_file: str
    raw_row: Dict[str, Any] = field(default_factory=dict)
    extra: Dict[str, Any] = field(default_factory=dict)


class MatrixConditionChecker:
    def __init__(self, config: Optional[BoundaryConfig] = None):
        self.config = config or BoundaryConfig()
        self.results: List[CheckResult] = []

    @staticmethod
    def compute_condition_number(matrix: List[List[float]]) -> Optional[float]:
        n = len(matrix)
        if n == 0 or any(len(row) != n for row in matrix):
            return None
        try:
            det = MatrixConditionChecker._determinant(matrix)
            if abs(det) < 1e-15:
                return float("inf")
            inv = MatrixConditionChecker._inverse(matrix, det)
            if inv is None:
                return None
            norm_a = MatrixConditionChecker._norm_inf(matrix)
            norm_inv = MatrixConditionChecker._norm_inf(inv)
            return norm_a * norm_inv
        except Exception:
            return None

    @staticmethod
    def _determinant(matrix: List[List[float]]) -> float:
        n = len(matrix)
        if n == 1:
            return matrix[0][0]
        if n == 2:
            return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0]
        det = 0.0
        for col in range(n):
            sign = (-1) ** col
            sub = [row[:col] + row[col + 1:] for row in matrix[1:]]
            det += sign * matrix[0][col] * MatrixConditionChecker._determinant(sub)
        return det

    @staticmethod
    def _inverse(matrix: List[List[float]], det: float) -> Optional[List[List[float]]]:
        n = len(matrix)
        if abs(det) < 1e-15:
            return None
        if n == 1:
            return [[1.0 / matrix[0][0]]]
        cofactors = []
        for i in range(n):
            row = []
            for j in range(n):
                sign = (-1) ** (i + j)
                sub = [r[:j] + r[j + 1:] for r in (matrix[:i] + matrix[i + 1:])]
                row.append(sign * MatrixConditionChecker._determinant(sub))
            cofactors.append(row)
        adjugate = [[cofactors[j][i] for j in range(n)] for i in range(n)]
        return [[adjugate[i][j] / det for j in range(n)] for i in range(n)]

    @staticmethod
    def _norm_inf(matrix: List[List[float]]) -> float:
        return max(sum(abs(x) for x in row) for row in matrix)

    def check_value(
        self,
        matrix_name: str,
        cond_value: Optional[float],
        lower: Optional[float] = None,
        upper: Optional[float] = None,
        unit: str = "",
        is_extrapolated: bool = False,
        source_line: int = 0,
        source_file: str = "",
        raw_row: Optional[Dict[str, Any]] = None,
    ) -> CheckResult:
        lo = lower if lower is not None else self.config.default_lower
        hi = upper if upper is not None else self.config.default_upper
        if cond_value is None or (isinstance(cond_value, float) and (math.isnan(cond_value) or math.isinf(cond_value))):
            result = CheckResult(
                matrix_name=matrix_name,
                condition_number=cond_value,
                lower_bound=lo,
                upper_bound=hi,
                unit=unit,
                is_valid=False,
                boundary_msg="条件数值无效（NaN/Inf/缺失）",
                is_extrapolated=is_extrapolated,
                is_near_boundary=False,
                source_line=source_line,
                source_file=source_file,
                raw_row=raw_row or {},
            )
        else:
            is_valid, boundary_msg = self.config.is_within_boundary(cond_value, lo, hi)
            near = self.config.is_near_boundary(cond_value, lo, hi)
            result = CheckResult(
                matrix_name=matrix_name,
                condition_number=cond_value,
                lower_bound=lo,
                upper_bound=hi,
                unit=unit,
                is_valid=is_valid,
                boundary_msg=boundary_msg,
                is_extrapolated=is_extrapolated,
                is_near_boundary=near,
                source_line=source_line,
                source_file=source_file,
                raw_row=raw_row or {},
            )
        self.results.append(result)
        return result

    def get_invalid_results(self) -> List[CheckResult]:
        return [r for r in self.results if not r.is_valid]

    def get_extrapolated_results(self) -> List[CheckResult]:
        return [r for r in self.results if r.is_extrapolated]

    def summary(self) -> Dict[str, Any]:
        total = len(self.results)
        valid = sum(1 for r in self.results if r.is_valid)
        invalid = total - valid
        extrapolated = sum(1 for r in self.results if r.is_extrapolated)
        extrapolated_invalid = sum(1 for r in self.results if r.is_extrapolated and not r.is_valid)
        near_boundary = sum(1 for r in self.results if r.is_near_boundary and r.is_valid)
        return {
            "total": total,
            "valid": valid,
            "invalid": invalid,
            "extrapolated": extrapolated,
            "extrapolated_invalid": extrapolated_invalid,
            "near_boundary": near_boundary,
        }
