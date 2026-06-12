from typing import TextIO

from .models import ReviewResult, ReviewRecord, ReviewStatus


class MarkdownExporter:
    def export(self, result: ReviewResult, output: TextIO) -> None:
        lines: list[str] = []
        lines.append("# 矩阵条件数错题复盘报告")
        lines.append("")
        lines.append(f"**生成时间**：{result.generated_at}")
        lines.append("")

        lines.append("## 一、整体结论")
        lines.append("")
        overall = result.overall_status
        lines.append(
            f"**复盘状态**：{overall.badge} {overall.display_name}（{overall.value}）"
        )
        lines.append("")
        lines.append("| 指标 | 数量 |")
        lines.append("|------|------|")
        lines.append(f"| 总记录数 | {result.total_count} |")
        lines.append(f"| ✅ 正常通过 | {result.passed_count} |")
        lines.append(f"| ⚠️ 需关注 | {result.warning_count} |")
        lines.append(f"| ❌ 处理异常 | {result.error_count} |")
        lines.append(f"| ∅ 空集合/无效 | {result.empty_count} |")
        lines.append("")

        lines.append("## 二、输入概览")
        lines.append("")
        src = result.input_summary.get("source_distribution", {})
        if src:
            lines.append("| 数据来源 | 条数 |")
            lines.append("|----------|------|")
            src_labels = {
                "student_old_version": "学生错题旧版",
                "manual_revision": "人工改判",
                "verbal_note": "口头备注",
                "official": "正式录入",
            }
            for k, v in src.items():
                lines.append(f"| {src_labels.get(k, k)} | {v} |")
            lines.append("")
        if result.input_summary.get("warning"):
            lines.append(f"> ⚠️ **输入提醒**：{result.input_summary['warning']}")
            lines.append("")

        lines.append("## 三、影响结论的记录（谁改了结论）")
        lines.append("")
        if result.conclusion_affectors:
            for i, rec in enumerate(result.conclusion_affectors, 1):
                lines.append(
                    f"### {i}. 【{rec.source.display_name}】{rec.record_id}"
                )
                lines.append("")
                lines.append(f"- 状态：{rec.status.badge} {rec.status.display_name}")
                lines.append(f"- 题干：{rec.question_text or '（空）'}")
                if rec.issues:
                    lines.append("- 问题清单：")
                    for issue in rec.issues:
                        lines.append(f"  - {issue}")
                lines.append("")
        else:
            lines.append("_本次无记录影响结论。_")
            lines.append("")

        lines.append("## 四、逐条明细")
        lines.append("")
        if not result.records:
            lines.append("_无有效记录可展示。_")
            lines.append("")
        else:
            for rec in result.records:
                self._render_record(rec, lines)

        lines.append("## 五、名词说明")
        lines.append("")
        lines.append("- **正常通过 ✅**：字段齐全、条件数有效、单位存在。")
        lines.append("- **需关注 ⚠️**：如单位缺失等不致命但影响规范性的问题，**不视为正常通过**。")
        lines.append("- **处理异常 ❌**：条件数解析失败、非正等严重问题。")
        lines.append("- **空集合 ∅**：题干或记录本身为空，**不允许隐藏在正常数据后**。")
        lines.append("- **数据来源**：正式录入 / 学生错题旧版 / 人工改判 / 口头备注；后三者会影响结论。")
        lines.append("")

        output.write("\n".join(lines))

    def _render_record(self, rec: ReviewRecord, lines: list[str]) -> None:
        lines.append(
            f"### {rec.record_id} · {rec.status.badge} {rec.status.display_name}"
        )
        lines.append("")
        lines.append(f"- **来源**：{rec.source.display_name}（`{rec.source.value}`）")
        if rec.affected_conclusion:
            lines.append("- **结论影响**：🔴 该条记录会影响最终复盘结论")
        else:
            lines.append("- **结论影响**：⚪ 该条记录不影响结论")
        lines.append(f"- **题干**：{rec.question_text or '（空）'}")
        if rec.student_answer is not None:
            lines.append(f"- **学生答案**：{rec.student_answer}")
        if rec.correct_answer is not None:
            lines.append(f"- **参考答案**：{rec.correct_answer}")
        lines.append(
            f"- **条件数**：{rec.condition_number if rec.condition_number is not None else '（未提供）'}"
        )
        lines.append(f"- **单位**：{rec.unit or '（缺失，本条非正常通过）'}")
        if rec.issues:
            lines.append("- **问题**：")
            for issue in rec.issues:
                lines.append(f"  - {issue}")
        if rec.evidence:
            lines.append("- **数字/信息溯源线索**：")
            for ev in rec.evidence:
                lines.append(f"  - `{ev.field_name}` = `{ev.raw_value}` → {ev.description}")
        lines.append("")
