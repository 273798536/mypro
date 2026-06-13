"""人类可读归因报告生成。

社区公示前要能讲给不看代码的人听。
数字从哪来要有线索，每一个结论都能追溯到数据来源。
"""

from typing import List, Dict, Any
import datetime

from .models import DeflectionRecord, AttributionSummary, ProcessStatus
from .status_manager import StatusManager


def _format_number(value, digits: int = 4) -> str:
    if value is None:
        return "N/A"
    if isinstance(value, float):
        return f"{value:.{digits}f}"
    return str(value)


def _format_percent(value, total: int) -> str:
    if total == 0 or value is None:
        return "0.0%"
    return f"{(value / total * 100):.1f}%"


def generate_text_report(
    records: List[DeflectionRecord],
    summary: AttributionSummary,
    stats: Dict[str, Any],
) -> str:
    """生成纯文本报告。

    讲给不看代码的人听：结构清晰、结论先行、有数据来源线索。
    """
    lines = []
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    lines.append("=" * 60)
    lines.append("          梁体挠度误差归因报告")
    lines.append("=" * 60)
    lines.append(f"生成时间: {now}")
    lines.append(f"记录总数: {summary.total_records} 条")
    lines.append("")

    lines.append("一、处理进度概览")
    lines.append("-" * 40)
    lines.append(f"  已处理: {summary.processed_count} 条 ({_format_percent(summary.processed_count, summary.total_records)")
    lines.append(f"  待处理: {summary.pending_count} 条")
    lines.append(f"  待补证据: {summary.need_evidence_count} 条 (重点关注)")
    lines.append(f"  处理异常: {summary.error_count} 条")
    lines.append(f"  处理率: {(summary.processed_count / summary.total_records * 100:.1f}%" if summary.total_records else "  处理率: 0.0%")
    lines.append("")

    lines.append("二、风险分布")
    lines.append("-" * 40)
    for risk_name, count in sorted(summary.by_risk.items(), key=lambda x: -x[1]):
        lines.append(f"  {risk_name}: {count} 条 ({_format_percent(count, summary.total_records)})")
    lines.append("")

    lines.append("三、归因分类")
    lines.append("-" * 40)
    for cat, count in sorted(summary.by_category.items(), key=lambda x: -x[1]):
        lines.append(f"  {cat}: {count} 条")
    lines.append("")

    lines.append("四、数据质量检查")
    lines.append("-" * 40)
    lines.append(f"  采样缺口: {summary.sampling_gap_count} 条 ({_format_percent(summary.sampling_gap_count, summary.total_records)})")
    lines.append(f"  极端值: {summary.extreme_count} 条 ({_format_percent(summary.extreme_count, summary.total_records)})")
    lines.append(f"  平均挠度比: {_format_number(summary.avg_deflection_ratio)}")
    lines.append(f"  最大挠度比: {_format_number(summary.max_deflection_ratio)}")
    lines.append("")

    lines.append("  [数据来源说明]")
    lines.append(f"    - 统计样本量: {stats.get('count', 0)} 条有效数据(已排除缺口)")
    lines.append(f"    - 平均值: {_format_number(stats.get('mean'))}")
    lines.append(f"    - 中位数: {_format_number(stats.get('median'))}")
    lines.append(f"    - IQR范围: {_format_number(stats.get('q1'))} ~ {_format_number(stats.get('q3'))}")
    lines.append(f"    - 极端值判定: IQR×1.5 法 + Z-score±2.0")
    lines.append(f"    - 上界: {_format_number(stats.get('upper_bound'))}")
    lines.append(f"    - 下界: {_format_number(stats.get('lower_bound'))}")
    lines.append("")

    lines.append("五、待补证据清单")
    lines.append("-" * 40)
    if summary.evidence_todo:
        for i, todo in enumerate(summary.evidence_todo, 1):
            lines.append(f"  {i}. {todo}")
    else:
        lines.append("  (无待补证据)")
    lines.append("")

    lines.append("六、极端值明细（前10条）")
    lines.append("-" * 40)
    extreme_records = [r for r in records if r.is_extreme]
    extreme_records.sort(key=lambda r: abs(r.deflection_ratio or 0), reverse=True)
    if extreme_records:
        for i, r in enumerate(extreme_records[:10], 1):
            lines.append(f"  {i}. {r.beam_id}-{r.measure_point}")
            lines.append(f"     挠度比: {_format_number(r.deflection_ratio)}")
            lines.append(f"     风险等级: {r.risk_level.value}")
            lines.append(f"     原因: {r.extreme_reason}")
            lines.append(f"     来源: {r.source_file} 第{r.source_line}行")
            lines.append("")
    else:
        lines.append("  (无极端值)")
        lines.append("")

    lines.append("七、采样缺口明细")
    lines.append("-" * 40)
    gap_records = [r for r in records if r.is_sampling_gap]
    if gap_records:
        for i, r in enumerate(gap_records[:10], 1):
            lines.append(f"  {i}. {r.beam_id}-{r.measure_point}")
            lines.append(f"     缺口原因: {r.gap_reason}")
            lines.append(f"     来源: {r.source_file} 第{r.source_line}行")
            lines.append("")
        if len(gap_records) > 10:
            lines.append(f"  ... 共 {len(gap_records)} 条，仅显示前10条")
    else:
        lines.append("  (无采样缺口)")
        lines.append("")

    lines.append("=" * 60)
    lines.append("报告结束")
    lines.append("=" * 60)

    return "\n".join(lines)


