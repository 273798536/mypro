import json
import os
from datetime import datetime
from typing import List, Optional
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
from .models import VerificationReport, Evidence, ProcessingStatus


class ReportGenerator:
    def __init__(self, output_dir: str = "output"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        tpl_dir = Path(__file__).parent / "templates"
        self.jinja = Environment(
            loader=FileSystemLoader(str(tpl_dir)),
            keep_trailing_newline=True,
        )

    def _ensure_dir(self):
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def write_json(self, report: VerificationReport) -> str:
        self._ensure_dir()
        path = self.output_dir / f"{report.report_id}.json"
        data = report.model_dump(mode="json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return str(path)

    def write_markdown(self, report: VerificationReport) -> str:
        self._ensure_dir()
        path = self.output_dir / f"{report.report_id}.md"
        counts = report.summary_counts()
        lines: List[str] = []
        lines.append(f"# 排队窗口批量验算报告\n")
        lines.append(f"- **报告编号:** {report.report_id}")
        lines.append(f"- **生成时间:** {report.generated_at.strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"- **参数表A:** `{report.param_table_version_a}`")
        lines.append(f"- **参数表B:** `{report.param_table_version_b}`")
        lines.append("")

        lines.append("## 一、总览速览\n")
        lines.append(f"| 指标 | 数量 |")
        lines.append(f"| --- | ---: |")
        lines.append(f"| 窗口·已处理 | {counts['windows_handled']} |")
        lines.append(f"| 窗口·需补证据 | {counts['windows_need_evidence']} |")
        lines.append(f"| 窗口·待跟进 | {counts['windows_todo']} |")
        lines.append(f"| 判断结果变更 | {counts['judgment_changes']} |")
        lines.append(f"| 外推越界问题 | {counts['extrapolation_issues']} |")
        lines.append(f"| 待补证据 | {counts['evidences_pending']} |")
        lines.append(f"| 已提证据 | {counts['evidences_provided']} |")
        lines.append(f"| 权重变更记录 | {counts['weight_changes']} |")
        lines.append("")

        lines.append("## 二、参数表\n")
        lines.append("### 2.1 参数行一览\n")
        lines.append("| 行号 | 参数名 | 数值 | 单位 | 权重 | 有效范围 | 来源行 |")
        lines.append("| ---: | --- | ---: | --- | ---: | --- | --- |")
        for row in report.param_rows:
            vr = "-"
            if row.valid_range:
                vr = f"[{row.valid_range.get('min')}, {row.valid_range.get('max')}]"
            lines.append(
                f"| {row.row_number} | {row.param_name} | {row.param_value} | "
                f"{row.unit.value} | {row.weight} | {vr} | {row.source_line} |"
            )
        lines.append("")

        if report.weight_changes:
            lines.append("### 2.2 权重变更记录\n")
            lines.append("| 变更时间 | 操作人 | 参数名 | 旧权重 | 新权重 | 原因 |")
            lines.append("| --- | --- | --- | ---: | ---: | --- |")
            for c in report.weight_changes:
                lines.append(
                    f"| {c.changed_at.strftime('%Y-%m-%d %H:%M')} | {c.changed_by} | "
                    f"{c.param_name} | {c.old_weight} | **{c.new_weight}** | {c.reason or '-'} |"
                )
            lines.append("")

        if report.notes:
            lines.append("### 2.3 参数表备注\n")
            lines.append("| 时间 | 作者 | 类型 | 目标 | 内容 |")
            lines.append("| --- | --- | --- | --- | --- |")
            for n in report.notes:
                t = "**临时**" if n.is_temporary else "正式"
                safe = n.content.replace("|", "\\|").replace("\n", "<br>")
                lines.append(
                    f"| {n.created_at.strftime('%Y-%m-%d %H:%M')} | {n.author} | {t} | "
                    f"`{n.target_type}={n.target_id}` | {safe} |"
                )
            lines.append("")

        lines.append("## 三、窗口验算明细\n")
        for w in report.window_verdicts:
            status_map = {
                ProcessingStatus.HANDLED: "`已处理`",
                ProcessingStatus.NEED_EVIDENCE: "`需补证据`",
                ProcessingStatus.TODO: "`待跟进`",
            }
            lines.append(f"### {w.window_name}\n")
            lines.append(f"- **最终得分:** {w.final_score:.2f}")
            lines.append(f"- **判定结果:** `{w.outcome.value}`")
            lines.append(f"- **处理状态:** {status_map.get(w.handling_status, w.handling_status.value)}")
            if w.issues:
                lines.append(f"- **越界问题:** {', '.join('`'+i+'`' for i in w.issues)}")
            lines.append("")

            if w.issues:
                lines.append("#### 外推越界/数据异常\n")
                lines.append("| 参数 | 值 | 方向 | 有效区间 | 来源行 | 说明 |")
                lines.append("| --- | ---: | --- | --- | --- | --- |")
                for issue in report.extrapolation_issues:
                    if issue.issue_id in w.issues:
                        lines.append(
                            f"| {issue.param_name} | {issue.extrapolated_value} | "
                            f"**{issue.direction}** | "
                            f"[{issue.valid_min}, {issue.valid_max}] | "
                            f"{issue.source_line} | {issue.impact_description} |"
                        )
                lines.append("")

            lines.append("#### 中间计算步骤\n")
            for s in w.steps:
                lines.append(f"##### {s.step_name} `{s.step_id}`\n")
                lines.append(f"> {s.description}\n")
                if s.inputs:
                    inp_str = ", ".join(f"{k}={v}" for k, v in s.inputs.items())
                    lines.append(f"- **输入:** {inp_str}")
                if s.conversions:
                    for c in s.conversions:
                        lines.append(f"- **单位换算:** {c.conversion_formula}")
                if s.calculation:
                    lines.append("```")
                    lines.append(s.calculation)
                    lines.append("```")
                src_rows = " ".join(f"`{rid}`" for rid in s.source_row_ids) or "-"
                lines.append(
                    f"- **结果:** `{s.result_value:.4f} {s.result_unit.value}`  "
                    f"(来源行: {src_rows})"
                )
                lines.append("")

            if w.evidence_ids:
                lines.append("#### 关联证据\n")
                evs = [e for e in report.evidences if e.evidence_id in w.evidence_ids]
                lines.append("| ID | 标题 | 状态 | 说明 |")
                lines.append("| --- | --- | --- | --- |")
                for e in evs:
                    safe = e.description.replace("|", "\\|").replace("\n", "<br>")
                    lines.append(
                        f"| {e.evidence_id} | {e.title} | `{e.status.value}` | {safe} |"
                    )
                lines.append("")

        lines.append("## 四、判断变更清单\n")
        if report.judgments:
            lines.append("| 规则 | 旧结果 | 新结果 | 说明 | 触发参数 |")
            lines.append("| --- | --- | --- | --- | --- |")
            for j in report.judgments:
                triggers = ", ".join(j.related_param_changes) or "-"
                safe = j.explanation.replace("|", "\\|").replace("\n", "<br>")
                lines.append(
                    f"| {j.rule_name} | `{j.old_outcome.value}` | "
                    f"`{j.new_outcome.value}` | {safe} | {triggers} |"
                )
        else:
            lines.append("两组参数下所有判断结果一致，无变更。")
        lines.append("")

        lines.append("## 五、证据清单\n")
        if report.evidences:
            lines.append("| ID | 标题 | 状态 | 关联对象 | 说明 | 提交人 | 时间 |")
            lines.append("| --- | --- | --- | --- | --- | --- | --- |")
            for e in report.evidences:
                safe = e.description.replace("|", "\\|").replace("\n", "<br>")
                t = e.provided_at.strftime('%Y-%m-%d %H:%M') if e.provided_at else "-"
                lines.append(
                    f"| {e.evidence_id} | {e.title} | `{e.status.value}` | "
                    f"`{e.ref_type}={e.ref_id}` | {safe} | {e.provided_by or '-'} | {t} |"
                )
        else:
            lines.append("暂无需证据跟进的事项。")
        lines.append("")

        lines.append("## 六、历史时间线\n")
        lines.append("| 时间 | 类型 | 操作人 | 事件 |")
        lines.append("| --- | --- | --- | --- |")
        for e in sorted(report.timeline, key=lambda x: x.timestamp):
            safe = e.summary.replace("|", "\\|").replace("\n", "<br>")
            lines.append(
                f"| {e.timestamp.strftime('%Y-%m-%d %H:%M:%S')} | "
                f"`{e.event_type}` | {e.actor} | {safe} |"
            )
        lines.append("")

        lines.append("---\n")
        lines.append("> 排队窗口批量验算 · 交付说明: 参数表 → 处理记录 → 时间线，三者相互关联可追溯。")
        with open(path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
        return str(path)

    def write_html(self, report: VerificationReport) -> str:
        self._ensure_dir()
        path = self.output_dir / f"{report.report_id}.html"
        counts = report.summary_counts()
        timeline_events = sorted(report.timeline, key=lambda x: x.timestamp)
        template = self.jinja.get_template("report.html.j2")
        html = template.render(
            report=report,
            counts=counts,
            timeline_events=timeline_events,
        )
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)
        return str(path)

    def generate_all(self, report: VerificationReport) -> dict:
        return {
            "json": self.write_json(report),
            "markdown": self.write_markdown(report),
            "html": self.write_html(report),
        }
