from calculator import CalcResult
from jump_detector import JumpAnalysis
from history_logger import HistoryRecord
from typing import List, Optional


class SectionCounter:
    def __init__(self):
        self.main = 0
        self.sub = 0

    def next_main(self):
        self.main += 1
        self.sub = 0
        return f"## {self.main}、"

    def next_sub(self):
        self.sub += 1
        return f"### {self.main}.{self.sub}"


def generate_report(
    result: CalcResult,
    jump_analysis: Optional[JumpAnalysis] = None,
    history_records: Optional[List[HistoryRecord]] = None,
    problem_title: str = "",
) -> str:
    lines = []
    sec = SectionCounter()

    lines.append(f"# 组合计数参数试算报告 — {result.problem_id}")
    if problem_title:
        lines.append("")
        lines.append(f"> 题目：{problem_title}")
    lines.append("")
    lines.append(f"**生成时间**：{result.timestamp}")
    lines.append("")

    lines.append(f"{sec.next_main()} 计算结果概览")
    lines.append("")
    lines.append("| 项目 | 内容 |")
    lines.append("|------|------|")
    lines.append(f"| 使用公式 | {result.formula_used}（{result.formula_expression}） |")
    lines.append(f"| 计算结果 | {result.converted_result:.4g} {result.result_unit} |")
    lines.append(f"| 单位问题 | {len(result.unit_issues)} 项 |")
    lines.append(f"| 边界问题 | {len(result.boundary_issues)} 项 |")
    lines.append(f"| 材料核对 | {'存在别名/不一致' if result.material_check.get('is_alias') or result.material_check.get('is_unknown') else '标准名称'} |")
    lines.append("")

    lines.append(f"{sec.next_main()} 计算过程明细")
    lines.append("")
    lines.append(f"{sec.next_sub()} 公式说明")
    lines.append("")
    lines.append(f"- **公式名称**：{result.formula_used}")
    lines.append(f"- **公式表达式**：`{result.formula_expression}`")
    lines.append("")

    lines.append(f"{sec.next_sub()} 输入参数")
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

    lines.append(f"{sec.next_sub()} 逐步计算")
    lines.append("")
    for i, step in enumerate(result.calculation_steps, 1):
        lines.append(f"{i}. {step}")
    lines.append("")

    if result.unit_issues:
        lines.append(f"{sec.next_main()} 单位问题与处理建议")
        lines.append("")
        for i, issue in enumerate(result.unit_issues, 1):
            type_label = {
                "missing": "单位缺失",
                "mismatch_convertible": "单位不匹配（可换算）",
                "mismatch_incompatible": "单位不匹配（不可换算）",
            }.get(issue.issue_type, issue.issue_type)
            lines.append(f"{sec.next_sub()} {issue.param_name} — {type_label}")
            lines.append("")
            lines.append(f"- **当前单位**：{issue.current_unit}")
            lines.append(f"- **期望单位**：{issue.expected_unit}")
            lines.append(f"- **下一步**：{issue.next_step}")
            lines.append("")

    if result.boundary_issues:
        lines.append(f"{sec.next_main()} 边界值异常")
        lines.append("")
        for i, issue in enumerate(result.boundary_issues, 1):
            type_label = {
                "below_min": "低于下限",
                "above_max": "高于上限",
            }.get(issue.issue_type, issue.issue_type)
            lines.append(f"{sec.next_sub()} {issue.param_name} — {type_label}")
            lines.append("")
            lines.append(f"- **当前值**：{issue.current_value}")
            lines.append(f"- **合理范围**：[{issue.min_value}, {issue.max_value}]")
            lines.append(f"- **下一步**：{issue.next_step}")
            lines.append("")

    if result.material_check:
        lines.append(f"{sec.next_main()} 材料名称核对")
        lines.append("")
        mc = result.material_check
        lines.append(f"- **输入名称**：{mc.get('input_name', '—')}")
        lines.append(f"- **是否标准名称**：{'是' if mc.get('is_standard') else '否'}")
        lines.append(f"- **标准名称映射**：{mc.get('standard_name', '未找到')}")
        lines.append(f"- **备注**：{mc.get('note', '—')}")
        lines.append("")

    if jump_analysis:
        lines.append(f"{sec.next_main()} 数值跳变分析")
        lines.append("")
        if jump_analysis.baseline_value != 0 or jump_analysis.has_jump:
            if jump_analysis.has_jump:
                lines.append("⚠️ **检测到数值跳变**")
                lines.append("")
            else:
                lines.append("✅ 数值未发生显著跳变")
                lines.append("")
            lines.append(f"- **基准值**：{jump_analysis.baseline_value:.4g}")
            lines.append(f"- **当前值**：{jump_analysis.actual_value:.4g}")
            lines.append(f"- **相对变化**：{jump_analysis.jump_ratio*100:.1f}%（跳变阈值：50%）")
            lines.append("")
            if jump_analysis.cause_categories:
                lines.append(f"{sec.next_sub()} 数值跳变原因")
                lines.append("")
                for cat in jump_analysis.cause_categories:
                    lines.append(f"- {cat}")
                lines.append("")
                lines.append(f"{sec.next_sub()} 详细分析")
                lines.append("")
                for detail in jump_analysis.cause_details:
                    lines.append(f"- {detail}")
                lines.append("")
        else:
            lines.append("ℹ️  无基准值对比，仅做单样本异常检测")
            lines.append("")
            if jump_analysis.has_jump:
                lines.append("⚠️ **检测到异常因素**")
                lines.append("")
                lines.append(f"- **异常类别**：{', '.join(jump_analysis.cause_categories)}")
                lines.append("")
                for detail in jump_analysis.cause_details:
                    lines.append(f"- {detail}")
                lines.append("")
            else:
                lines.append("✅ 未检测到显著异常因素")
                lines.append("")

    has_judgment_section = (
        jump_analysis is not None
        and jump_analysis.has_judgment_change
        and jump_analysis.judgment_change_categories
    )

    if has_judgment_section:
        lines.append(f"{sec.next_main()} 判断变化分析")
        lines.append("")
        lines.append("ℹ️  **数值未变或数值变化另有原因，但判断层面发生了独立变化**。这类变化不直接等同数值跳变，但会影响结果的可靠性和解读方式。")
        lines.append("")
        lines.append(f"{sec.next_sub()} 判断变化类别")
        lines.append("")
        for cat in jump_analysis.judgment_change_categories:
            lines.append(f"- {cat}")
        lines.append("")
        lines.append(f"{sec.next_sub()} 详细说明")
        lines.append("")
        for detail in jump_analysis.judgment_change_details:
            lines.append(f"- {detail}")
        lines.append("")
        lines.append(f"{sec.next_sub()} 对试算判断的影响")
        lines.append("")
        _append_judgment_impact(jump_analysis.judgment_change_categories, lines)
        lines.append("")

    if result.next_steps:
        lines.append(f"{sec.next_main()} 下一步操作指引")
        lines.append("")
        for i, step in enumerate(result.next_steps, 1):
            lines.append(f"{i}. {step}")
        lines.append("")

    if history_records:
        lines.append(f"{sec.next_main()} 处理历史记录")
        lines.append("")
        lines.append(f"共 {len(history_records)} 条历史操作记录：")
        lines.append("")
        lines.append("| 记录ID | 时间 | 操作人 | 动作 | 备注 |")
        lines.append("|--------|------|--------|------|------|")
        for rec in history_records:
            lines.append(f"| {rec.record_id} | {rec.timestamp} | {rec.operator} | {rec.action} | {rec.remark or '—'} |")
        lines.append("")

        for i, rec in enumerate(history_records, 1):
            lines.append(f"{sec.next_sub()} {rec.record_id} — {rec.action}")
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


