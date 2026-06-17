from typing import List, Dict, Any
from datetime import datetime
from collections import defaultdict

from models import (
    ReportData, ComparisonItem, JudgmentStatus, ChangeType,
    ThresholdDriftRecord, BadDataRecord, Attachment
)
from engine import generate_detail_rows


class MarkdownReportGenerator:
    def __init__(self):
        self.status_emoji = {
            JudgmentStatus.PASS: "✅",
            JudgmentStatus.FAIL: "❌",
            JudgmentStatus.PENDING: "⏳",
            JudgmentStatus.SUSPENDED: "🚫",
        }
        self.change_type_labels = {
            ChangeType.SAMPLE_CHANGED: "样本变化",
            ChangeType.THRESHOLD_CHANGED: "阈值变化",
            ChangeType.MANUAL_REVISED: "人工改判",
            ChangeType.LATE_ATTACHMENT: "晚到附件",
            ChangeType.NO_CHANGE: "无变化",
        }

    def generate(self, report_data: ReportData) -> str:
        sections = []

        sections.append(self._generate_header(report_data))
        sections.append(self._generate_filter_conditions(report_data))
        sections.append(self._generate_summary_statistics(report_data))
        sections.append(self._generate_change_breakdown(report_data))
        sections.append(self._generate_threshold_drift_section(report_data))
        sections.append(self._generate_late_attachment_section(report_data))
        sections.append(self._generate_bad_data_section(report_data))
        sections.append(self._generate_suspended_section(report_data))
        sections.append(self._generate_detail_table(report_data))
        sections.append(self._generate_conclusion(report_data))

        return "\n\n---\n\n".join(sections)

    def _generate_header(self, report_data: ReportData) -> str:
        lines = [
            "# 工业视觉灰度对比报告",
            "",
            f"> 生成时间: {report_data.generated_at.strftime('%Y-%m-%d %H:%M:%S')}",
            f"> 数据来源: 统一报告数据集 (ReportData)",
            "",
        ]
        return "\n".join(lines)

    def _generate_filter_conditions(self, report_data: ReportData) -> str:
        lines = ["## 📋 筛选条件", ""]
        filters = report_data.filter_conditions

        if not filters:
            lines.append("_无筛选条件，展示全部数据_")
            return "\n".join(lines)

        filter_labels = {
            "product_line": "产品线",
            "category": "类别",
            "batch_number": "批次号",
            "status": "状态",
            "change_type": "变更类型",
            "has_threshold_drift": "存在阈值漂移",
            "has_manual_judgment": "存在人工改判",
            "is_suspended": "已挂起",
            "date_from": "起始日期",
            "date_to": "结束日期",
        }

        for key, value in filters.items():
            if value is not None and value != "":
                label = filter_labels.get(key, key)
                if isinstance(value, datetime):
                    display_value = value.strftime("%Y-%m-%d %H:%M:%S")
                elif isinstance(value, bool):
                    display_value = "是" if value else "否"
                else:
                    display_value = str(value)
                lines.append(f"- **{label}**: {display_value}")

        return "\n".join(lines)

    def _generate_summary_statistics(self, report_data: ReportData) -> str:
        stats = report_data.statistics
        lines = ["## 📊 统计摘要", ""]

        total = stats.get("total_count", 0)
        pass_count = stats.get("pass_count", 0)
        fail_count = stats.get("fail_count", 0)
        suspended = stats.get("suspended_count", 0)
        pass_rate = stats.get("pass_rate", 0)
        fail_rate = stats.get("fail_rate", 0)

        lines.append("### 核心指标")
        lines.append("")
        lines.append("| 指标 | 数值 |")
        lines.append("|------|------|")
        lines.append(f"| 总样本数 | {total} |")
        lines.append(f"| ✅ 通过数 | {pass_count} ({pass_rate * 100:.2f}%) |")
        lines.append(f"| ❌ 失败数 | {fail_count} ({fail_rate * 100:.2f}%) |")
        lines.append(f"| 🚫 挂起数 | {suspended} |")
        lines.append(f"| 平均模型分数 | {stats.get('average_model_score', 0):.4f} |")
        lines.append(f"| 平均置信度 | {stats.get('average_confidence', 0):.4f} |")
        lines.append("")

        lines.append("### 基线 vs 当前对比")
        lines.append("")
        baseline_pass = stats.get("baseline_pass_count", 0)
        current_pass = stats.get("current_pass_count", 0)
        pass_diff = stats.get("pass_count_difference", 0)
        rate_diff = stats.get("pass_rate_difference", 0)

        diff_symbol = "↑" if pass_diff > 0 else "↓" if pass_diff < 0 else "→"
        lines.append(f"- 基线通过数: {baseline_pass}")
        lines.append(f"- 当前通过数: {current_pass}")
        lines.append(f"- 差值: {diff_symbol} {abs(pass_diff)} ({rate_diff * 100:+.2f}%)")
        lines.append("")

        lines.append("### 变更类型分布")
        lines.append("")
        change_dist = stats.get("change_type_distribution", {})
        for ct, count in change_dist.items():
            label = self.change_type_labels.get(ChangeType(ct), ct)
            pct = (count / total * 100) if total > 0 else 0
            lines.append(f"- {label}: {count} ({pct:.2f}%)")

        return "\n".join(lines)

    def _generate_change_breakdown(self, report_data: ReportData) -> str:
        lines = ["## 🔍 变更拆解分析", ""]

        sample_changed = [i for i in report_data.items if i.change_type == ChangeType.SAMPLE_CHANGED]
        threshold_changed = [i for i in report_data.items if i.change_type == ChangeType.THRESHOLD_CHANGED]
        manual_revised = [i for i in report_data.items if i.change_type == ChangeType.MANUAL_REVISED]

        lines.append(f"> 本部分从同一数据源拆解三种变更类型，确保数据一致性")
        lines.append("")

        lines.append("### 📦 1. 样本变化 (Sample Changed)")
        lines.append(f"_样本本身特征变化导致判定结果变更_")
        lines.append("")
        if sample_changed:
            lines.append(f"共 {len(sample_changed)} 条样本发生变化:")
            lines.append("")
            lines.append("| 样本ID | 产品线 | 类别 | 基线状态 | 当前状态 | 模型分数 | 置信度 |")
            lines.append("|--------|--------|------|----------|----------|----------|--------|")
            for item in sample_changed:
                lines.append(
                    f"| {item.sample_id} | {item.sample.product_line} | {item.sample.category} | "
                    f"{self.status_emoji[item.baseline_status]} {item.baseline_status.value} | "
                    f"{self.status_emoji[item.current_status]} {item.current_status.value} | "
                    f"{item.model_output.model_score:.4f} | {item.model_output.confidence:.4f} |"
                )
        else:
            lines.append("_无样本变化_")
        lines.append("")

        lines.append("### 📏 2. 阈值变化 (Threshold Changed)")
        lines.append(f"_阈值配置或阈值漂移导致判定结果变更_")
        lines.append("")
        if threshold_changed:
            lines.append(f"共 {len(threshold_changed)} 条样本受阈值变化影响:")
            lines.append("")
            lines.append("| 样本ID | 产品线 | 类别 | 阈值版本 | 漂移幅度 | 基线状态 | 当前状态 | 模型分数 |")
            lines.append("|--------|--------|------|----------|----------|----------|----------|----------|")
            for item in threshold_changed:
                drift = item.threshold_drift
                drift_mag = f"{drift.drift_magnitude:.4f}" if drift else "N/A"
                version = drift.current_threshold_version if drift else "N/A"
                lines.append(
                    f"| {item.sample_id} | {item.sample.product_line} | {item.sample.category} | "
                    f"{version} | {drift_mag} | "
                    f"{self.status_emoji[item.baseline_status]} {item.baseline_status.value} | "
                    f"{self.status_emoji[item.current_status]} {item.current_status.value} | "
                    f"{item.model_output.model_score:.4f} |"
                )
        else:
            lines.append("_无阈值变化_")
        lines.append("")

        lines.append("### 👤 3. 人工改判 (Manual Revised)")
        lines.append(f"_人工干预修改了模型判定结果_")
        lines.append("")
        if manual_revised:
            lines.append(f"共 {len(manual_revised)} 条样本被人工改判:")
            lines.append("")
            lines.append("| 样本ID | 操作员 | 原始状态 | 改判后状态 | 改判原因 | 改判时间 |")
            lines.append("|--------|--------|----------|------------|----------|----------|")
            for item in manual_revised:
                mj = item.manual_judgment
                lines.append(
                    f"| {item.sample_id} | {mj.operator} | "
                    f"{self.status_emoji[item.baseline_status]} {item.baseline_status.value} | "
                    f"{self.status_emoji[mj.judgment]} {mj.judgment.value} | "
                    f"{mj.reason} | {mj.judged_at.strftime('%Y-%m-%d %H:%M:%S')} |"
                )
        else:
            lines.append("_无人工改判_")

        return "\n".join(lines)

    def _generate_threshold_drift_section(self, report_data: ReportData) -> str:
        drifts = report_data.threshold_drifts
        if not drifts:
            return ""

        lines = ["## ⚠️ 阈值漂移详情", ""]
        lines.append(f"> 检测到 {len(drifts)} 条阈值漂移记录，相关样本已**挂起**等待运营主管确认")
        lines.append("")

        drift_groups = defaultdict(list)
        for drift in drifts:
            key = (drift.product_line, drift.category, drift.current_threshold_version)
            drift_groups[key].append(drift)

        for (pl, cat, version), group in drift_groups.items():
            avg_drift = sum(d.drift_magnitude for d in group) / len(group)
            lines.append(f"### {pl} / {cat} (阈值版本: {version})")
            lines.append("")
            lines.append(f"- 影响样本数: {len(group)}")
            lines.append(f"- 平均漂移幅度: {avg_drift:.4f}")
            lines.append(f"- 建议操作: **SUSPEND_FOR_REVIEW (挂起待审核)**")
            lines.append("")
            lines.append("| 样本ID | 漂移幅度 | 是否需要确认 |")
            lines.append("|--------|----------|--------------|")
            for drift in group:
                needs_confirm = "✅ 是" if drift.needs_operation_confirm else "❌ 否"
                lines.append(f"| {drift.sample_id} | {drift.drift_magnitude:.4f} | {needs_confirm} |")
            lines.append("")

        return "\n".join(lines)

    def _generate_late_attachment_section(self, report_data: ReportData) -> str:
        attachments = report_data.late_attachments
        if not attachments:
            return ""

        lines = ["## 📎 晚到附件详情", ""]
        lines.append(f"> 共 {len(attachments)} 个晚到附件，已自动关联到对应样本结论")
        lines.append("")

        lines.append("| 附件ID | 关联样本 | 文件类型 | 上传时间 | 是否晚到 | 描述 |")
        lines.append("|--------|----------|----------|----------|----------|------|")
        for att in attachments:
            is_late = "✅ 是" if att.is_late_arrival else "❌ 否"
            lines.append(
                f"| {att.attachment_id} | {att.sample_id} | {att.file_type} | "
                f"{att.uploaded_at.strftime('%Y-%m-%d %H:%M:%S')} | {is_late} | {att.description} |"
            )

        return "\n".join(lines)

    def _generate_bad_data_section(self, report_data: ReportData) -> str:
        bad_data = report_data.bad_data_records
        if not bad_data:
            return ""

        lines = ["## 🚨 坏数据追踪", ""]
        lines.append(f"> 检测到 {len(bad_data)} 条坏数据记录，已指向模型输出原始行和具体对象")
        lines.append("")

        lines.append("| 样本ID | 问题类型 | 严重程度 | 模型输出行号 | 模型对象引用 | 问题描述 |")
        lines.append("|--------|----------|----------|--------------|--------------|----------|")
        for bd in bad_data:
            severity = "🔴 ERROR" if bd.severity == "error" else "🟡 WARNING"
            line_ref = f"[行 {bd.model_output_line}](file://model_outputs.csv#L{bd.model_output_line})" if bd.model_output_line else "N/A"
            obj_ref = f"`{bd.model_object_ref}`" if bd.model_object_ref else "N/A"
            lines.append(
                f"| {bd.sample_id} | {bd.issue_type} | {severity} | {line_ref} | {obj_ref} | {bd.description} |"
            )

        return "\n".join(lines)

    def _generate_suspended_section(self, report_data: ReportData) -> str:
        suspended = [i for i in report_data.items if i.is_suspended]
        if not suspended:
            return ""

        lines = ["## 🚫 挂起样本 (需运营主管确认)", ""]
        lines.append(f"> 共 {len(suspended)} 条样本因阈值漂移挂起，**不给出假稳定结论**，等待人工确认")
        lines.append("")

        lines.append("| 样本ID | 产品线 | 类别 | 挂起原因 | 模型输出行号 |")
        lines.append("|--------|--------|------|----------|--------------|")
        for item in suspended:
            line_ref = f"[行 {item.model_output.raw_line_number}](file://model_outputs.csv#L{item.model_output.raw_line_number})"
            lines.append(
                f"| {item.sample_id} | {item.sample.product_line} | {item.sample.category} | "
                f"{item.suspension_reason} | {line_ref} |"
            )

        return "\n".join(lines)

    def _generate_detail_table(self, report_data: ReportData) -> str:
        rows = generate_detail_rows(report_data.items)
        if not rows:
            return "## 📄 明细表\n\n_无数据_"

        lines = ["## 📄 明细表", ""]
        lines.append(f"> 共 {len(rows)} 条记录，与筛选条件、统计数字来自同一数据源")
        lines.append("")

        lines.append("| # | 样本ID | 产品线 | 类别 | 批次 | 模型分数 | 基线 | 当前 | 变更类型 | 挂起 | 漂移 | 人工 | 晚到附件 | 坏数据 | 原始行 |")
        lines.append("|---|--------|--------|------|------|----------|------|------|----------|------|------|------|----------|--------|--------|")

        for row in rows:
            suspended = "🚫" if row["is_suspended"] else ""
            drift = "⚠️" if row["has_threshold_drift"] else ""
            manual = "👤" if row["has_manual_judgment"] else ""
            late_att = "📎" if row["has_late_attachment"] else ""
            bad_data = "🚨" if row["has_bad_data"] else ""
            change_label = self.change_type_labels.get(ChangeType(row["change_type"]), row["change_type"])

            lines.append(
                f"| {row['row_index']} | {row['sample_id']} | {row['product_line']} | {row['category']} | "
                f"{row['batch_number']} | {row['model_score']:.4f} | "
                f"{row['baseline_status']} | {row['current_status']} | {change_label} | "
                f"{suspended} | {drift} | {manual} | {late_att} | {bad_data} | {row['model_output_line']} |"
            )

        return "\n".join(lines)

    def _generate_conclusion(self, report_data: ReportData) -> str:
        stats = report_data.statistics
        lines = ["## 🎯 结论与建议", ""]

        total = stats.get("total_count", 0)
        suspended = stats.get("suspended_count", 0)
        drift_count = stats.get("threshold_drift_count", 0)
        bad_data_count = stats.get("bad_data_count", 0)
        late_att_count = stats.get("late_attachment_count", 0)

        if suspended > 0:
            lines.append(
                f"> ⚠️ **重要提醒**: 有 {suspended} 条样本因阈值漂移挂起，"
                f"需运营主管确认后才能给出最终结论。系统未输出假稳定结果。"
            )
            lines.append("")

        lines.append("### 关键发现")
        lines.append("")
        lines.append(f"- 通过率变化: {stats.get('pass_rate_difference', 0) * 100:+.2f}%")
        if drift_count > 0:
            lines.append(f"- 检测到 {drift_count} 条阈值漂移记录")
        if bad_data_count > 0:
            lines.append(f"- 发现 {bad_data_count} 条坏数据，已追踪到原始行")
        if late_att_count > 0:
            lines.append(f"- 关联 {late_att_count} 个晚到附件到对应结论")
        lines.append("")

        lines.append("### 建议行动")
        lines.append("")
        if suspended > 0:
            lines.append(f"- 🔴 **高优先级**: 运营主管审核 {suspended} 条挂起样本")
        if drift_count > 0:
            lines.append(f"- 🟡 **中优先级**: 分析阈值漂移原因，评估是否需要调整阈值配置")
        if bad_data_count > 0:
            lines.append(f"- 🟡 **中优先级**: 处理坏数据，检查模型输出质量")
        if late_att_count > 0:
            lines.append(f"- 🟢 **低优先级**: 评估晚到附件对结论的影响")

        return "\n".join(lines)
