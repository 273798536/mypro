from typing import Dict, List, Optional, Callable
from datetime import datetime

from .models import (
    StudentAnswer,
    StabilityResult,
    ConfirmationStatus,
    StabilityVerdict,
)
from .analyzer import StabilityAnalyzer
from .constraint_validator import ConstraintValidator
from .explainer import ResultExplainer


class ReviewWorkflow:
    def __init__(
        self,
        analyzer: Optional[StabilityAnalyzer] = None,
        validator: Optional[ConstraintValidator] = None,
        explainer: Optional[ResultExplainer] = None,
    ):
        self.analyzer = analyzer or StabilityAnalyzer()
        self.validator = validator or ConstraintValidator(self.analyzer)
        self.explainer = explainer or ResultExplainer()
        self._result_store: Dict[str, StabilityResult] = {}
        self._coefficient_store: Dict[str, Dict] = {}
        self._review_log: List[Dict] = []

    def run_analysis(
        self,
        problem_id: str,
        coefficients: Optional[Dict[str, float]],
        student_ids: Optional[List[str]] = None,
        enable_constraints: bool = True,
    ) -> StabilityResult:
        self._coefficient_store[problem_id] = dict(coefficients) if coefficients else {}

        existing = self._result_store.get(problem_id)

        result = self.analyzer.analyze_stability(
            problem_id=problem_id,
            coefficients=coefficients,
            student_ids=student_ids,
            existing_result=existing,
        )

        if enable_constraints and coefficients and result.verdict != StabilityVerdict.INSUFFICIENT_DATA:
            result, _ = self.validator.validate_and_generate_counterexample(result, coefficients)

        result = self.explainer.add_explanation_to_result(result)

        self._result_store[problem_id] = result
        self._log_action(problem_id, "run_analysis", {"run_count": result.run_count})
        return result

    def rerun(self, problem_id: str, updated_coefficients: Optional[Dict[str, float]] = None) -> StabilityResult:
        coeffs = updated_coefficients if updated_coefficients is not None else self._coefficient_store.get(problem_id, {})
        self._log_action(problem_id, "rerun", {"updated": updated_coefficients is not None})
        return self.run_analysis(problem_id, coeffs)

    def supplement(
        self,
        problem_id: str,
        answer: StudentAnswer,
        aggregate_fn: Optional[Callable] = None,
    ) -> StabilityResult:
        existing = self._result_store.get(problem_id)
        if existing is None:
            result = self.run_analysis(
                problem_id=problem_id,
                coefficients=answer.coefficients,
                student_ids=[answer.student_id],
            )
            result.has_supplement = True
            self._log_action(problem_id, "supplement", {"student": answer.student_id})
            return result

        updated = self.analyzer.apply_late_answer(problem_id, answer, existing, aggregate_fn)

        if updated_coeffs := answer.coefficients:
            merged = dict(self._coefficient_store.get(problem_id, {}))
            for k, v in updated_coeffs.items():
                merged[k] = v
            self._coefficient_store[problem_id] = merged
            rerun_result = self.run_analysis(
                problem_id=problem_id,
                coefficients=merged,
                student_ids=list(set(updated.student_ids)),
            )
            rerun_result.has_supplement = True
            self._log_action(problem_id, "supplement", {"student": answer.student_id, "rerun": True})
            return rerun_result

        updated = self.explainer.add_explanation_to_result(updated)
        self._result_store[problem_id] = updated
        self._log_action(problem_id, "supplement", {"student": answer.student_id, "rerun": False})
        return updated

    def confirm(
        self,
        problem_id: str,
        confirmed: bool,
        reviewer: str = "unknown",
        notes: str = "",
    ) -> StabilityResult:
        result = self._result_store.get(problem_id)
        if result is None:
            raise ValueError(f"未找到问题 {problem_id} 的结果，请先运行分析")

        result.confirmation_status = (
            ConfirmationStatus.CONFIRMED if confirmed else ConfirmationStatus.REJECTED
        )
        result.confirmed_by = reviewer
        result.confirmed_at = datetime.now()
        if notes:
            if result.review_notes:
                result.review_notes += " | "
            result.review_notes += f"[确认] {notes}"

        result = self.explainer.add_explanation_to_result(result)
        self._log_action(
            problem_id,
            "confirm",
            {"status": result.confirmation_status.value, "reviewer": reviewer},
        )
        return result

    def get_review_summary(self, problem_id: str) -> str:
        result = self._result_store.get(problem_id)
        if result is None:
            return f"[复核入口] 问题 {problem_id} 暂无分析结果。可用命令: run / rerun / supplement / confirm"

        lines = []
        lines.append("=" * 50)
        lines.append(f"[复核入口] 问题 {problem_id}")
        lines.append("=" * 50)
        lines.append(result.explanation)
        lines.append("-" * 50)
        lines.append(f"重复运行次数: {result.run_count}")
        lines.append(f"人工确认状态: {result.confirmation_status.value}")
        lines.append(f"是否含补录: {'是' if result.has_supplement else '否'}")
        if result.confirmed_by:
            lines.append(f"确认人: {result.confirmed_by} @ {result.confirmed_at}")
        lines.append("-" * 50)
        lines.append("可用操作:")
        lines.append("  rerun(problem_id)           — 重复运行当前参数")
        lines.append("  supplement(problem_id, ans) — 补录学生答案并重新判定")
        lines.append("  confirm(problem_id, True/False, reviewer, notes) — 人工确认")
        lines.append("=" * 50)
        return "\n".join(lines)

    def list_pending_reviews(self) -> List[str]:
        return [
            pid
            for pid, r in self._result_store.items()
            if r.confirmation_status == ConfirmationStatus.PENDING
        ]

    def get_log(self, problem_id: Optional[str] = None) -> List[Dict]:
        if problem_id:
            return [e for e in self._review_log if e.get("problem_id") == problem_id]
        return list(self._review_log)

    def _log_action(self, problem_id: str, action: str, details: Optional[Dict] = None):
        entry = {
            "problem_id": problem_id,
            "action": action,
            "timestamp": datetime.now(),
            "details": details or {},
        }
        self._review_log.append(entry)

    def print_terminal_review(self, problem_id: str):
        print(self.get_review_summary(problem_id))
