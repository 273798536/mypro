"""报告生成 - 终端摘要和可转发报告"""

import os
import json
from datetime import datetime
from typing import List, Dict, Any

from .models import BayesianResult


class ReportGenerator:
    """报告生成器"""

    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def generate_terminal_summary(self, results: List[BayesianResult], is_new: Dict[str, bool]) -> str:
        """生成终端摘要"""
        lines = []
        lines.append("=" * 70)
        lines.append("  贝叶斯质检抽样分析报告")
        lines.append(f"  生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("=" * 70)
        lines.append("")

        if not results:
            lines.append("⚠️  未找到可分析的数据")
            return "\n".join(lines)

        for result in results:
            batch_id = result.batch_id
            new_flag = " [新]" if is_new.get(batch_id, True) else " [已存在]"
            decision_color = {
                "合格": "✅",
                "可疑": "⚠️ ",
                "不合格": "❌",
            }.get(result.decision, "❓")

            lines.append(f"【批次 {batch_id}】{decision_color} {result.decision}{new_flag}")
            lines.append(f"  ├─ 样本量: {result.total_samples} | 缺陷数: {result.defective_count}")
            lines.append(f"  ├─ 缺陷率均值: {result.mean_defect_rate:.2%}")
            lines.append(
                f"  ├─ {result.credible_level:.0%}置信区间: "
                f"[{result.credible_interval_low:.2%}, {result.credible_interval_high:.2%}]"
            )
            lines.append(f"  ├─ 决策建议: {result.recommendation}")

            if result.warnings:
                lines.append(f"  └─ 告警:")
                for w in result.warnings:
                    lines.append(f"     ⚠️  {w}")

            if result.compared_batches:
                lines.append(f"  └─ 批次对比:")
                for other_id, comp in result.compared_batches.items():
                    diff = comp['difference']
                    overlap = "重叠" if comp['ci_overlap'] else "无重叠"
                    lines.append(
                        f"     · vs {other_id}: {diff:+.2%} (置信区间{overlap})"
                    )

            lines.append("")

        lines.append("=" * 70)
        new_count = sum(1 for v in is_new.values() if v)
        dup_count = sum(1 for v in is_new.values() if not v)
        lines.append(f"  共分析 {len(results)} 个批次, 其中:")
        lines.append(f"    - 新计算: {new_count} 个")
        lines.append(f"    - 复用历史: {dup_count} 个 (相同输入已去重)")
        lines.append("=" * 70)

        return "\n".join(lines)

    def generate_shareable_report(
        self,
        results: List[BayesianResult],
        output_filename: str = "qc_report.md",
    ) -> str:
        """生成可转发的Markdown报告"""
        filepath = os.path.join(self.output_dir, output_filename)

        lines = []
        lines.append("# 贝叶斯质检抽样分析报告")
        lines.append("")
        lines.append(f"> 生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"> 分析工具: 贝叶斯质检抽样 v0.1.0")
        lines.append("")

        lines.append("## 执行摘要")
        lines.append("")
        lines.append("| 批次ID | 决策 | 样本量 | 缺陷数 | 缺陷率均值 | 95%置信区间 | 建议 |")
        lines.append("|--------|------|--------|--------|------------|-------------|------|")

        for result in results:
            ci = f"[{result.credible_interval_low:.2%}, {result.credible_interval_high:.2%}]"
            lines.append(
                f"| {result.batch_id} | {result.decision} | "
                f"{result.total_samples} | {result.defective_count} | "
                f"{result.mean_defect_rate:.2%} | {ci} | {result.recommendation} |"
            )
        lines.append("")

        for result in results:
            lines.append(f"## 批次 {result.batch_id} 详细分析")
            lines.append("")

            lines.append("### 基本信息")
            lines.append("")
            lines.append(f"- 批次ID: {result.batch_id}")
            lines.append(f"- 总样本数: {result.total_samples}")
            lines.append(f"- 缺陷样本数: {result.defective_count}")
            lines.append(f"- 观测缺陷率: {result.defective_count / result.total_samples:.2%}" if result.total_samples > 0 else "- 观测缺陷率: N/A")
            lines.append("")

            lines.append("### 先验参数")
            lines.append("")
            lines.append(f"- 分布: Beta(α={result.prior.alpha:.2f}, β={result.prior.beta:.2f})")
            lines.append(f"- 先验均值: {result.prior.mean:.2%}")
            lines.append(f"- 等效样本量: {result.prior.effective_sample_size:.1f}")
            lines.append(f"- 描述: {result.prior.description}")
            lines.append(f"- 来源: {result.prior.source}")
            lines.append("")

            lines.append("### 后验分析")
            lines.append("")
            lines.append(f"- 后验分布: Beta(α={result.posterior_alpha:.2f}, β={result.posterior_beta:.2f})")
            lines.append(f"- 后验缺陷率均值: **{result.mean_defect_rate:.2%}**")
            lines.append(f"- {result.credible_level:.0%}置信区间: **[{result.credible_interval_low:.2%}, {result.credible_interval_high:.2%}]**")
            lines.append(f"- 可接受阈值: {result.mean_defect_rate * 0 + 0.02:.2%}")
            lines.append("")

            lines.append("### 决策结论")
            lines.append("")
            decision_emoji = {"合格": "✅", "可疑": "⚠️ ", "不合格": "❌"}.get(result.decision, "❓")
            lines.append(f"- **最终决策: {decision_emoji} {result.decision}**")
            lines.append(f"- **建议: {result.recommendation}**")
            lines.append("")

            if result.warnings:
                lines.append("### ⚠️  告警信息")
                lines.append("")
                for w in result.warnings:
                    lines.append(f"- {w}")
                lines.append("")

            if result.compared_batches:
                lines.append("### 批次对比")
                lines.append("")
                lines.append("| 对比批次 | 缺陷率 | 绝对差异 | 相对变化 | 置信区间重叠 |")
                lines.append("|----------|--------|----------|----------|--------------|")
                for other_id, comp in result.compared_batches.items():
                    rel_change = f"{comp['relative_change_pct']:+.1f}%" if comp['relative_change_pct'] != float("inf") else "N/A"
                    overlap = "是" if comp['ci_overlap'] else "否"
                    lines.append(
                        f"| {other_id} | {comp['mean_defect_rate']:.2%} | "
                        f"{comp['difference']:+.2%} | {rel_change} | {overlap} |"
                    )
                lines.append("")

            lines.append("### 数据溯源")
            lines.append("")
            lines.append(f"- 源文件: {', '.join(result.trace.source_files)}")
            lines.append(f"- 样本ID: {', '.join(result.trace.sample_ids[:10])}{'...' if len(result.trace.sample_ids) > 10 else ''}")
            lines.append(f"- 先验来源: {result.trace.prior_source}")
            lines.append("")

            lines.append("### 计算步骤")
            lines.append("")
            for step in result.trace.calculation_steps:
                lines.append(f"- {step}")
            lines.append("")

        lines.append("## 附录")
        lines.append("")
        lines.append("### 分析方法说明")
        lines.append("")
        lines.append("本报告采用贝叶斯统计方法进行质检抽样分析：")
        lines.append("")
        lines.append("1. **先验分布**: 使用Beta分布作为缺陷率的共轭先验")
        lines.append("2. **贝叶斯更新**: 结合观测数据更新后验分布")
        lines.append("3. **置信区间**: 计算95%最高后验密度置信区间")
        lines.append("4. **决策规则**:")
        lines.append("   - 置信区间上限 ≤ 阈值 → 合格")
        lines.append("   - 置信区间下限 ≥ 阈值 → 不合格")
        lines.append("   - 否则 → 可疑（建议加检）")
        lines.append("")

        with open(filepath, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))

        return filepath

    def generate_json_result(
        self,
        results: List[BayesianResult],
        output_filename: str = "qc_results.json",
    ) -> str:
        """生成JSON格式结果"""
        filepath = os.path.join(self.output_dir, output_filename)
        data = {
            "generated_at": datetime.now().isoformat(),
            "version": "0.1.0",
            "results": [r.to_dict() for r in results],
        }
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return filepath
