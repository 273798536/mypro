"""终端摘要输出。

只输出数字和关键线索，不与 Markdown 报告内容混排。
"""

from __future__ import annotations

from .models import ReviewBundle, ReviewStatus, ChangeType


STATUS_LABELS = {
    ReviewStatus.PROCESSED: "已处理",
    ReviewStatus.PENDING: "待补材料",
    ReviewStatus.MANUAL: "人工改判",
}


CHANGE_LABELS = {
    ChangeType.THRESHOLD: "阈值调整",
    ChangeType.UNIT: "单位变更",
    ChangeType.NOTE: "后补备注",
    ChangeType.SCORE: "分数变更",
    ChangeType.STATUS: "状态变更",
}


def render_summary(bundle: ReviewBundle) -> str:
    lines: list[str] = []
    total = len(bundle.questions)
    lines.append("=" * 60)
    lines.append("马尔可夫链错题复盘 - 终端摘要")
    lines.append("=" * 60)
    lines.append(f"来源文件     : {bundle.source_file}")
    lines.append(f"生成时间     : {bundle.generated_at.strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"题目总数     : {total}")
    lines.append("")

    lines.append("-- 状态分布 --")
    for status in (ReviewStatus.PROCESSED, ReviewStatus.PENDING, ReviewStatus.MANUAL):
        count = len([q for q in bundle.questions if q.status == status])
        ratio = (count / total * 100) if total else 0.0
        lines.append(f"  {STATUS_LABELS[status]:<8}: {count:>3} 题  ({ratio:5.1f}%)")
    lines.append("")

    if bundle.unstable_sorts:
        lines.append("-- 排序不稳定（追溯原始行号）--")
        for s in bundle.unstable_sorts:
            lines.append(
                f"  {s.qid:<8} 原始行 {s.original_row:>3} → 当前索引 {s.current_index:>3}"
                f"  内容哈希 {s.content_hash}"
            )
    else:
        lines.append("-- 排序稳定性 --")
        lines.append("  全部题目顺序与原始清单一致 ✓")
    lines.append("")

    if bundle.change_events:
        lines.append("-- 结果跳变溯源 --")
        by_type: dict[str, int] = {}
        for ev in bundle.change_events:
            by_type[ev.change_type.value] = by_type.get(ev.change_type.value, 0) + 1
        for ct, n in by_type.items():
            label = CHANGE_LABELS.get(ChangeType(ct), ct)
            lines.append(f"  {label:<8}: {n} 条")
        lines.append("  详细证据见 Markdown 报告")
    else:
        lines.append("-- 结果跳变 --")
        lines.append("  未检测到跳变事件 ✓")
    lines.append("")

    lines.append("=" * 60)
    lines.append("详细报告请查看 output/review_report.md")
    lines.append("=" * 60)
    return "\n".join(lines)
