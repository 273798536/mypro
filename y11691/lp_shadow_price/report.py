from __future__ import annotations

from typing import Optional

from .models import (
    LPInput,
    LPOutput,
    ValidationResult,
    SolutionStatus,
    ValidationIssueType,
)
from .sensitivity import SensitivityAnalyzer, SensitivitySummary


class ReportGenerator:
    def __init__(self, show_details: bool = True):
        self.show_details = show_details
        self.analyzer = SensitivityAnalyzer()

    def generate(
        self,
        lp_input: LPInput,
        lp_output: LPOutput,
        validation: ValidationResult,
    ) -> str:
        summary = self.analyzer.analyze(lp_input, lp_output)

        report_parts = []

        report_parts.append(self._generate_header(lp_input, lp_output))
        report_parts.append(self._generate_validation_section(validation))

        if lp_output.status == SolutionStatus.OPTIMAL:
            report_parts.append(self._generate_optimal_section(lp_input, lp_output, summary))
            report_parts.append(self._generate_sensitivity_section(summary))
        else:
            report_parts.append(self._generate_error_section(lp_output))

        report_parts.append(self._generate_sources_section(lp_input))
        report_parts.append(self._generate_corrections_section(lp_input))

        return "\n\n".join(report_parts)

    def _generate_header(self, lp_input: LPInput, lp_output: LPOutput) -> str:
        lines = [
            "# 线性规划求解报告",
            "",
            f"- **版本**: {lp_input.version}",
            f"- **描述**: {lp_input.description}",
            f"- **求解状态**: {self._status_text(lp_output.status)}",
            f"- **求解时间**: {lp_output.solve_time:.3f} 秒",
            f"- **生成时间**: {lp_output.created_at}",
        ]

        if lp_output.status == SolutionStatus.OPTIMAL:
            lines.append(f"- **最大利润**: {lp_output.total_profit:.2f}")

        if lp_output.is_degenerate:
            lines.append("- ⚠️ **注意**: 检测到退化解，影子价格解释需谨慎")

        return "\n".join(lines)

    def _generate_validation_section(self, validation: ValidationResult) -> str:
        parts = ["## 数据校验结果", ""]

        if not validation.issues:
            parts.append("✅ 所有数据校验通过，无问题。")
            return "\n".join(parts)

        parts.append(f"共发现 {len(validation.issues)} 个问题：")
        parts.append("")

        if validation.needs_review:
            parts.append("### 🔴 需要人工确认")
            parts.append("")
            for issue in validation.needs_review:
                parts.append(f"- **{issue.category}**: {issue.message}")
                if issue.field:
                    parts.append(f"  - 字段: `{issue.field}`")
                if self.show_details and issue.details:
                    parts.append(f"  - 详情: {issue.details}")
            parts.append("")

        if validation.corrected:
            parts.append("### 🟡 已自动修正")
            parts.append("")
            for issue in validation.corrected:
                parts.append(f"- **{issue.category}**: {issue.message}")
                if issue.field:
                    parts.append(f"  - 字段: `{issue.field}`")
                if self.show_details and issue.details:
                    parts.append(f"  - 修正详情: {issue.details}")
            parts.append("")

        if validation.unprocessed:
            parts.append("### ⚪ 未处理（提示）")
            parts.append("")
            for issue in validation.unprocessed:
                parts.append(f"- **{issue.category}**: {issue.message}")
            parts.append("")

        return "\n".join(parts)

    def _generate_optimal_section(
        self,
        lp_input: LPInput,
        lp_output: LPOutput,
        summary: SensitivitySummary,
    ) -> str:
        parts = ["## 最优生产方案", ""]

        parts.append("### 生产计划")
        parts.append("")
        parts.append("| 产品 | 产量 | 单位 | 单位利润 | 总贡献 | 检验成本 |")
        parts.append("|------|------|------|----------|--------|----------|")

        for pr in sorted(lp_output.products, key=lambda x: x.profit_contribution, reverse=True):
            unit_profit = pr.profit_contribution / pr.production_amount if pr.production_amount > 0 else 0
            parts.append(
                f"| {pr.product_name} | {pr.production_amount:.2f} | {pr.unit} | "
                f"{unit_profit:.2f} | {pr.profit_contribution:.2f} | {pr.reduced_cost:.4f} |"
            )
        parts.append("")

        total_production = sum(p.production_amount for p in lp_output.products)
        parts.append(f"**总产量**: {total_production:.2f} 单位")
        parts.append(f"**总利润**: {lp_output.total_profit:.2f}")
        parts.append("")

        if summary.unprofitable_products:
            parts.append("### 未安排生产的产品")
            parts.append("")
            for pr in summary.unprofitable_products:
                parts.append(f"- **{pr.product_name}**: 检验成本 {pr.reduced_cost:.4f}")
                parts.append(f"  - 单位利润需提高 {-pr.reduced_cost:.4f} 才值得生产")
            parts.append("")

        return "\n".join(parts)

    def _generate_sensitivity_section(self, summary: SensitivitySummary) -> str:
        parts = ["## 敏感性分析（影子价格）", ""]

        if summary.bottleneck_resources:
            parts.append("### 🔴 瓶颈资源（影子价格 > 0）")
            parts.append("")
            parts.append("| 约束名称 | 影子价格 | 当前值 | 单位 | 含义 |")
            parts.append("|----------|----------|--------|------|------|")

            for sp in summary.bottleneck_resources:
                parts.append(
                    f"| {sp.constraint_name} | {sp.shadow_price:.4f} | "
                    f"{sp.current_rhs:.2f} | {sp.unit} | "
                    f"每增加1{sp.unit}，利润增加 {sp.shadow_price:.4f} |"
                )
            parts.append("")

            parts.append("#### 瓶颈资源详细解释")
            parts.append("")
            for sp in summary.bottleneck_resources:
                parts.append(f"**{sp.constraint_name}**")
                parts.append("")
                parts.append(self.analyzer.get_bottleneck_explanation(sp))
                parts.append("")

        if summary.unused_resources:
            parts.append("### 🟢 非瓶颈资源（影子价格 = 0）")
            parts.append("")
            parts.append("这些资源当前有冗余，增加供应量不会提高利润：")
            parts.append("")
            for sp in summary.unused_resources:
                parts.append(f"- {sp.constraint_name}: 当前可用 {sp.current_rhs:.2f}{sp.unit}")
            parts.append("")

        return "\n".join(parts)

    def _generate_error_section(self, lp_output: LPOutput) -> str:
        parts = ["## 求解结果说明", ""]

        status_emoji = {
            SolutionStatus.INFEASIBLE: "🚫",
            SolutionStatus.UNBOUNDED: "♾️",
            SolutionStatus.ERROR: "❌",
        }.get(lp_output.status, "⚠️")

        parts.append(f"{status_emoji} **{self._status_text(lp_output.status)}**")
        parts.append("")

        for msg in lp_output.messages:
            parts.append(f"- {msg}")
        parts.append("")

        return "\n".join(parts)

    def _generate_sources_section(self, lp_input: LPInput) -> str:
        if not lp_input.sources:
            return ""

        parts = ["## 数据来源", ""]
        for i, source in enumerate(lp_input.sources, 1):
            source_str = f"{i}. **{source.name}**"
            extras = []
            if source.file:
                extras.append(f"文件: {source.file}")
            if source.sheet:
                extras.append(f"工作表: {source.sheet}")
            if source.row:
                extras.append(f"行: {source.row}")
            if extras:
                source_str += f" ({', '.join(extras)})"
            if source.note:
                source_str += f" - {source.note}"
            parts.append(source_str)
        return "\n".join(parts)

    def _generate_corrections_section(self, lp_input: LPInput) -> str:
        if not lp_input.corrections:
            return ""

        parts = ["## 修正历史", ""]
        for corr in lp_input.corrections:
            parts.append(f"- **{corr.timestamp}** - {corr.operator}: {corr.description}")
            parts.append(f"  - 字段 `{corr.field}`: `{corr.old_value}` → `{corr.new_value}`")
        return "\n".join(parts)

    def _status_text(self, status: SolutionStatus) -> str:
        return {
            SolutionStatus.OPTIMAL: "已找到最优解",
            SolutionStatus.INFEASIBLE: "模型不可行（约束冲突）",
            SolutionStatus.UNBOUNDED: "模型无界（缺少约束）",
            SolutionStatus.DEGENERATE: "退化解",
            SolutionStatus.ERROR: "求解出错",
        }.get(status, status.value)