def _append_judgment_impact(categories, lines):
    impact_map = {
        "材料名称判断升级": [
            "材料名称从别名修正为标准名称，**判断可靠性提升**，后续计算无需再依赖别名映射猜测",
            "注意：若别名映射本身有误，修正前后的数值可能不一致，需核对密度取值",
        ],
        "材料从未知到已知": [
            "材料从无法识别到可识别，**填补了密度参数的空白**，是判断层面的关键转折点",
            "建议：将该材料名称加入材料库作为标准名或别名，避免下次再出现未知状态",
        ],
        "材料标准名称变化": [
            "材料标准名称发生变化，意味着密度取值可能变化，**是数值跳变的常见诱因**",
            "需重点核对：标准名称对应的密度是否与题目描述一致",
        ],
        "材料名称判断降级": [
            "材料从标准名称变为别名，**判断可靠性下降**",
            "需确认别名映射是否正确，避免密度取错",
        ],
        "单位补全": [
            "单位从缺失补全为标准单位，**结果的数量级从不确定变为确定**，判断可靠性大幅提升",
            "单位补全是学生错题中的高频问题，需特别注意单位与数值的匹配关系",
        ],
        "单位从缺失到可换算": [
            "单位从缺失到有单位（可换算），判断有改善但仍需确认单位是否正确",
            "若单位填写错误，换算后的结果反而会错得更离谱",
        ],
        "单位不兼容问题解决": [
            "单位从不兼容变为可换算/标准单位，**结果从不可靠变为可靠**",
            "需追溯之前不兼容的原因，是输入错误还是物理量类型搞错了",
        ],
        "单位变为缺失": [
            "单位从有到无，**判断可靠性下降**，结果数量级存疑",
            "需确认是漏填还是故意删除，避免遗漏关键信息",
        ],
        "边界问题解决": [
            "边界异常消失，参数回到合理范围，**结果可信度提升**",
            "需确认是参数修正了还是单位调整导致的边界状态变化",
        ],
        "新出现边界问题": [
            "新出现边界异常，可能是数值或单位变化导致的连锁反应，需追溯源头",
            "边界越界往往是单位换算错误的信号，优先检查单位",
        ],
    }
    for cat in categories:
        impacts = impact_map.get(cat)
        if impacts:
            for line in impacts:
                lines.append(f"- {line}")


def _format_snapshot(snapshot: dict) -> str:
    if "param" in snapshot:
        return f"参数 {snapshot['param']}: {snapshot.get('value')} {snapshot.get('unit', '')}"
    if "raw_result" in snapshot:
        lines = []
        lines.append(f"结果: {snapshot.get('raw_result')} {snapshot.get('result_unit', '')}")
        if "params" in snapshot:
            for pname, pinfo in snapshot["params"].items():
                lines.append(f"  {pname}: {pinfo.get('value')} {pinfo.get('unit', '')}")
        if "material_check" in snapshot:
            mc = snapshot["material_check"]
            if mc:
                lines.append(f"  材料: {mc.get('input_name', '')} → {mc.get('standard_name', '未知')}")
        return "\n".join(lines)
    return str(snapshot)
