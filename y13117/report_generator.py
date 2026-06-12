from calculator import CalcResult
from jump_detector import JumpAnalysis
from history_logger import HistoryRecord
from typing import List, Optional


def generate_report(
    result: CalcResult,
    jump_analysis: Optional[JumpAnalysis] = None,
    history_records: Optional[List[HistoryRecord]] = None,
    problem_title: str = "",
) -> str:
    lines = []
    lines.append(f"# 组合计数参数试算报告 — {result.problem_id}")
    if problem_title:
        lines.append(f"")
        lines.append(f"> 题目：{problem_title}")
    lines.append(f"")
    lines.append(f"**生成时间**：{result.timestamp}")
    lines.append(f"")

    lines.append("## 一、计算结果概览")
    lines.append("")
    lines.append("| 项目 | 内容 |")
    lines.append("|------|------|")
    lines.append(f"| 使用公式 | {result.formula_used}（{result.formula_expression}） |")
    lines.append(f"| 计算结果 | {result.converted_result:.4g} {result.result_unit} |")
    lines.append(f"| 单位问题 | {len(result.unit_issues)} 项 |")
    lines.append(f"| 边界问题 | {len(result.boundary_issues)} 项 |")
    lines.append(f"| 材料核对 | {'存在别名/不一致' if result.material_check.get('is_alias') or result.material_check.get('is_unknown') else '标准名称'} |")
    lines.append("")

    lines.append("## 二、计算过程明细")
    lines.append("")
    lines.append("### 2.1 公式说明")
    lines.append("")
    lines.append(f"- **公式名称**：{result.formula_used}")
    lines.append(f"- **公式表达式**：`{result.formula_expression}`")
    lines.append("")

    lines.append("### 2.2 输入参数")
    lines.append("")
    lines.append("| 参数名称 | 数值 | 单位 | 合理下限 | 合理上限 | 状态 |")
    lines.append("|----------|------|------|----------|----------|------|")
    for pname, param in result.params.items():
        status_parts = []
        has_issue = False
        for ui in result.unit_issues:
            if pname in ui.param_name:
                if ui.issue_type == "missing":
                    status_parts.append("单位缺失 ⚠️")
                    has_issue = True
                elif ui.issue_type == "mismatch_convertible":
                    status_parts.append("单位不匹配(可换算)")
                elif ui.issue_type == "mismatch_incompatible":
                    status_parts.append("单位不兼容 ❌")
                    has_issue = True
        for bi in result.boundary_issues:
            if bi.param_name == pname:
                if bi.issue_type == "below_min":
                    status_parts.append("低于下限 ⚠️")
                    has_issue = True
                elif bi.issue_type == "above_max":
                    status_parts.append("高于上限 ⚠️")
                    has_issue = True
        if not status_parts:
            status_parts.append("正常 ✅")
        status_str = "；".join(status_parts)
        min_val = param.min_value if param.min_value is not None else "—"
        max_val = param.max_value if param.max_value is not None else "—"
        val_str = param.value if param.value is not None else "（未填）"
        lines.append(f"| {param.name} | {val_str} | {param.unit or '（未填）'} | {min_val} | {max_val} | {status_str} |")
    lines.append("")

    lines.append("### 2.3 逐步计算")
    lines.append("")
    for i, step in enumerate(result.calculation_steps, 1):
        lines.append(f"{i}. {step}")
    lines.append("")

    if result.unit_issues:
        lines.append("## 三、单位问题与处理建议")
        lines.append("")
        for i, issue in enumerate(result.unit_issues, 1):
            type_label = {
                "missing": "单位缺失",
                "mismatch_convertible": "单位不匹配（可换算）",
                "mismatch_incompatible": "单位不兼容（不可换算）",
            }.get(issue.issue_type, issue.issue_type)
            lines.append(f"### 3.{i} {issue.param_name} — {type_label}")
            lines.append("")
            lines.append(f"- **当前单位**：{issue.current_unit}")
            lines.append(f"- **期望单位**：{issue.expected_unit}")
            lines.append(f"- **下一步**：{issue.next_step}")
            lines.append("")

    if result.boundary_issues:
        lines.append("## 四、边界值异常")
        lines.append("")
        for i, issue in enumerate(result.boundary_issues, 1):
            type_label = {
                "below_min": "低于下限",
                "above_max": "高于上限",
            }.get(issue.issue_type, issue.issue_type)
            lines.append(f"### 4.{i} {issue.param_name} — {type_label}")
            lines.append("")
            lines.append(f"- **当前值**：{issue.current_value}")
            lines.append(f"- **合理范围**：[{issue.min_value}, {issue.max_value}]")
            lines.append(f"- **下一步**：{issue.next_step}")
            lines.append("")

    if result.material_check:
        lines.append("## 五、材料名称核对")
        lines.append("")
        mc = result.material_check
        lines.append(f"- **输入名称**：{mc.get('input_name', '—')}")
        lines.append(f"- **是否标准名称**：{'是' if mc.get('is_standard') else '否'}")
        lines.append(f"- **标准名称映射**：{mc.get('standard_name', '未找到')}")
        lines.append(f"- **备注**：{mc.get('note', '—')}")
        lines.append("")

    if jump_analysis:
        lines.append("## 六、结果跳变分析")
        lines.append("")
        if jump_analysis.has_jump:
            lines.append(f"⚠️ **检测到结果跳变**")
            lines.append("")
            lines.append(f"- **基准值**：{jump_analysis.baseline_value:.4g}")
            lines.append(f"- **当前值**：{jump_analysis.actual_value:.4g}")
            lines.append(f"- **跳变幅度**：{jump_analysis.jump_magnitude:.4g}（相对变化 {jump_analysis.jump_ratio*100:.1f}%）")
            lines.append("")
            lines.append(f"### 6.1 可能的跳变原因")
            lines.append("")
            for cat in jump_analysis.cause_categories:
                lines.append(f"- {cat}")
            lines.append("")
            lines.append("### 6.2 详细分析")
            lines.append("")
            for detail in jump_analysis.cause_details:
                lines.append(f"- {detail}")
            lines.append("")
        else:
            lines.append("✅ 未检测到显著跳变，结果在合理范围内。")
            lines.append("")

    if result.next_steps:
        lines.append("## 七、下一步操作指引")
        lines.append("")
        for i, step in enumerate(result.next_steps, 1):
            lines.append(f"{i}. {step}")
        lines.append("")

    if history_records:
        lines.append("## 八、处理历史记录")
        lines.append("")
        lines.append(f"共 {len(history_records)} 条历史操作记录：")
        lines.append("")
        lines.append("| 记录ID | 时间 | 操作人 | 动作 | 备注 |")
        lines.append("|--------|------|--------|------|------|")
        for rec in history_records:
            lines.append(f"| {rec.record_id} | {rec.timestamp} | {rec.operator} | {rec.action} | {rec.remark or '—'} |")
        lines.append("")

        for i, rec in enumerate(history_records, 1):
            lines.append(f"### 8.{i} {rec.record_id} — {rec.action}")
            lines.append("")
            lines.append(f"- **操作人**：{rec.operator}")
            lines.append(f"- **时间**：{rec.timestamp}")
            lines.append(f"- **备注**：{rec.remark or '无'}")
            lines.append("")
            lines.append("**修正前**：")
            lines.append("")
            lines.append("```")
            lines.append(_format_snapshot(rec.before_snapshot))
            lines.append("```")
            lines.append("")
            lines.append("**修正后**：")
            lines.append("")
            lines.append("```")
            lines.append(_format_snapshot(rec.after_snapshot))
            lines.append("```")
            lines.append("")

    lines.append("---")
    lines.append("")
    lines.append("*本报告由「组合计数参数试算」系统自动生成，公式、单位、边界值透明可追溯。*")

    return "\n".join(lines)


def _format_snapshot(snapshot: dict) -> str:
    if "param" in snapshot:
        return f"参数 {snapshot['param']}: {snapshot.get('value')} {snapshot.get('unit', '')}"
    if "raw_result" in snapshot:
        lines = []
        lines.append(f"结果: {snapshot.get('raw_result')} {snapshot.get('result_unit', '')}")
        if "params" in snapshot:
            for pname, pinfo in snapshot["params"].items():
                lines.append(f"  {pname}: {pinfo.get('value')} {pinfo.get('unit', '')}")
        return "\n".join(lines)
    return str(snapshot)
