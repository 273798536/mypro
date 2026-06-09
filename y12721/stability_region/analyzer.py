import uuid
import numpy as np
from typing import List, Optional, Dict, Tuple
from datetime import datetime, timedelta

from .models import (
    StudentAnswer,
    StabilityVerdict,
    StabilityResult,
    ConfirmationStatus,
)


class StabilityAnalyzer:
    def __init__(self, late_threshold_minutes: int = 60):
        self.late_threshold = timedelta(minutes=late_threshold_minutes)
        self._pending_late_answers: Dict[str, List[StudentAnswer]] = {}

    def _build_matrix(self, coefficients: Dict[str, float]) -> Optional[np.ndarray]:
        if not coefficients:
            return None

        coeffs = []
        max_order = 0

        for key, val in coefficients.items():
            if key.startswith("a") and key[1:].isdigit():
                order = int(key[1:])
                max_order = max(max_order, order)

        if max_order == 0:
            return None

        for i in range(max_order + 1):
            coeffs.append(coefficients.get(f"a{i}", 0.0))

        if all(abs(c) < 1e-12 for c in coeffs):
            return None

        n = max_order
        A = np.zeros((n, n))
        for j in range(n - 1):
            A[j, j + 1] = 1.0
        for j in range(n):
            A[n - 1, j] = -coeffs[j] / coeffs[n] if abs(coeffs[n]) > 1e-12 else 0.0

        return A

    def _compute_eigenvalues(self, A: np.ndarray) -> List[complex]:
        try:
            eigvals = np.linalg.eigvals(A)
            return [complex(ev.real, ev.imag) for ev in eigvals]
        except Exception:
            return []

    def _verdict_from_eigenvalues(self, eigenvalues: List[complex]) -> StabilityVerdict:
        if not eigenvalues:
            return StabilityVerdict.UNKNOWN

        unstable_count = sum(1 for ev in eigenvalues if ev.real > 1e-9)
        margin_count = sum(1 for ev in eigenvalues if abs(ev.real) <= 1e-9)

        if unstable_count > 0:
            return StabilityVerdict.UNSTABLE
        elif margin_count > 0:
            return StabilityVerdict.UNKNOWN
        else:
            return StabilityVerdict.STABLE

    def mark_late_answers(
        self,
        answers: List[StudentAnswer],
        deadline: Optional[datetime] = None,
    ) -> List[StudentAnswer]:
        if deadline is None:
            return answers

        for ans in answers:
            if ans.submitted_at and ans.submitted_at > deadline:
                ans.is_late = True
                key = ans.problem_id
                if key not in self._pending_late_answers:
                    self._pending_late_answers[key] = []
                self._pending_late_answers[key].append(ans)
        return answers

    def analyze_stability(
        self,
        problem_id: str,
        coefficients: Optional[Dict[str, float]],
        student_ids: Optional[List[str]] = None,
        existing_result: Optional[StabilityResult] = None,
    ) -> StabilityResult:
        result_id = existing_result.result_id if existing_result else str(uuid.uuid4())[:8]
        student_ids = student_ids or []

        if coefficients is None or len(coefficients) == 0:
            run_count = existing_result.run_count + 1 if existing_result else 1
            return StabilityResult(
                result_id=result_id,
                problem_id=problem_id,
                verdict=StabilityVerdict.INSUFFICIENT_DATA,
                eigenvalues=[],
                explanation="输入为空集合，缺少微分方程系数，无法判定稳定区。请检查数据采集或进行补录。",
                student_ids=student_ids,
                run_count=run_count,
                confirmation_status=existing_result.confirmation_status if existing_result else ConfirmationStatus.PENDING,
                has_supplement=existing_result.has_supplement if existing_result else False,
            )

        A = self._build_matrix(coefficients)
        if A is None:
            return StabilityResult(
                result_id=result_id,
                problem_id=problem_id,
                verdict=StabilityVerdict.INSUFFICIENT_DATA,
                eigenvalues=[],
                explanation="系数无法构成有效微分方程（全零系数或最高阶系数为零），无法判定稳定区。",
                student_ids=student_ids,
                run_count=existing_result.run_count + 1 if existing_result else 1,
                confirmation_status=existing_result.confirmation_status if existing_result else ConfirmationStatus.PENDING,
            )

        eigenvalues = self._compute_eigenvalues(A)
        verdict = self._verdict_from_eigenvalues(eigenvalues)

        run_count = existing_result.run_count + 1 if existing_result else 1

        return StabilityResult(
            result_id=result_id,
            problem_id=problem_id,
            verdict=verdict,
            eigenvalues=eigenvalues,
            student_ids=student_ids,
            run_count=run_count,
            confirmation_status=existing_result.confirmation_status if existing_result else ConfirmationStatus.PENDING,
            last_run_at=datetime.now(),
            has_supplement=existing_result.has_supplement if existing_result else False,
        )

    def apply_late_answer(
        self,
        problem_id: str,
        late_answer: StudentAnswer,
        existing_result: StabilityResult,
        aggregate_fn=None,
    ) -> StabilityResult:
        if not late_answer.coefficients:
            existing_result.review_notes += f"[晚到] 学生{late_answer.student_id}答案无系数，已记录但不影响判定。"
            existing_result.has_supplement = True
            return existing_result

        if problem_id in self._pending_late_answers:
            self._pending_late_answers[problem_id].append(late_answer)
        else:
            self._pending_late_answers[problem_id] = [late_answer]

        if aggregate_fn:
            aggregated = aggregate_fn(
                existing_result, self._pending_late_answers[problem_id]
            )
            if aggregated is not None:
                return self.analyze_stability(
                    problem_id=problem_id,
                    coefficients=aggregated,
                    student_ids=existing_result.student_ids + [late_answer.student_id],
                    existing_result=existing_result,
                )

        if late_answer.student_id not in existing_result.student_ids:
            existing_result.student_ids.append(late_answer.student_id)
        existing_result.has_supplement = True
        existing_result.review_notes += (
            f"[晚到补录] 学生{late_answer.student_id}答案已补录，请复核是否需要重新判定。"
        )
        return existing_result

    def get_pending_late_answers(self, problem_id: Optional[str] = None) -> Dict[str, List[StudentAnswer]]:
        if problem_id:
            return {problem_id: self._pending_late_answers.get(problem_id, [])}
        return dict(self._pending_late_answers)
