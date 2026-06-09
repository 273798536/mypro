"""
统计显著性计算核心逻辑
======================
包含近似误差检测、空集合处理、统计校验等
"""

import math
from typing import Optional, Tuple, List, Dict
from .models import (
    Question,
    AnswerRecord,
    ErrorAnalysis,
    ErrorType,
    ReviewStatus,
    ReviewRecord,
    CounterExample,
    generate_id,
)


DEFAULT_APPROX_THRESHOLD = 0.05
MIN_SAMPLE_SIZE = 1


def compute_absolute_error(expected: float, actual: float) -> float:
    return abs(expected - actual)


def compute_relative_error(expected: float, actual: float) -> float:
    if expected == 0:
        return float("inf") if actual != 0 else 0.0
    return abs((actual - expected) / expected)


def validate_answer(
    question: Question,
    answer: AnswerRecord,
    approx_threshold: float = DEFAULT_APPROX_THRESHOLD,
) -> Tuple[bool, Optional[ErrorAnalysis]]:
    """
    验证单条答案记录的统计显著性。

    返回: (是否通过, 错误分析对象或None)
    """
    if question.correct_answer is None:
        ea = ErrorAnalysis(
            analysis_id=generate_id("ea_"),
            question_id=question.question_id,
            error_type=ErrorType.EMPTY_SET,
            details=f"题目 {question.question_id} 缺少标准答案，无法进行统计显著性复核。",
        )
        return False, ea

    if answer.student_answer is None:
        ea = ErrorAnalysis(
            analysis_id=generate_id("ea_"),
            question_id=question.question_id,
            error_type=ErrorType.EMPTY_SET,
            threshold=question.tolerance,
            details=f"答案记录 {answer.record_id} 的学生作答为空，属于空集合输入。",
        )
        return False, ea

    try:
        expected = float(question.correct_answer)
        actual = float(answer.student_answer)
    except (TypeError, ValueError):
        ea = ErrorAnalysis(
            analysis_id=generate_id("ea_"),
            question_id=question.question_id,
            error_type=ErrorType.INVALID_DATA,
            details=(
                f"数据格式非法：正确答案={question.correct_answer!r}, "
                f"学生答案={answer.student_answer!r}，无法转换为数值。"
            ),
        )
        return False, ea

    abs_err = compute_absolute_error(expected, actual)
    rel_err = compute_relative_error(expected, actual)

    if math.isnan(abs_err) or math.isnan(rel_err):
        ea = ErrorAnalysis(
            analysis_id=generate_id("ea_"),
            question_id=question.question_id,
            error_type=ErrorType.INVALID_DATA,
            details="计算得到的误差为 NaN，输入数据可能包含非法值。",
        )
        return False, ea

    if abs_err <= question.tolerance:
        return True, None

    if rel_err > approx_threshold:
        counter_examples = _generate_counter_examples(
            question, expected, actual, abs_err, rel_err
        )
        ea = ErrorAnalysis(
            analysis_id=generate_id("ea_"),
            question_id=question.question_id,
            error_type=ErrorType.APPROXIMATION,
            error_magnitude=rel_err,
            threshold=approx_threshold,
            details=(
                f"近似误差过大：相对误差 {rel_err:.4%}，超过阈值 {approx_threshold:.2%}；"
                f"绝对误差 {abs_err:.6f}，容差 {question.tolerance:.6f}。"
            ),
            counter_examples=counter_examples,
        )
        return False, ea

    if abs_err > question.tolerance:
        ea = ErrorAnalysis(
            analysis_id=generate_id("ea_"),
            question_id=question.question_id,
            error_type=ErrorType.APPROXIMATION,
            error_magnitude=abs_err,
            threshold=question.tolerance,
            details=(
                f"超出容差范围：绝对误差 {abs_err:.6f}，容差上限 {question.tolerance:.6f}。"
            ),
        )
        return False, ea

    return True, None


def _generate_counter_examples(
    question: Question,
    expected: float,
    actual: float,
    abs_err: float,
    rel_err: float,
) -> List[CounterExample]:
    """
    为近似误差过大的记录生成反例，辅助排课老师理解问题所在。
    """
    examples: List[CounterExample] = []

    examples.append(
        CounterExample(
            example_id=generate_id("ce_"),
            description="当前作答与标准答案的直接对比",
            input_values={"student_answer": actual, "correct_answer": expected},
            expected=expected,
            actual=actual,
            error_magnitude=abs_err,
        )
    )

    boundary_inside = expected + math.copysign(question.tolerance * 0.5, actual - expected)
    examples.append(
        CounterExample(
            example_id=generate_id("ce_"),
            description="边界内合法示例（误差减半仍在容差内）",
            input_values={"candidate_answer": boundary_inside},
            expected=expected,
            actual=boundary_inside,
            error_magnitude=compute_absolute_error(expected, boundary_inside),
        )
    )

    if rel_err != 0 and rel_err != float("inf"):
        scaled = expected + (actual - expected) * 0.1
        examples.append(
            CounterExample(
                example_id=generate_id("ce_"),
                description="误差缩小至10%时的作答对比",
                input_values={"scaled_answer": scaled},
                expected=expected,
                actual=scaled,
                error_magnitude=compute_absolute_error(expected, scaled),
            )
        )

    return examples


def review_single_record(
    question: Question,
    answer: AnswerRecord,
    run_id: str,
    approx_threshold: float = DEFAULT_APPROX_THRESHOLD,
    existing_review: Optional[ReviewRecord] = None,
) -> ReviewRecord:
    """
    对单条记录执行复核，支持增量更新。
    """
    passed, error_analysis = validate_answer(question, answer, approx_threshold)

    if passed:
        new_status = ReviewStatus.PASS
    elif error_analysis and error_analysis.error_type == ErrorType.EMPTY_SET:
        new_status = ReviewStatus.PENDING
    else:
        new_status = ReviewStatus.REJECTED

    previous_status = None
    affected_by_late = False
    late_record_ids: List[str] = []

    if existing_review:
        previous_status = existing_review.status
        if answer.is_late:
            affected_by_late = True
            late_record_ids = list(existing_review.late_answer_record_ids)
            if answer.record_id not in late_record_ids:
                late_record_ids.append(answer.record_id)
            if previous_status != new_status:
                new_status = ReviewStatus.AFFECTED
        if error_analysis and existing_review.error_analysis:
            error_analysis.version = existing_review.error_analysis.version + 1

    return ReviewRecord(
        review_id=existing_review.review_id if existing_review else generate_id("rv_"),
        record_id=answer.record_id,
        question_id=question.question_id,
        batch_id=answer.batch_id,
        status=new_status,
        error_analysis=error_analysis,
        previous_status=previous_status,
        affected_by_late_answer=affected_by_late,
        late_answer_record_ids=late_record_ids,
        run_id=run_id,
    )
