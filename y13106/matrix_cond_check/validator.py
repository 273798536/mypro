from dataclasses import dataclass, field
from enum import Enum
from typing import List, Dict, Any, Optional, Set
from .core import CheckResult


class ViolationType(str, Enum):
    EXTRAPOLATION_OUT_OF_BOUND = "外推越界"
    EXTRAPOLATION_NEAR_BOUND = "外推临界"
    INTERPOLATION_OUT_OF_BOUND = "内插越界"
    INVALID_VALUE = "数值无效"
    UNIT_MISMATCH = "单位不一致"


@dataclass
class ViolationRecord:
    violation_id: str
    matrix_name: str
    violation_type: ViolationType
    condition_number: Optional[float]
    lower_bound: float
    upper_bound: float
    deviation: Optional[float]
    description: str
    is_extrapolated: bool
    source_file: str
    source_line: int
    affected_rows: Set[int] = field(default_factory=set)
    affected_matrices: Set[str] = field(default_factory=set)
    severity: str = "medium"
    check_result: Optional[CheckResult] = None
    raw_row: Dict[str, Any] = field(default_factory=dict)
    resolution_status: str = "待处理"

    def __post_init__(self):
        self.affected_rows.add(self.source_line)
        self.affected_matrices.add(self.matrix_name)

    def add_impact(self, source_line: Optional[int] = None, matrix_name: Optional[str] = None):
        if source_line is not None:
            self.affected_rows.add(source_line)
        if matrix_name is not None:
            self.affected_matrices.add(matrix_name)

    @property
    def impact_scope(self) -> str:
        rows = sorted(self.affected_rows)
        matrices = sorted(self.affected_matrices)
        return f"影响行号: {rows}, 关联矩阵: {matrices}"


class BoundaryValidator:
    def __init__(self):
        self.violations: List[ViolationRecord] = []
        self._matrix_groups: Dict[str, List[CheckResult]] = {}

    def analyze(self, check_results: List[CheckResult]) -> List[ViolationRecord]:
        self.violations = []
        for result in check_results:
            key = self._group_key(result)
            self._matrix_groups.setdefault(key, []).append(result)

        for result in check_results:
            self._check_single(result)

        self._propagate_impact()
        return self.violations

    def _group_key(self, result: CheckResult) -> str:
        base = result.matrix_name.split("_")[0] if "_" in result.matrix_name else result.matrix_name
        return f"{result.source_file}::{base}"

    def _check_single(self, result: CheckResult):
        if result.condition_number is None:
            self._add_violation(
                result=result,
                vtype=ViolationType.INVALID_VALUE,
                description=result.boundary_msg,
                deviation=None,
                severity="high",
            )
            return

        if not result.is_valid:
            if result.is_extrapolated:
                self._add_violation(
                    result=result,
                    vtype=ViolationType.EXTRAPOLATION_OUT_OF_BOUND,
                    description=f"外推时越界：{result.boundary_msg}（条件数={result.condition_number:.6g}，区间[{result.lower_bound}, {result.upper_bound}]）",
                    deviation=result.condition_number - result.upper_bound if result.condition_number > result.upper_bound else result.condition_number - result.lower_bound,
                    severity="critical",
                )
            else:
                self._add_violation(
                    result=result,
                    vtype=ViolationType.INTERPOLATION_OUT_OF_BOUND,
                    description=f"内插时越界：{result.boundary_msg}（条件数={result.condition_number:.6g}，区间[{result.lower_bound}, {result.upper_bound}]）",
                    deviation=result.condition_number - result.upper_bound if result.condition_number > result.upper_bound else result.condition_number - result.lower_bound,
                    severity="high",
                )
        elif result.is_extrapolated and result.is_near_boundary:
            self._add_violation(
                result=result,
                vtype=ViolationType.EXTRAPOLATION_NEAR_BOUND,
                description=f"外推临界：{result.boundary_msg}（条件数={result.condition_number:.6g}，接近边界）",
                deviation=None,
                severity="low",
            )

    def _add_violation(
        self,
        result: CheckResult,
        vtype: ViolationType,
        description: str,
        deviation: Optional[float],
        severity: str,
    ):
        vid = f"V{len(self.violations) + 1:04d}_{result.matrix_name}"
        violation = ViolationRecord(
            violation_id=vid,
            matrix_name=result.matrix_name,
            violation_type=vtype,
            condition_number=result.condition_number,
            lower_bound=result.lower_bound,
            upper_bound=result.upper_bound,
            deviation=deviation,
            description=description,
            is_extrapolated=result.is_extrapolated,
            source_file=result.source_file,
            source_line=result.source_line,
            severity=severity,
            check_result=result,
            raw_row=result.raw_row,
        )
        self.violations.append(violation)

    def _propagate_impact(self):
        for violation in self.violations:
            if violation.violation_type in (ViolationType.EXTRAPOLATION_OUT_OF_BOUND, ViolationType.EXTRAPOLATION_NEAR_BOUND):
                key = self._group_key(violation.check_result) if violation.check_result else f"{violation.source_file}::{violation.matrix_name}"
                siblings = self._matrix_groups.get(key, [])
                for sib in siblings:
                    if sib.source_line != violation.source_line:
                        violation.add_impact(source_line=sib.source_line, matrix_name=sib.matrix_name)

    def get_by_type(self, vtype: ViolationType) -> List[ViolationRecord]:
        return [v for v in self.violations if v.violation_type == vtype]

    def get_critical(self) -> List[ViolationRecord]:
        return [v for v in self.violations if v.severity == "critical"]

    def extrapolation_violations(self) -> List[ViolationRecord]:
        return [v for v in self.violations if v.is_extrapolated]

    def summary(self) -> Dict[str, Any]:
        by_type: Dict[str, int] = {}
        for v in self.violations:
            by_type[v.violation_type.value] = by_type.get(v.violation_type.value, 0) + 1
        by_severity: Dict[str, int] = {}
        for v in self.violations:
            by_severity[v.severity] = by_severity.get(v.severity, 0) + 1
        extrapolation_count = sum(1 for v in self.violations if v.is_extrapolated)
        total_affected_rows = set()
        for v in self.violations:
            total_affected_rows.update(v.affected_rows)
        return {
            "total_violations": len(self.violations),
            "by_type": by_type,
            "by_severity": by_severity,
            "extrapolation_violations": extrapolation_count,
            "unique_affected_rows": sorted(total_affected_rows),
            "total_affected_rows_count": len(total_affected_rows),
        }
