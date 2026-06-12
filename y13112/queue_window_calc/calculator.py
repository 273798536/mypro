from typing import List, Dict, Any, Optional, Tuple
from .models import (
    QuestionItem, CalculationResult, CalculationStatus,
    CalculationException, ManualConfirmation, ConfirmationStatus,
    HistoryRecord, BatchRunReport, Unit,
)
from .formula_engine import safe_eval_formula
from .unit_converter import (
    convert_value, detect_unit_shift, are_units_compatible,
)
from .extrapolation import check_extrapolation_bounds, apply_manual_confirmation


def build_conclusion(result: CalculationResult, question: QuestionItem) -> str:
    if result.final_value is None:
        return f"【{question.name}】计算失败，请查看异常信息。"
    unit_str = result.final_unit.value if result.final_unit else ""
    val = round(float(result.final_value), 4) if isinstance(result.final_value, (int, float)) else result.final_value
    base = f"【{question.name}】排队窗口参数试算结果：{val} {unit_str}"
    if question.supplementary_note:
        base += f"；备注关联：{question.supplementary_note}"
    if result.exceptions:
        base += f"；触发 {len(result.exceptions)} 项异常，需关注。"
    return base


def calculate_single(
    question: QuestionItem,
    manual_confirmations: Optional[Dict[str, ManualConfirmation]] = None,
    extrapolation_rules: Optional[Dict[str, Any]] = None,
) -> CalculationResult:
    result = CalculationResult(
        question_id=question.question_id,
        question_name=question.name,
    )
    manual_conf = None
    if manual_confirmations and question.question_id in manual_confirmations:
        manual_conf = manual_confirmations[question.question_id]
        result.confirmations.append(manual_conf)
    params = dict(question.input_params)
    trace_root = {
        "step": "question_context",
        "question_id": question.question_id,
        "question_name": question.name,
        "formula": question.formula_expression,
        "source_trace": question.source_trace,
    }
    result.value_trace.append(trace_root)
    raw_val, formula_exc, formula_trace = safe_eval_formula(
        question.formula_expression, params, question.question_id
    )
    result.value_trace.extend(formula_trace)
    if formula_exc is not None:
        result.exceptions.append(formula_exc)
        result.status = CalculationStatus.FAILED
        result.conclusion = build_conclusion(result, question)
        return result
    result.raw_value = raw_val
    result.raw_unit = question.input_unit
    if question.expected_output_unit and question.input_unit:
        shifted, shift_exc = detect_unit_shift(
            raw_val, question.input_unit, question.expected_output_unit,
            question.historical_reference,
        )
        if shift_exc is not None:
            result.exceptions.append(shift_exc)
        if not shifted and question.input_unit != question.expected_output_unit:
            converted, conv_exc = convert_value(
                raw_val, question.input_unit, question.expected_output_unit
            )
            if conv_exc is not None:
                result.exceptions.append(conv_exc)
                result.adjusted_value = raw_val
                result.adjusted_unit = question.input_unit
            else:
                result.adjusted_value = converted
                result.adjusted_unit = question.expected_output_unit
                result.value_trace.append({
                    "step": "unit_conversion",
                    "from_value": raw_val,
                    "from_unit": question.input_unit.value,
                    "to_value": converted,
                    "to_unit": question.expected_output_unit.value,
                })
        else:
            result.adjusted_value = raw_val
            result.adjusted_unit = question.input_unit
    else:
        result.adjusted_value = raw_val
        result.adjusted_unit = question.input_unit
    value_for_check = result.adjusted_value if result.adjusted_value is not None else raw_val
    out_of_range, extra_exc, extra_conf = check_extrapolation_bounds(
        value_for_check, question.historical_reference,
        extrapolation_rules, question.question_id,
    )
    if extra_exc is not None:
        result.exceptions.append(extra_exc)
    if out_of_range:
        if manual_conf is None or manual_conf.status not in (
            ConfirmationStatus.CONFIRMED, ConfirmationStatus.AUTO_PASSED
        ):
            if extra_conf is not None:
                result.confirmations.append(extra_conf)
            result.status = CalculationStatus.NEEDS_CONFIRMATION
            result.final_value = value_for_check
            result.final_unit = result.adjusted_unit or result.raw_unit
            result.linked_note = question.supplementary_note
            result.conclusion = build_conclusion(result, question)
            return result
        else:
            final_val, conf_trace = apply_manual_confirmation(value_for_check, manual_conf)
            result.value_trace.append(conf_trace)
            result.final_value = final_val
            result.final_unit = manual_conf.adjusted_unit or (result.adjusted_unit or result.raw_unit)
    else:
        result.final_value = value_for_check
        result.final_unit = result.adjusted_unit or result.raw_unit
    result.linked_note = question.supplementary_note
    if result.exceptions:
        has_fatal = any(
            e.exception_type in ("formula_error", "missing_data")
            for e in result.exceptions
        )
        if has_fatal:
            result.status = CalculationStatus.FAILED
        else:
            result.status = CalculationStatus.WARNING
    else:
        result.status = CalculationStatus.SUCCESS
    result.conclusion = build_conclusion(result, question)
    return result


def run_batch(
    questions: List[QuestionItem],
    manual_confirmations: Optional[Dict[str, ManualConfirmation]] = None,
    extrapolation_rules: Optional[Dict[str, Any]] = None,
    history_tracker=None,
) -> BatchRunReport:
    report = BatchRunReport(total_questions=len(questions))
    exc_summary: Dict[str, int] = {}
    for q in questions:
        r = calculate_single(q, manual_confirmations, extrapolation_rules)
        report.results.append(r)
        if r.status == CalculationStatus.SUCCESS:
            report.success_count += 1
        elif r.status == CalculationStatus.WARNING:
            report.warning_count += 1
        elif r.status == CalculationStatus.FAILED:
            report.failed_count += 1
        elif r.status == CalculationStatus.NEEDS_CONFIRMATION:
            report.needs_confirmation_count += 1
        for e in r.exceptions:
            key = e.exception_type.value
            exc_summary[key] = exc_summary.get(key, 0) + 1
        if history_tracker is not None:
            history_tracker.record_result(r)
    report.exceptions_summary = [
        {"exception_type": k, "count": v} for k, v in sorted(exc_summary.items())
    ]
    return report
