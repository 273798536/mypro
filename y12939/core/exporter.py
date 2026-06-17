import io
from datetime import datetime
from typing import List
import pandas as pd
from data.models import TrainingRecord, FailureCategory, RecordStatus
from core.engine import SafetyRuleEngine, RetryEngine
from core.statistics import StatisticsService


class ReportExporter:
    def __init__(self):
        self.safety_engine = SafetyRuleEngine()
        self.retry_engine = RetryEngine(self.safety_engine)
        self.stats = StatisticsService()

    def export_markdown(self, records: List[TrainingRecord]) -> str:
        snapshot = self.stats.build_snapshot(records)
        unusable = [r for r in records if r.current_status == RecordStatus.BLOCKED]
        safety_issues = [
            r for r in records
            if r.failure_category in (
                FailureCategory.SAFETY_RULE_MISSING,
                FailureCategory.SAFETY_RULE_MISMATCH,
            )
        ]
        lines = []
        lines.append(f"# 训练失败重试编排 - 安全规则检查报告")
        lines.append("")
        lines.append(f"**生成时间**：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"**记录总数**：{snapshot.total_records}")
        lines.append(f"**安全规则问题占比**：{snapshot.safety_missing_rate * 100:.1f}%")
        lines.append(f"**可重试率**：{snapshot.retryable_rate * 100:.1f}%")
        lines.append("")

        lines.append("## 一、总览统计")
        lines.append("")
        lines.append("### 按状态分布")
        lines.append("")
        lines.append("| 状态 | 数量 |")
        lines.append("|------|------|")
        for status, cnt in snapshot.by_status.items():
            lines.append(f"| {status} | {cnt} |")
        lines.append("")

        lines.append("### 按失败类别分布")
        lines.append("")
        lines.append("| 失败类别 | 数量 |")
        lines.append("|----------|------|")
        for cat, cnt in snapshot.by_failure_category.items():
            lines.append(f"| {cat} | {cnt} |")
        lines.append("")

        lines.append("## 二、哪些记录不能用（重点）")
        lines.append("")
        lines.append("> 训练组月底转交时，以下记录判定为不可用，请勿重试。")
        lines.append("")
        if not unusable:
            lines.append("当前无不可用记录。")
        else:
            lines.append("| 记录ID | 题型 | 失败原因 | 安全规则 | 题库匹配 | 重试次数 | 人工备注(原话) |")
            lines.append("|--------|------|----------|----------|----------|----------|----------------|")
            for r in unusable:
                sr = ", ".join(r.safety_rule_ids) if r.safety_rule_ids else "**漏配**"
                bank = "是" if r.matched_question_bank else "**否**"
                note = r.raw_manual_note.replace("|", "｜").replace("\n", " ") if r.raw_manual_note else ""
                lines.append(
                    f"| {r.record_id} | {r.question_type} | {r.failure_category.value} | "
                    f"{sr} | {bank} | {r.retry_count} | {note} |"
                )
        lines.append("")

        lines.append("## 三、安全规则漏配 / 不匹配详情")
        lines.append("")
        lines.append("> 只看本章节即可理解：哪些记录被安全规则拦下来、为什么拦。")
        lines.append("")
        if not safety_issues:
            lines.append("当前无安全规则相关问题。")
        else:
            for r in safety_issues:
                decision = self.retry_engine.decide(r)
                lines.append(f"### {r.record_id} - {r.question_type}")
                lines.append("")
                lines.append(f"- **失败类别**：{r.failure_category.value}")
                lines.append(
                    f"- **已匹配安全规则**："
                    f"{', '.join(r.safety_rule_ids) if r.safety_rule_ids else '无（漏配）'}"
                )
                lines.append(
                    f"- **评测题库是否匹配**："
                    f"{'是' if r.matched_question_bank else '否'}"
                )
                lines.append(f"- **系统判定能否重试**：{'可重试' if decision.can_retry else '不可重试'}")
                lines.append(f"- **判定理由**：{decision.reason}")
                lines.append("")
                lines.append("**安全问题分析**：")
                lines.append("")
                issues = self.safety_engine.analyze_safety_issues(r)
                for issue in issues:
                    lines.append(f"- {issue}")
                if not issues:
                    lines.append(f"- {r.failure_detail}")
                lines.append("")
                if decision.required_fixes:
                    lines.append("**需要修复的动作**：")
                    lines.append("")
                    for fix in decision.required_fixes:
                        lines.append(f"- [ ] {fix}")
                    lines.append("")
                if r.raw_manual_note:
                    lines.append(f"**人工备注（原话保留）**：")
                    lines.append("")
                    lines.append(f"> {r.raw_manual_note}")
                    lines.append("")
                lines.append("---")
                lines.append("")

        lines.append("## 四、完整记录明细表")
        lines.append("")
        df = self.stats.status_dataframe(records)
        lines.append(df.to_markdown(index=False))
        lines.append("")
        return "\n".join(lines)

    def export_html(self, records: List[TrainingRecord]) -> str:
        md = self.export_markdown(records)
        html_body = self._markdown_to_simple_html(md)
        wrapper = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>训练失败重试编排 - 安全规则检查报告</title>
<style>
body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
       margin: 32px; line-height: 1.7; color: #222; max-width: 1100px; }}
h1 {{ border-bottom: 3px solid #c0392b; padding-bottom: 8px; }}
h2 {{ border-bottom: 1px solid #ccc; padding-bottom: 6px; margin-top: 32px; color: #c0392b; }}
h3 {{ color: #2c3e50; margin-top: 20px; }}
table {{ border-collapse: collapse; width: 100%; margin: 12px 0; }}
th, td {{ border: 1px solid #ddd; padding: 8px 12px; text-align: left; font-size: 14px; }}
th {{ background: #f5f5f5; }}
blockquote {{ border-left: 4px solid #e67e22; padding: 8px 16px;
              background: #fff8e1; color: #555; margin: 8px 0; }}
code {{ background: #f0f0f0; padding: 2px 6px; border-radius: 3px; }}
ul {{ padding-left: 24px; }}
strong {{ color: #c0392b; }}
</style>
</head>
<body>
{html_body}
</body>
</html>"""
        return wrapper

    def _markdown_to_simple_html(self, md: str) -> str:
        lines = md.split("\n")
        html_lines = []
        in_table = False
        table_rows = []
        for line in lines:
            if line.startswith("# "):
                self._flush_table(html_lines, table_rows)
                in_table, table_rows = False, []
                html_lines.append(f"<h1>{line[2:]}</h1>")
            elif line.startswith("## "):
                self._flush_table(html_lines, table_rows)
                in_table, table_rows = False, []
                html_lines.append(f"<h2>{line[3:]}</h2>")
            elif line.startswith("### "):
                self._flush_table(html_lines, table_rows)
                in_table, table_rows = False, []
                html_lines.append(f"<h3>{line[4:]}</h3>")
            elif line.startswith("> "):
                self._flush_table(html_lines, table_rows)
                in_table, table_rows = False, []
                html_lines.append(f"<blockquote>{line[2:]}</blockquote>")
            elif line.startswith("- [ ]") or line.startswith("- [x]"):
                self._flush_table(html_lines, table_rows)
                in_table, table_rows = False, []
                checked = "checked" if line.startswith("- [x]") else ""
                html_lines.append(
                    f'<div><input type="checkbox" disabled {checked}> {line[5:]}</div>'
                )
            elif line.startswith("- "):
                self._flush_table(html_lines, table_rows)
                in_table, table_rows = False, []
                html_lines.append(f"<li>{line[2:]}</li>")
            elif line.startswith("|") and "---" not in line:
                in_table = True
                cells = [c.strip() for c in line.strip("|").split("|")]
                table_rows.append(cells)
            elif line.strip() == "":
                self._flush_table(html_lines, table_rows)
                in_table, table_rows = False, []
                html_lines.append("")
            elif line.startswith("---"):
                continue
            else:
                self._flush_table(html_lines, table_rows)
                in_table, table_rows = False, []
                html_lines.append(f"<p>{line}</p>")
        self._flush_table(html_lines, table_rows)
        return "\n".join(html_lines)

    def _flush_table(self, html_lines, table_rows):
        if not table_rows:
            return
        header = table_rows[0]
        body = table_rows[1:]
        html_lines.append("<table>")
        html_lines.append("<thead><tr>")
        for h in header:
            html_lines.append(f"<th>{h}</th>")
        html_lines.append("</tr></thead>")
        if body:
            html_lines.append("<tbody>")
            for row in body:
                html_lines.append("<tr>")
                for cell in row:
                    cell = cell.replace("**", "<strong>").replace("**", "</strong>")
                    html_lines.append(f"<td>{cell}</td>")
                html_lines.append("</tr>")
            html_lines.append("</tbody>")
        html_lines.append("</table>")
        table_rows.clear()

    def export_excel(self, records: List[TrainingRecord]) -> bytes:
        buffer = io.BytesIO()
        with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
            df_all = self.stats.status_dataframe(records)
            df_all.to_excel(writer, sheet_name="全部记录", index=False)

            safety_df = self.stats.safety_issue_dataframe(records)
            safety_df.to_excel(writer, sheet_name="安全规则问题", index=False)

            batch_df = self.stats.batch_summary(records)
            batch_df.to_excel(writer, sheet_name="批次汇总", index=False)

            unusable = [r for r in records if r.current_status == RecordStatus.BLOCKED]
            unusable_df = self.stats.status_dataframe(unusable) if unusable else pd.DataFrame()
            if not unusable_df.empty:
                unusable_df.to_excel(writer, sheet_name="不可用记录", index=False)

            summary_lines = []
            snapshot = self.stats.build_snapshot(records)
            summary_lines.append({"指标": "记录总数", "值": snapshot.total_records})
            summary_lines.append({
                "指标": "安全规则问题占比",
                "值": f"{snapshot.safety_missing_rate * 100:.1f}%",
            })
            summary_lines.append({
                "指标": "可重试率",
                "值": f"{snapshot.retryable_rate * 100:.1f}%",
            })
            for status, cnt in snapshot.by_status.items():
                summary_lines.append({"指标": f"状态 - {status}", "值": cnt})
            for cat, cnt in snapshot.by_failure_category.items():
                summary_lines.append({"指标": f"失败类别 - {cat}", "值": cnt})
            pd.DataFrame(summary_lines).to_excel(
                writer, sheet_name="统计汇总", index=False
            )
        buffer.seek(0)
        return buffer.getvalue()
