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
    has_judgment_change: bool = False
    judgment_change_categories: List[str] = field(default_factory=list)
    judgment_change_details: List[str] = field(default_factory=list)


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

        _analyze_judgment_changes(result, baseline_result, analysis)

        if analysis.jump_ratio > 0.5:
            analysis.has_jump = True
            _analyze_jump_cause(result, baseline_result, analysis)
        elif analysis.has_judgment_change:
            analysis.has_jump = False
            analysis.cause_categories = []
            analysis.cause_details = []
    else:
        _detect_intrinsic_anomalies(result, analysis)

    return analysis


def _detect_intrinsic_anomalies(result: CalcResult, analysis: JumpAnalysis):
    if result.raw_result == 0 and not result.material_check and not result.unit_issues and not result.boundary_issues:
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
        elif issue.issue_type == "mismatch_incompatible":
            causes.append("单位不兼容")
            details.append(f"参数「{issue.param_name}」单位 {issue.current_unit} 无法换算为 {issue.expected_unit}，结果可能有误")

    if result.material_check.get("is_alias"):
        causes.append("材料名称不一致")
        details.append(
            f"材料名称「{result.material_check['input_name']}」为别名，已映射到标准名称「{result.material_check['standard_name']}」。"
            f"注意：别名映射依赖材料库覆盖度，存在误判风险"
        )

    if result.material_check.get("is_unknown"):
        causes.append("材料未知")
        details.append(f"材料「{result.material_check['input_name']}」未在材料库中，密度参数可能不正确，结果可靠性低")

    if causes:
        analysis.has_jump = True
        analysis.cause_categories = list(set(causes))
        analysis.cause_details = details
        analysis.actual_value = result.raw_result
        analysis.has_judgment_change = True
        analysis.judgment_change_categories = list(set(causes))
        analysis.judgment_change_details = details


def _analyze_judgment_changes(result: CalcResult, baseline: CalcResult, analysis: JumpAnalysis):
    categories = []
    details = []

    _check_material_judgment_change(result, baseline, categories, details)
    _check_unit_judgment_change(result, baseline, categories, details)
    _check_boundary_judgment_change(result, baseline, categories, details)

    if categories:
        analysis.has_judgment_change = True
        analysis.judgment_change_categories = categories
        analysis.judgment_change_details = details


def _check_material_judgment_change(result, baseline, categories, details):
    old_mc = baseline.material_check or {}
    new_mc = result.material_check or {}

    old_is_alias = old_mc.get("is_alias", False)
    new_is_alias = new_mc.get("is_alias", False)
    old_is_unknown = old_mc.get("is_unknown", False)
    new_is_unknown = new_mc.get("is_unknown", False)
    old_std = old_mc.get("standard_name")
    new_std = new_mc.get("standard_name")
    old_input = old_mc.get("input_name", "未填写")
    new_input = new_mc.get("input_name", "未填写")

    if old_is_alias and not new_is_alias and old_std == new_std:
        categories.append("材料名称判断升级")
        details.append(
            f"材料名称从「{old_input}」（别名）修正为「{new_input}」（标准名称），"
            f"标准名称均为「{old_std}」。数值结果未变，但判断可靠性提升：从依赖别名映射变为标准名称直接匹配"
        )
    elif old_is_unknown and not new_is_unknown:
        categories.append("材料从未知到已知")
        details.append(
            f"材料从「{old_input}」（未识别）修正为「{new_input}」，映射到标准名称「{new_std}」。"
            f"这是判断层面的关键变化：从无密度数据到有密度数据"
        )
    elif old_std != new_std:
        categories.append("材料标准名称变化")
        details.append(
            f"材料标准名称从「{old_std}」变为「{new_std}」（输入名：{old_input} → {new_input}）。"
            f"注意：标准名称变化意味着密度取值可能变化，是数值跳变的常见原因"
        )
    elif not old_is_alias and new_is_alias:
        categories.append("材料名称判断降级")
        details.append(
            f"材料从标准名称「{old_input}」变为别名「{new_input}」（映射到「{new_std}」）。"
            f"判断可靠性下降，需确认别名映射是否正确"
        )
    elif old_input != new_input and old_std == new_std:
        categories.append("材料输入名称变化")
        details.append(
            f"材料输入名从「{old_input}」变为「{new_input}」，标准名称均为「{old_std}」。"
            f"属于同一种材料的不同叫法，判断层面无实质变化"
        )