def generate_markdown_report(
    records: List[DeflectionRecord],
    summary: AttributionSummary,
    stats: Dict[str, Any],
) -> str:
    """生成Markdown格式报告。

    适合社区公示，排版更美观。
    """
    lines = []
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    lines.append("# 梁体挠度误差归因报告")
    lines.append("")
    lines.append(f"> 生成时间: {now}")
    lines.append(f"> 记录总数: {summary.total_records} 条")
    lines.append("")

    lines.append("## 一、处理进度概览")
    lines.append("")
    lines.append("| 状态 | 数量 | 占比 |")
    lines.append("|------|------|------|")
    status_list = [
        ("已处理", summary.processed_count),
        ("待处理", summary.pending_count),
        ("待补证据", summary.need_evidence_count),
        ("处理异常", summary.error_count),
    ]
    for name, count in status_list:
        lines.append(f"| {name} | {count} | {_format_percent(count, summary.total_records)} |")
    lines.append("")

    lines.append("## 二、风险等级分布")
    lines.append("")
    lines.append("| 风险等级 | 数量 | 占比 |")
    lines.append("|----------|------|------|")
    for risk_name, count in sorted(summary.by_risk.items(), key=lambda x: -x[1]):
        lines.append(f"| {risk_name} | {count} | {_format_percent(count, summary.total_records)} |")
    lines.append("")

    lines.append("## 三、误差归因分类")
    lines.append("")
    lines.append("| 归因分类 | 数量 |")
    lines.append("|----------|------|")
    for cat, count in sorted(summary.by_category.items(), key=lambda x: -x[1]):
        lines.append(f"| {cat} | {count} |")
    lines.append("")

    lines.append("## 四、数据质量检查")
    lines.append("")
    lines.append(f"- **采样缺口**: {summary.sampling_gap_count} 条 ({_format_percent(summary.sampling_gap_count, summary.total_records)})")
    lines.append(f"- **极端值**: {summary.extreme_count} 条 ({_format_percent(summary.extreme_count, summary.total_records)})")
    lines.append(f"- **平均挠度比**: {_format_number(summary.avg_deflection_ratio)}")
    lines.append(f"- **最大挠度比**: {_format_number(summary.max_deflection_ratio)}")
    lines.append("")

    lines.append("### 数据来源说明")
    lines.append("")
    lines.append("所有统计计算基于有效数据（已排除采样缺口）：")
    lines.append("")
    lines.append(f"- 统计样本量: **{stats.get('count', 0)}** 条")
    lines.append(f"- 平均值: {_format_number(stats.get('mean'))}")
    lines.append(f"- 中位数: {_format_number(stats.get('median'))}")
    lines.append(f"- IQR范围: {_format_number(stats.get('q1'))} ~ {_format_number(stats.get('q3'))}")
    lines.append(f"- 极端值判定方法: **IQR×1.5 法 + Z-score±2.0**")
    lines.append(f"- 正常范围: {_format_number(stats.get('lower_bound'))} ~ {_format_number(stats.get('upper_bound'))}")
    lines.append("")

    lines.append("> 为什么用两种方法检测极端值？")
    lines.append("> - IQR法不怕极端值本身影响中位数，适合偏态分布")
    lines.append("> - Z-score反映偏离程度，直观易懂")
    lines.append("> - 双法并用，既防漏报，又防误报")
    lines.append("")

    lines.append("## 五、待补证据清单")
    lines.append("")
    if summary.evidence_todo:
        for i, todo in enumerate(summary.evidence_todo, 1):
            lines.append(f"{i}. {todo}")
    else:
        lines.append("（无待补证据）")
    lines.append("")

    lines.append("## 六、极端值明细")
    lines.append("")
    extreme_records = [r for r in records if r.is_extreme]
    extreme_records.sort(key=lambda r: abs(r.deflection_ratio or 0), reverse=True)
    if extreme_records:
        lines.append("| 序号 | 梁号-测点 | 挠度比 | 风险等级 | 判定原因 | 数据来源 |")
        lines.append("|------|-----------|--------|----------|----------|----------|")
        for i, r in enumerate(extreme_records[:20], 1):
            src = f"{r.source_file} L{r.source_line}"
            lines.append(f"| {i} | {r.beam_id}-{r.measure_point} | {_format_number(r.deflection_ratio)} | {r.risk_level.value} | {r.extreme_reason} | {src} |")
    else:
        lines.append("（无极端值）")
    lines.append("")

    lines.append("## 七、采样缺口明细")
    lines.append("")
    gap_records = [r for r in records if r.is_sampling_gap]
    if gap_records:
        lines.append("| 序号 | 梁号-测点 | 缺口原因 | 数据来源 |")
        lines.append("|------|-----------|----------|----------|")
        for i, r in enumerate(gap_records[:20], 1):
            src = f"{r.source_file} L{r.source_line}"
            lines.append(f"| {i} | {r.beam_id}-{r.measure_point} | {r.gap_reason} | {src} |")
    else:
        lines.append("（无采样缺口）")
    lines.append("")

    lines.append("---")
    lines.append("*本报告由梁体挠度误差归因系统自动生成*")

    return "\n".join(lines)


def save_report(report_content: str, output_path: str) -> str:
    """保存报告到文件。"""
    import os
    os.makedirs(os.path.dirname(os.path.abspath(output_path)) or ".", exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(report_content)
    return output_path
