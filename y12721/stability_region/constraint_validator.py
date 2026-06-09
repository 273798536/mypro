import uuid
import copy
from typing import List, Optional, Dict, Tuple, Callable

from .models import (
    Constraint,
    CounterExample,
    StabilityResult,
    StabilityVerdict,
)
from .analyzer import StabilityAnalyzer


class ConstraintValidator:
    def __init__(self, analyzer: Optional[StabilityAnalyzer] = None):
        self.analyzer = analyzer or StabilityAnalyzer()
        self._constraints: Dict[str, Constraint] = {}
        self._check_fns: Dict[str, Callable] = {}
        self._register_defaults()

    def _register_defaults(self):
        def check_leading_coeff(coeffs: Dict[str, float]) -> Tuple[bool, Optional[Dict[str, float]], str]:
            orders = sorted([int(k[1:]) for k in coeffs if k.startswith("a") and k[1:].isdigit()])
            if not orders:
                return False, None, "无有效系数"
            max_order = max(orders)
            key = f"a{max_order}"
            if abs(coeffs.get(key, 0.0)) < 1e-12:
                fixed = dict(coeffs)
                fixed[key] = 1.0
                return True, fixed, f"最高阶系数 {key} 为零，已归一化为 1.0"
            return False, None, "最高阶系数非零"

        def check_negative_damping(coeffs: Dict[str, float]) -> Tuple[bool, Optional[Dict[str, float]], str]:
            damping_key = "a1"
            if damping_key in coeffs and coeffs[damping_key] < -1e-9:
                fixed = dict(coeffs)
                fixed[damping_key] = abs(fixed[damping_key])
                return True, fixed, f"阻尼系数 a1={coeffs[damping_key]:.4f} 为负（负阻尼意味着系统自激），已取绝对值修正"
            return False, None, "阻尼系数非负"

        def check_sign_pattern(coeffs: Dict[str, float]) -> Tuple[bool, Optional[Dict[str, float]], str]:
            orders = sorted([int(k[1:]) for k in coeffs if k.startswith("a") and k[1:].isdigit()])
            if not orders:
                return False, None, "无有效系数"
            fixed = dict(coeffs)
            flipped = []
            for o in orders:
                key = f"a{o}"
                if fixed.get(key, 0) < -1e-9:
                    fixed[key] = abs(fixed[key])
                    flipped.append(f"{key}")
            if flipped:
                return True, fixed, f"检测到负系数 {', '.join(flipped)}，依据劳斯判据必要条件修正为正（否则必然不稳定）"
            return False, None, "系数符号均满足必要条件"

        self.register_constraint(
            Constraint("leading_coeff_nonzero", "最高阶系数不能为零（否则方程降阶）", "check_leading_coeff"),
            check_leading_coeff,
        )
        self.register_constraint(
            Constraint("negative_damping", "阻尼系数不应为负（负阻尼导致不稳定）", "check_negative_damping"),
            check_negative_damping,
        )
        self.register_constraint(
            Constraint("routh_sign_condition", "劳斯判据必要条件：所有系数同号", "check_sign_pattern"),
            check_sign_pattern,
        )

    def register_constraint(self, constraint: Constraint, check_fn: Callable):
        self._constraints[constraint.name] = constraint
        self._check_fns[constraint.check_fn_name] = check_fn

    def list_constraints(self) -> List[Constraint]:
        return list(self._constraints.values())

    def validate_and_generate_counterexample(
        self,
        result: StabilityResult,
        coefficients: Dict[str, float],
    ) -> Tuple[StabilityResult, Optional[CounterExample]]:
        current_coeffs = dict(coefficients)
        verdict_before = result.verdict
        triggered_any = False
        triggered_name = ""
        explanation_parts = []
        coeffs_after = None

        for name, constraint in self._constraints.items():
            if not constraint.enabled:
                continue
            fn = self._check_fns.get(constraint.check_fn_name)
            if not fn:
                continue
            changed, fixed, reason = fn(current_coeffs)
            if changed and fixed is not None:
                triggered_any = True
                triggered_name = name
                explanation_parts.append(f"[{constraint.name}] {reason}")
                current_coeffs = fixed
                coeffs_after = dict(current_coeffs)

        if not triggered_any:
            return result, None

        new_result = self.analyzer.analyze_stability(
            problem_id=result.problem_id,
            coefficients=current_coeffs,
            student_ids=result.student_ids,
            existing_result=result,
        )

        ce = CounterExample(
            example_id="ce_" + str(uuid.uuid4())[:6],
            coefficients_before=dict(coefficients),
            coefficients_after=coeffs_after,
            verdict_before=verdict_before,
            verdict_after=new_result.verdict,
            constraint_triggered=triggered_name,
            explanation="; ".join(explanation_parts),
        )

        new_result.counter_example = ce
        return new_result, ce
