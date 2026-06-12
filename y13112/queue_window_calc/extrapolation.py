from typing import Tuple, Optional, Dict, Any
from .models import ExceptionType, CalculationException, ConfirmationStatus, ManualConfirmation


DEFAULT_EXTRAPOLATION_RULES = {
    "min_value": None,
    "max_value": None,
    "min_ratio": 0.2,
    "max_ratio": 5.0,
    "enable_ratio_check": True,
    "enable_absolute_check": False,
}


def check_extrapolation_bounds(
    value: float,
    historical_ref: Optional[Dict[str, Any]] = None,
    rules: Optional[Dict[str, Any]] = None,
    question_id: str = "",
) -> Tuple[bool, Optional[CalculationException], Optional[ManualConfirmation]]:
    effective_rules = dict(DEFAULT_EXTRAPOLATION_RULES)
    if rules:
        effective_rules.update(rules)
    needs_confirm = False
    reason_parts = []
    detail: Dict[str, Any] = {"computed_value": value}
    hist_avg = None
    if historical_ref and "average" in historical_ref:
        try:
            hist_avg = float(historical_ref["average"])
            detail["historical_average"] = hist_avg
        except (TypeError, ValueError):
            pass
    if effective_rules.get("enable_absolute_check"):
        mn = effective_rules.get("min_value")
        mx = effective_rules.get("max_value")
        if mn is not None and value < mn:
            needs_confirm = True
            reason_parts.append(f"计算值 {value} 低于绝对下限 {mn}")
            detail["absolute_min"] = mn
        if mx is not None and value > mx:
            needs_confirm = True
            reason_parts.append(f"计算值 {value} 高于绝对上限 {mx}")
            detail["absolute_max"] = mx
    if effective_rules.get("enable_ratio_check") and hist_avg is not None and hist_avg != 0:
        ratio = value / hist_avg
        detail["ratio_to_historical"] = round(ratio, 4)
        min_r = effective_rules.get("min_ratio", 0.2)
        max_r = effective_rules.get("max_ratio", 5.0)
        if ratio < min_r:
            needs_confirm = True
            reason_parts.append(
                f"计算值仅为历史均值的 {round(ratio * 100, 1)}%（低于 {round(min_r * 100, 1)}% 阈值）"
            )
            detail["min_ratio_threshold"] = min_r
        if ratio > max_r:
            needs_confirm = True
            reason_parts.append(
                f"计算值为历史均值的 {round(ratio * 100, 1)}%（高于 {round(max_r * 100, 1)}% 阈值）"
            )
            detail["max_ratio_threshold"] = max_r
    if not needs_confirm:
        return False, None, None
    reason = "；".join(reason_parts) if reason_parts else "计算值触发外推越界校验"
    exc = CalculationException(
        exception_type=ExceptionType.EXTRAPOLATION_OUT_OF_RANGE,
        question_id=question_id,
        message=f"外推越界：{reason}",
        detail=detail,
        suggestion="请确认是否为特殊情况导致数值偏离，如是请进行人工确认后继续。"
    )
    conf = ManualConfirmation(
        question_id=question_id,
        reason=reason,
        original_value=value,
        original_unit=None,
        adjusted_value=None,
        adjusted_unit=None,
        operator="",
        status=ConfirmationStatus.PENDING,
        next_step="请运营主管或投研助理审核该结果：若为异常请调整参数后重算，若为特殊情况请确认通过。"
    )
    return True, exc, conf


def apply_manual_confirmation(
    original_value: float,
    confirmation: ManualConfirmation,
) -> Tuple[float, Dict[str, Any]]:
    trace_entry = {
        "step": "manual_confirmation",
        "confirmation_id": confirmation.confirmation_id,
        "original_value": original_value,
        "status": confirmation.status.value,
        "operator": confirmation.operator,
        "reason": confirmation.reason,
    }
    if confirmation.status == ConfirmationStatus.CONFIRMED:
        if confirmation.adjusted_value is not None:
            final = confirmation.adjusted_value
            trace_entry["adjusted_value"] = final
            trace_entry["action"] = "adjusted"
        else:
            final = original_value
            trace_entry["action"] = "accepted_as_is"
    elif confirmation.status == ConfirmationStatus.AUTO_PASSED:
        final = original_value
        trace_entry["action"] = "auto_passed"
    else:
        final = original_value
        trace_entry["action"] = "unchanged_pending"
    return final, trace_entry