def _check_unit_judgment_change(result, baseline, categories, details):
    old_issue_map = {ui.param_name: ui for ui in baseline.unit_issues}
    new_issue_map = {ui.param_name: ui for ui in result.unit_issues}

    all_params = set(list(old_issue_map.keys()) + list(new_issue_map.keys()))

    for pname in all_params:
        old_issue = old_issue_map.get(pname)
        new_issue = new_issue_map.get(pname)

        if old_issue and old_issue.issue_type == "missing" and not new_issue:
            categories.append("单位补全")
            details.append(
                f"参数「{pname}」单位从缺失补全为标准单位。"
                f"这是判断层面的关键变化：从无单位（数量级不确定）到有确定单位"
            )
        elif old_issue and old_issue.issue_type == "missing" and new_issue and new_issue.issue_type == "mismatch_convertible":
            categories.append("单位从缺失到可换算")
            details.append(
                f"参数「{pname}」单位从缺失补充为 {new_issue.current_unit}，可换算为 {new_issue.expected_unit}。"
                f"判断可靠性提升，但仍需确认单位是否正确"
            )
        elif old_issue and old_issue.issue_type == "mismatch_incompatible" and (not new_issue or new_issue.issue_type == "mismatch_convertible"):
            categories.append("单位不兼容问题解决")
            details.append(
                f"参数「{pname}」单位从不兼容变为{'可换算' if new_issue else '标准单位'}。"
                f"判断层面显著改善：结果从不可靠变为可靠"
            )
        elif not old_issue and new_issue and new_issue.issue_type == "missing":
            categories.append("单位变为缺失")
            details.append(
                f"参数「{pname}」单位从有到无。判断可靠性下降，结果数量级存疑"
            )


def _check_boundary_judgment_change(result, baseline, categories, details):
    old_issue_set = {(bi.param_name, bi.issue_type) for bi in baseline.boundary_issues}
    new_issue_set = {(bi.param_name, bi.issue_type) for bi in result.boundary_issues}

    resolved = old_issue_set - new_issue_set
    new_ones = new_issue_set - old_issue_set

    for pname, itype in resolved:
        old_issue = next(bi for bi in baseline.boundary_issues if bi.param_name == pname and bi.issue_type == itype)
        categories.append("边界问题解决")
        type_label = "低于下限" if itype == "below_min" else "高于上限"
        details.append(
            f"参数「{pname}」{type_label}问题已解决，从 {old_issue.current_value} 回到合理范围内。"
            f"判断层面：从边界异常状态恢复正常"
        )

    for pname, itype in new_ones:
        new_issue = next(bi for bi in result.boundary_issues if bi.param_name == pname and bi.issue_type == itype)
        categories.append("新出现边界问题")
        type_label = "低于下限" if itype == "below_min" else "高于上限"
        details.append(
            f"参数「{pname}」新出现{type_label}，当前值 {new_issue.current_value}，合理范围 [{new_issue.min_value}, {new_issue.max_value}]。"
            f"判断层面：从正常变为边界异常，可能是数值或单位变化导致"
        )


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

    for pname in result.params:
        if pname in baseline.params:
            if baseline.params[pname].unit != result.params[pname].unit:
                causes.append("单位变化")
                details.append(
                    f"参数「{pname}」单位由 {baseline.params[pname].unit or '（未填）'} 变为 {result.params[pname].unit or '（未填）'}"
                )

    if baseline.material_check.get("standard_name") != result.material_check.get("standard_name"):
        causes.append("材料名称不一致")
        details.append(
            f"材料由「{baseline.material_check.get('input_name', '未填写')}」变为「{result.material_check.get('input_name', '未填写')}」，"
            f"标准名称映射变化：{baseline.material_check.get('standard_name', '无')} → {result.material_check.get('standard_name', '无')}"
        )

    for issue in result.boundary_issues:
        pname = issue.param_name
        old_param = baseline.params.get(pname)
        if old_param and old_param.value is not None:
            old_in_range = True
            if old_param.min_value is not None and old_param.value < old_param.min_value:
                old_in_range = False
            if old_param.max_value is not None and old_param.value > old_param.max_value:
                old_in_range = False

            if old_in_range:
                causes.append("阈值穿越")
                type_label = "低于下限" if issue.issue_type == "below_min" else "高于上限"
                details.append(f"参数「{pname}」从正常范围变为{type_label}，触发边界跳变")

    if not causes:
        if analysis.has_judgment_change:
            causes = analysis.judgment_change_categories
            details = analysis.judgment_change_details
        else:
            causes = ["未识别的跳变原因"]
            details = ["两次计算结果差异较大，但未定位到明确原因，建议人工复核"]

    analysis.cause_categories = list(set(causes))
    analysis.cause_details = details
