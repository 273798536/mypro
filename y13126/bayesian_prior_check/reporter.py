from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from .models import (
    IssueSeverity,
    ParsedRecord,
    RunRecord,
    RunSummary,
)


class ReportGenerator:
    def __init__(self, run_record: RunRecord, storage):
        self.run_record = run_record
        self.storage = storage

    def generate_console_report(self) -> str:
        lines = []
        r = self.run_record
        s = r.summary

        lines.append("=" * 70)
        lines.append("  贝叶斯先验边界校验 - 处理结果报告")
        lines.append("=" * 70)
        lines.append("")
        lines.append(f"运行ID:     {r.run_id}")
        lines.append(f"状态:       {r.status.value}")
        lines.append(f"开始时间:   {r.started_at.strftime('%Y-%m-%d %H:%M:%S')}")
        if r.finished_at:
            lines.append(f"结束时间:   {r.finished_at.strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"数据文件:   {r.source_file}")
        if r.config_file:
            lines.append(f"配置文件:   {r.config_file}")
        if r.note:
            lines.append(f"备注说明:   {r.note}")
        lines.append("")
        lines.append("-" * 70)
        lines.append("  处理记录统计")
        lines.append("-" * 70)
        lines.append(f"  总行数:     {s.total_rows}")
        lines.append(f"  已处理行:   {s.processed_rows}")
        lines.append(f"  跳过行:     {s.skipped_rows}")
        lines.append(f"  坏行:       {s.bad_rows}")
        lines.append("")
        lines.append("-" * 70)
        lines.append("  问题统计")
        lines.append("-" * 70)
        lines.append(f"  问题总数:   {s.total_issues}")
        if s.issues_by_severity:
            lines.append("  按严重程度:")
            for sev, count in sorted(s.issues_by_severity.items()):
                lines.append(f"    - {sev.value if hasattr(sev, 'value') else sev}: {count}")
        if s.issues_by_type:
            lines.append("  按问题类型:")
            for typ, count in sorted(s.issues_by_type.items()):
                lines.append(f"    - {typ.value if hasattr(typ, 'value') else typ}: {count}")

        if r.error_message:
            lines.append("")
            lines.append("-" * 70)
            lines.append("  错误信息")
            lines.append("-" * 70)
            lines.append(f"  {r.error_message}")

        lines.append("")
        lines.append("=" * 70)
        return "\n".join(lines)

    def generate_console_details(self, limit: int = 20) -> str:
        lines = []
        details = self.storage.get_run_details(self.run_record.run_id)
        error_rows = [d for d in details if d["issues"]]

        if not error_rows:
            return "\n未发现任何问题。\n"

        lines.append("")
        lines.append("-" * 70)
        lines.append(f"  问题详情（显示前 {min(limit, len(error_rows))} 条）")
        lines.append("-" * 70)

        for idx, d in enumerate(error_rows[:limit]):
            lines.append("")
            lines.append(f"[{idx + 1}] 第 {d['row_number']} 行 (结果: {d['outcome']})")
            lines.append(f"    来源文件: {d['source_file']}")
            lines.append(f"    原始行:   {d['raw_line']}")
            for issue in d["issues"]:
                sev = issue.get("severity", "?")
                typ = issue.get("issue_type", "?")
                msg = issue.get("message", "")
                lines.append(f"    [{sev.upper()}] {typ}: {msg}")
                dz = issue.get("division_zero_trace")
                if dz:
                    lines.append(f"        表达式: {dz.get('expression')}")
                    lines.append(f"        分子: {dz.get('numerator_field')} = {dz.get('numerator_value')}")
                    lines.append(f"        分母: {dz.get('denominator_field')} = {dz.get('denominator_value')}")
                evidence = issue.get("evidence", {})
                if evidence and "boundary" in evidence:
                    b = evidence["boundary"]
                    lines.append(
                        f"        边界规则: min={b.get('min')}, max={b.get('max')}, "
                        f"min_inclusive={b.get('min_inclusive')}, max_inclusive={b.get('max_inclusive')}"
                    )
                if issue.get("boundary_rule"):
                    lines.append(f"        规则描述: {issue['boundary_rule']}")

        if len(error_rows) > limit:
            lines.append("")
            lines.append(f"  ... 还有 {len(error_rows) - limit} 条问题未显示，使用 --full 查看全部")

        lines.append("")
        return "\n".join(lines)

    def export_json(self, output_path: str) -> None:
        data = {
            "run": self.run_record.model_dump(mode="json"),
            "details": self.storage.get_run_details(self.run_record.run_id),
        }
        Path(output_path).write_text(
            json.dumps(data, ensure_ascii=False, indent=2, default=str),
            encoding="utf-8",
        )

    def generate_human_readable_report(self) -> str:
        lines = []
        r = self.run_record
        s = r.summary

        lines.append("# 贝叶斯先验边界校验 - 评审会说明报告")
        lines.append("")
        if r.note:
            lines.append(f"> 备注：{r.note}")
            lines.append("")

        lines.append("## 一、基本信息")
        lines.append("")
        lines.append(f"- **运行ID**：{r.run_id}")
        lines.append(f"- **数据来源**：{r.source_file}")
        lines.append(f"- **校验时间**：{r.started_at.strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("")

        lines.append("## 二、处理概览")
        lines.append("")
        lines.append(f"本次共读取 **{s.total_rows}** 行数据：")
        lines.append("")
        lines.append(f"- ✅ **已处理行**：{s.processed_rows} 行（正常解析并完成校验）")
        lines.append(f"- ⚠️ **跳过行**：{s.skipped_rows} 行（关键字段缺失，无法处理）")
        lines.append(f"- ❌ **坏行**：{s.bad_rows} 行（解析错误超过阈值）")
        lines.append("")

        lines.append("## 三、问题发现")
        lines.append("")
        lines.append(f"共发现 **{s.total_issues}** 个问题：")
        lines.append("")
        if s.issues_by_severity:
            for sev, count in sorted(s.issues_by_severity.items()):
                sev_name = sev.value if hasattr(sev, "value") else sev
                icon = {"error": "🔴", "warning": "🟡", "info": "🔵"}.get(sev_name, "•")
                lines.append(f"- {icon} **{sev_name.upper()}**：{count} 个")
        lines.append("")
        if s.issues_by_type:
            lines.append("按问题类型分类：")
            lines.append("")
            type_names = {
                "probability_out_of_range": "概率值越界",
                "conjugate_prior_invalid": "共轭先验参数越界",
                "division_by_zero": "除零边界问题",
                "parse_error": "数据解析错误",
                "missing_field": "字段缺失",
                "invalid_value": "非法值",
            }
            for typ, count in sorted(s.issues_by_type.items()):
                t_name = typ.value if hasattr(typ, "value") else typ
                zh_name = type_names.get(t_name, t_name)
                lines.append(f"- **{zh_name}**：{count} 个")
        lines.append("")

        details = self.storage.get_run_details(r.run_id)
        error_rows = [d for d in details if d["issues"]]
        if error_rows:
            lines.append("## 四、问题明细（附数字来源线索）")
            lines.append("")
            for d in error_rows:
                lines.append(f"### 第 {d['row_number']} 行")
                lines.append("")
                lines.append(f"- **原始行内容**：`{d['raw_line']}`")
                lines.append(f"- **处理结果**：{d['outcome']}")
                lines.append("")
                for issue in d["issues"]:
                    lines.append(f"**[{issue.get('severity','').upper()}] {issue.get('issue_type','')}**")
                    lines.append("")
                    lines.append(f"> {issue.get('message','')}")
                    lines.append("")
                    lines.append("- **数字来源线索**：")
                    if issue.get("field_name"):
                        lines.append(f"  - 字段名：`{issue['field_name']}`")
                    if issue.get("raw_value") is not None:
                        lines.append(f"  - 原始值：`{issue['raw_value']}`")
                    dz = issue.get("division_zero_trace")
                    if dz:
                        lines.append(f"  - 计算草稿表达式：`{dz.get('expression')}`")
                        lines.append(f"  - 分子字段 `{dz.get('numerator_field')}` = `{dz.get('numerator_value')}`")
                        lines.append(f"  - 分母字段 `{dz.get('denominator_field')}` = `{dz.get('denominator_value')}`")
                    evidence = issue.get("evidence", {})
                    if evidence:
                        for k, v in evidence.items():
                            if k not in ("boundary",):
                                lines.append(f"  - {k}：`{v}`")
                    if issue.get("boundary_rule"):
                        lines.append(f"  - 触发规则：{issue['boundary_rule']}")
                    if "boundary" in evidence:
                        b = evidence["boundary"]
                        lines.append(
                            f"  - 边界参数：min={b.get('min')}, max={b.get('max')}, "
                            f"min_inclusive={b.get('min_inclusive')}, max_inclusive={b.get('max_inclusive')}"
                        )
                    lines.append("")

        return "\n".join(lines)
