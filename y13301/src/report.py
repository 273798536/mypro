from typing import List, Optional
from datetime import datetime
from .models import (
    ComparisonResult,
    EvaluationSample,
    VersionNote,
    WithdrawalRecord,
    SupplementaryNote,
    JudgmentStatus,
)


class ReportGenerator:
    def __init__(self, title: str = "客服摘要灰度对比报告"):
        self.title = title
        self.generated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    def generate(
        self,
        result: ComparisonResult,
        version_notes: Optional[List[VersionNote]] = None,
        withdrawals: Optional[List[WithdrawalRecord]] = None,
        supplementary: Optional[List[SupplementaryNote]] = None,
        include_samples: bool = True,
    ) -> str:
        lines = []

        lines.extend(self._generate_header(result))
        lines.extend(self._generate_summary(result))
        lines.extend(self._generate_duplicate_warning(result))
        lines.extend(self._generate_backtest_section(result))
        lines.extend(self._generate_material_section(version_notes, withdrawals, supplementary))

        if include_samples:
            lines.extend(self._generate_sample_sections(result))

        lines.extend(self._generate_footer())

        return "\n".join(lines)

    def _generate_header(self, result: ComparisonResult) -> List[str]:
        return [
            f"# {self.title}",
            "",
            f"> 生成时间：{self.generated_at}",
            f"> 总样本数：{result.total_samples}",
            f"> 新旧模型一致：{result.consistent_count} | "
            f"不一致：{result.inconsistent_count} | "
            f"人工改判：{result.manual_revised_count}",
            "",
        ]

    def _generate_summary(self, result: ComparisonResult) -> List[str]:
        lines = [
            "## 一、对比概览",
            "",
            "| 指标 | 数量 | 说明 |",
            "|------|------|------|",
            f"| 总样本数 | {result.total_samples} | 参与对比的全部样本 |",
            f"| 模型判断一致 | {result.consistent_count} | 新旧模型结论相同 |",
            f"| 模型判断不一致 | {result.inconsistent_count} | 新旧模型结论不同 |",
            f"| 人工改判 | {result.manual_revised_count} | 人工判断覆盖模型输出 |",
            f"| 待补材料 | {result.pending_count} | 缺少必要材料，暂缓判断 |",
            f"| 待确认 | {result.to_confirm_count} | 存在重复评测或疑点 |",
            f"| 受阈值影响 | {result.threshold_impact_count} | 阈值变化导致结论改变 |",
            "",
        ]

        if result.total_samples > 0:
            consistency_rate = result.consistent_count / result.total_samples * 100
            lines.extend([
                f"**模型一致率：{consistency_rate:.1f}%**",
                "",
            ])

        return lines

    def _generate_duplicate_warning(self, result: ComparisonResult) -> List[str]:
        if not result.duplicate_evaluations:
            return []

        lines = [
            "## ⚠️ 待确认事项",
            "",
            "> 以下样本存在重复评测，暂未计入最终统计，请先确认原因和影响范围后再继续。",
            "",
        ]

        for i, dup in enumerate(result.duplicate_evaluations, 1):
            if dup.confirmed:
                continue

            lines.extend([
                f"### {i}. 样本 `{dup.sample_id}`",
                "",
                f"- **重复次数**：{dup.duplicate_count} 次",
                f"- **涉及版本**：{', '.join(dup.versions)}",
                f"- **待确认原因**：{dup.reason}",
                f"- **影响范围**：{dup.impact_scope}",
                "",
                "```",
                "操作建议：",
                "1. 核对各版本评测是否为同一业务需求",
                "2. 确认是否需要保留最新版本，撤回旧版本",
                "3. 确认后将状态标记为 '已确认' 再重新生成报告",
                "```",
                "",
            ])

        return lines

    def _generate_backtest_section(self, result: ComparisonResult) -> List[str]:
        if not result.backtest_samples:
            return []

        lines = [
            "## 二、误判样本回测分析",
            "",
            f"> 共 {len(result.backtest_samples)} 条旧模型误判样本参与回测，验证新模型是否修正了判断。",
            "",
        ]

        for i, sample in enumerate(result.backtest_samples, 1):
            old_j = sample.old_model.judgment if sample.old_model else "N/A"
            new_j = sample.new_model.judgment if sample.new_model else "N/A"
            manual_j = sample.manual_judgment or "N/A"
            old_s = sample.old_model.score if sample.old_model else 0
            new_s = sample.new_model.score if sample.new_model else 0

            corrected = manual_j != old_j and manual_j == new_j

            status_icon = "✅" if corrected else "❌"
            status_text = "已修正" if corrected else "仍未正确判断"

            lines.extend([
                f"### {i}. {status_icon} 样本 `{sample.sample_id}` - {status_text}",
                "",
                f"- **会话ID**：`{sample.conversation_id}`",
                f"- **人工标注**：`{manual_j}`",
                f"- **旧模型**：`{old_j}` (得分 {old_s:.3f})",
                f"- **新模型**：`{new_j}` (得分 {new_s:.3f})",
                f"- **改判解释**：{sample.revision_explanation}",
                "",
            ])

        return lines

    def _generate_material_section(
        self,
        version_notes: Optional[List[VersionNote]],
        withdrawals: Optional[List[WithdrawalRecord]],
        supplementary: Optional[List[SupplementaryNote]],
    ) -> List[str]:
        lines = ["## 三、材料汇总", ""]

        if version_notes:
            lines.append("### 3.1 版本说明")
            lines.append("")
            for note in version_notes[:3]:
                dup_tag = " ⚠️重复" if note.is_duplicate else ""
                lines.extend([
                    f"- **[{note.version}]** {note.date}{dup_tag}",
                    f"  {note.content[:80]}..." if len(note.content) > 80 else f"  {note.content}",
                    "",
                ])
            if len(version_notes) > 3:
                lines.append(f"> 另有 {len(version_notes) - 3} 条版本说明未展示")
                lines.append("")

        if withdrawals:
            lines.append("### 3.2 撤回记录")
            lines.append("")
            for wd in withdrawals[:1]:
                lines.extend([
                    f"- **{wd.date}** 样本 `{wd.sample_id}`",
                    f"  撤回原因：{wd.reason}",
                    "",
                ])
            if len(withdrawals) > 1:
                lines.append(f"> 另有 {len(withdrawals) - 1} 条撤回记录未展示")
                lines.append("")

        if supplementary:
            lines.append("### 3.3 后补说明")
            lines.append("")
            for sp in supplementary[:1]:
                target = f"样本 `{sp.sample_id}`" if sp.sample_id else "全局说明"
                lines.extend([
                    f"- **{sp.date}** {target}",
                    f"  {sp.content[:80]}..." if len(sp.content) > 80 else f"  {sp.content}",
                    "",
                ])
            if len(supplementary) > 1:
                lines.append(f"> 另有 {len(supplementary) - 1} 条后补说明未展示")
                lines.append("")

        return lines

    def _generate_sample_sections(self, result: ComparisonResult) -> List[str]:
        lines = ["## 四、样本详情", ""]

        processed = [s for s in result.samples if s.status == JudgmentStatus.PROCESSED]
        pending = [s for s in result.samples if s.status == JudgmentStatus.PENDING_MATERIAL]
        manual = [s for s in result.samples if s.status == JudgmentStatus.MANUAL_REVISED]
        to_confirm = [s for s in result.samples if s.status == JudgmentStatus.TO_CONFIRM]

        lines.extend(self._generate_sample_group("4.1 已处理", processed, show_all=False))
        lines.extend(self._generate_sample_group("4.2 待补材料", pending, show_all=True))
        lines.extend(self._generate_sample_group("4.3 人工改判", manual, show_all=True))

        if to_confirm:
            lines.extend(self._generate_sample_group("4.4 待确认", to_confirm, show_all=True))

        return lines

    def _generate_sample_group(
        self,
        title: str,
        samples: List[EvaluationSample],
        show_all: bool = False,
    ) -> List[str]:
        if not samples:
            return [f"### {title}", "", f"> 共 0 条样本", ""]

        lines = [
            f"### {title}",
            "",
            f"> 共 {len(samples)} 条样本",
            "",
        ]

        display_count = len(samples) if show_all else min(3, len(samples))

        for i, sample in enumerate(samples[:display_count], 1):
            old_j = sample.old_model.judgment if sample.old_model else "N/A"
            new_j = sample.new_model.judgment if sample.new_model else "N/A"

            lines.extend([
                f"**{i}. 样本 `{sample.sample_id}`**",
                "",
                f"- 会话ID：`{sample.conversation_id}`",
                f"- 来源：{sample.source.value}",
                f"- 旧模型：`{old_j}`",
                f"- 新模型：`{new_j}`",
            ])

            if sample.manual_judgment:
                lines.append(f"- 人工判断：`{sample.manual_judgment}`")
                lines.append(f"  改判理由：{sample.manual_reason}")

            if sample.notes:
                lines.append(f"- 备注：{sample.notes}")

            if sample.revision_explanation:
                lines.append(f"- 改判解释：{sample.revision_explanation}")

            lines.append("")

        if not show_all and len(samples) > display_count:
            lines.append(f"> 另有 {len(samples) - display_count} 条样本未展示")
            lines.append("")

        return lines

    def _generate_footer(self) -> List[str]:
        return [
            "---",
            "",
            "> 本报告由客服摘要灰度对比系统自动生成。",
            "> 如有疑问，请参考 README.md 中「坏材料处理指南」部分。",
            "",
        ]

    def save_to_file(self, content: str, filepath: str) -> None:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
