from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from calculator import CalcResult


@dataclass
class JumpAnalysis:
    problem_id: str
    has_jump: bool
    jump_magnitude: float
    jump_ratio: float
    cause_categories: List[str] = field(default_factory=list)
    cause_details: List[str] = field(default_factory=list)
    baseline_value: float = 0.0
    actual_value: float = 0.0


def detect_jump(result: CalcResult, baseline_result: Optional[CalcResult] = None) -> JumpAnalysis:
    analysis = JumpAnalysis(
        problem_id=result.problem_id,
        has_jump=False,
        jump_magnitude=0.0,
        jump_ratio=0.0,
    )

    if baseline_result:
        analysis.baseline_value = baseline_result.raw_result
        analysis.actual_value = result.raw_result
        if baseline_result.raw_result != 0:
            analysis.jump_ratio = abs(result.raw_result - baseline_result.raw_result) / abs(baseline_result.raw_result)
            analysis.jump_magnitude = abs(result.raw_result - baseline_result.raw_result)
        if analysis.jump_ratio > 0.5:
            analysis.has_jump = True
            _analyze_jump_cause(result, baseline_result, analysis)
    else:
        _detect_intrinsic_anomalies(result, analysis)

    return analysis


def _detect_intrinsic_anomalies(result: CalcResult, analysis: JumpAnalysis):
    if result.raw_result == 0:
        return

    causes = []
    details = []

    for issue in result.boundary_issues:
        causes.append("边界值异常")
        details.append(f"参数「{issue.param_name}」{issue.current_value} 超出合理范围 [{issue.min_value}, {issue.max_value}]，可能导致结果跳变")

    for issue in result.unit_issues:
        if issue.issue_type == "missing":
            causes.append("单位缺失")
            details.append(f"参数「{issue.param_name}」单位缺失，计算结果可能缺少数量级基础")
        elif issue.issue_type == "mismatch_convertible":
            causes.append("单位换算")
            details.append(f"参数「{issue.param_name}」单位由 {issue.current_unit} 换算为 {issue.expected_unit}，注意数量级变化")

    if result.material_check.get("is_alias"):
        causes.append("材料名称不一致")
        details.append(f"材料名称「{result.material_check['input_name']}」为别名，已映射到标准名称「{result.material_check['standard_name']}」，密度取值发生变化")

    if result.material_check.get("is_unknown"):
        causes.append("材料未知")
        details.append(f"材料「{result.material_check['input_name']}」未在库中，密度参数可能不正确")

    if causes:
        analysis.has_jump = True
        analysis.cause_categories = list(set(causes))
        analysis.cause_details = details
        analysis.actual_value = result.raw_result


def _analyze_jump_cause(result: CalcResult, baseline: CalcResult, analysis: JumpAnalysis):
    causes = []
    details = []

    for pname in result.params:
        if pname in baseline.params:
            old_val = baseline.params[pname].value or 0
            new_val = result.params[pname].value or 0
            if old_val != new_val and old_val != 0:
                ratio = abs(new_val - old_val) / abs(old_val)
                if ratio > 0.3:
                    causes.append("参数数值变化")
                    details.append(
                        f"参数「{pname}」由 {old_val} {baseline.params[pname].unit} 变为 {new_val} {result.params[pname].unit}，变化幅度 {ratio*100:.1f}%"
                    )

    unit_changed = False
    for pname in result.params:
        if pname in baseline.params:
            if baseline.params[pname].unit != result.params[pname].unit:
                unit_changed = True
                causes.append("单位变化")
                details.append(
                    f"参数「{pname}」单位由 {baseline.params[pname].unit} 变为 {result.params[pname].unit}"
                )

    if baseline.material_check.get("standard_name") != result.material_check.get("standard_name"):
        causes.append("材料名称不一致")
        details.append(
            f"材料由「{baseline.material_check.get('input_name', '未填写')}」变为「{result.material_check.get('input_name', '未填写')}」，"
            f"标准名称映射变化：{baseline.material_check.get('standard_name', '无')} → {result.material_check.get('standard_name', '无')}"
        )

    boundary_triggered = False
    for issue in result.boundary_issues:
        if pname := issue.param_name:
            old_param = baseline.params.get(pname)
            if old_param and old_param.value is not None:
                if (old_param.min_value and old_param.value >= old_param.min_value and issue.current_value < issue.min_value):
                    boundary_triggered = True
                    causes.append("阈值穿越")
                    details.append(f"参数「{pname}」从正常范围跌至下限以下，触发边界跳变")
                if (old_param.max_value and old_param.value <= old_param.max_value and issue.current_value > issue.max_value):
                    boundary_triggered = True
                    causes.append("阈值穿越")
                    details.append(f"参数「{pname}」从正常范围跃出上限，触发边界跳变")

    analysis.cause_categories = list(set(causes)) if causes else ["未识别的跳变原因"]
    analysis.cause_details = details if details else ["两次计算结果差异较大，但未定位到明确原因，建议人工复核"]
