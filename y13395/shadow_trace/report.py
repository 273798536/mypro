from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from .models import (
    TraceRecord,
    TaskStatus,
    PollutionStatus,
    RunStats,
    VersionDiff,
)
from .engine import ProcessResult


STATUS_CN = {
    TaskStatus.PENDING: "待处理",
    TaskStatus.PROCESSING: "处理中",
    TaskStatus.SUCCESS: "成功",
    TaskStatus.FAILED: "失败",
    TaskStatus.SKIPPED: "跳过",
    TaskStatus.BAD_ROW: "坏行",
    TaskStatus.PENDING_REVIEW: "待人工复核",
    TaskStatus.HUMAN_OVERRULED: "人工改判",
    TaskStatus.FINALIZED: "已定案",
    TaskStatus.RETRY: "重试",
}

POLLUTION_CN = {
    PollutionStatus.CLEAN: "正常",
    PollutionStatus.SUSPECTED: "疑似污染",
    PollutionStatus.CONFIRMED: "确认污染",
}


def _pollution_badge(p: PollutionStatus) -> str:
    if p == PollutionStatus.CLEAN:
        return "🟢 正常"
    elif p == PollutionStatus.SUSPECTED:
        return "🟡 疑似污染"
    return "🔴 确认污染"


def _status_badge(s: TaskStatus) -> str:
    map_ = {
        TaskStatus.SUCCESS: "✅ 成功",
        TaskStatus.FAILED: "❌ 失败",
        TaskStatus.SKIPPED: "⏭️ 跳过",
        TaskStatus.BAD_ROW: "⚠️ 坏行",
        TaskStatus.PENDING_REVIEW: "👀 待复核",
        TaskStatus.HUMAN_OVERRULED: "✏️ 人工改判",
        TaskStatus.FINALIZED: "📌 已定案",
        TaskStatus.PENDING: "⏳ 待处理",
        TaskStatus.PROCESSING: "⚙️ 处理中",
        TaskStatus.RETRY: "🔄 重试",
    }
    return map_.get(s, s.value)


def generate_report(
    result: ProcessResult,
    title: str = "影子流量任务追踪报告",
    source_file: Optional[str] = None,
    version_tag: Optional[str] = None,
    include_details: bool = True,
    max_failed_samples: int = 50,
) -> str:
    lines: List[str] = []
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    lines.append(f"# {title}")
    lines.append("")
    meta = [f"- 生成时间: {now}"]
    if source_file:
        meta.append(f"- 源文件: `{source_file}`")
    if version_tag:
        meta.append(f"- 版本标签: `{version_tag}`")
    lines.extend(meta)
    lines.append("")

    lines.append("## 运行统计")
    lines.append("")
    lines.append("| 分类 | 数量 |")
    lines.append("| --- | ---: |")
    s = result.stats
    lines.append(f"| 总数 | {s.total} |")
    lines.append(f"| ✅ 成功 | {s.success} |")
    lines.append(f"| ❌ 失败 | {s.failed} |")
    lines.append(f"| ⏭️ 跳过 | {s.skipped} |")
    lines.append(f"| ⚠️ 坏行 | {s.bad_rows} |")
    lines.append(f"| 👀 待人工复核 | {s.pending_review} |")
    lines.append(f"| ✏️ 人工改判 | {s.human_overruled} |")
    lines.append(f"| 📌 已定案 | {s.finalized} |")
    lines.append(f"| 🔄 重试 | {s.retry} |")
    lines.append("")
    lines.append("### 验证集污染标记")
    lines.append("")
    lines.append("| 状态 | 数量 |")
    lines.append("| --- | ---: |")
    lines.append(f"| 🟢 正常样本 | {s.clean} |")
    lines.append(f"| 🟡 疑似污染 | {s.suspected_pollution} |")
    lines.append(f"| 🔴 确认污染 | {s.confirmed_pollution} |")
    lines.append("")

    lines.append("## 失败队列")
    lines.append("")
    failed = [r for r in result.records if r.status == TaskStatus.FAILED]
    if not failed:
        lines.append("_无失败记录_")
    else:
        lines.append(f"共 {len(failed)} 条失败记录，展示前 {min(max_failed_samples, len(failed))} 条:")
        lines.append("")
        lines.append("| 行号 | 样本ID | 分数 | 阈值 | 污染标记 | 错误信息 |")
        lines.append("| --- | --- | ---: | ---: | --- | --- |")
        for r in failed[:max_failed_samples]:
            lines.append(
                f"| {r.row_number} | `{r.sample_id}` | {r.prediction_score if r.prediction_score is not None else '-'} "
                f"| {r.threshold if r.threshold is not None else '-'} "
                f"| {_pollution_badge(r.pollution)} | {r.error_message or '-'} |"
            )
    lines.append("")

    lines.append("## 人工改判与最终结论")
    lines.append("")
    reviewed = [r for r in result.records if r.review_history]
    if not reviewed:
        lines.append("_暂无人工改判记录_")
    else:
        lines.append("| 样本ID | 原状态 | 新状态 | 改判人 | 理由 | 最终结论 | 污染标记 |")
        lines.append("| --- | --- | --- | --- | --- | --- | --- |")
        for r in reviewed:
            for rv in r.review_history:
                lines.append(
                    f"| `{r.sample_id}` | {_status_badge(rv.original_status)} "
                    f"| {_status_badge(rv.new_status)} | {rv.reviewer} "
                    f"| {rv.reason} | {r.final_conclusion or '-'} "
                    f"| {_pollution_badge(r.pollution)} |"
                )
    lines.append("")

    if include_details:
        lines.append("## 样本详情")
        lines.append("")
        lines.append("| 行号 | 样本ID | 状态 | 污染标记 | 预测标签 | 真值 | 分数 | 阈值 | 最终结论 |")
        lines.append("| --- | --- | --- | --- | --- | --- | ---: | ---: | --- |")
        for r in result.records:
            lines.append(
                f"| {r.row_number} | `{r.sample_id}` | {_status_badge(r.status)} "
                f"| {_pollution_badge(r.pollution)} | {r.predicted_label or '-'} "
                f"| {r.ground_truth or '-'} | {r.prediction_score if r.prediction_score is not None else '-'} "
                f"| {r.threshold if r.threshold is not None else '-'} "
                f"| {r.final_conclusion or '-'} |"
            )
        lines.append("")

    return "\n".join(lines)


def generate_compare_report(
    diff: VersionDiff,
    title: str = "影子流量版本对比报告",
) -> str:
    lines: List[str] = []
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    a, b = diff.version_a, diff.version_b

    lines.append(f"# {title}")
    lines.append("")
    lines.append(f"- 生成时间: {now}")
    lines.append(f"- 对比版本: `{a}` → `{b}`")
    lines.append("")

    lines.append("## 样本差异")
    lines.append("")
    sd = diff.sample_diff
    lines.append(f"- `{a}` 样本数: **{sd['total_a']}**")
    lines.append(f"- `{b}` 样本数: **{sd['total_b']}**")
    lines.append(f"- 共有样本: **{len(sd['common'])}**")
    lines.append(f"- 仅在 `{a}`: {len(sd['only_in_a'])} 条")
    if sd["only_in_a"]:
        lines.append("  - " + ", ".join(f"`{x}`" for x in sd["only_in_a"][:20]))
        if len(sd["only_in_a"]) > 20:
            lines.append(f"  - ... 其余 {len(sd['only_in_a']) - 20} 条省略")
    lines.append(f"- 仅在 `{b}`: {len(sd['only_in_b'])} 条")
    if sd["only_in_b"]:
        lines.append("  - " + ", ".join(f"`{x}`" for x in sd["only_in_b"][:20]))
        if len(sd["only_in_b"]) > 20:
            lines.append(f"  - ... 其余 {len(sd['only_in_b']) - 20} 条省略")
    lines.append("")

    lines.append("## 阈值与分数变化")
    lines.append("")
    td = diff.threshold_diff
    lines.append(f"- 阈值变化样本数: **{len(td['threshold_changes'])}**")
    if td["threshold_changes"]:
        lines.append("")
        lines.append("| 样本ID | {a} 阈值 | {b} 阈值 | 变化值 |".format(a=a, b=b))
        lines.append("| --- | ---: | ---: | ---: |")
        for item in td["threshold_changes"][:30]:
            lines.append(
                f"| `{item['sample_id']}` | {item[a] if item[a] is not None else '-'} "
                f"| {item[b] if item[b] is not None else '-'} "
                f"| {item['delta'] if item['delta'] is not None else '-'} |"
            )
    lines.append("")
    lines.append(f"- 分数变化样本数: **{len(td['score_changes'])}**")
    if td["score_changes"]:
        lines.append("")
        lines.append("| 样本ID | {a} 分数 | {b} 分数 | 变化值 |".format(a=a, b=b))
        lines.append("| --- | ---: | ---: | ---: |")
        for item in td["score_changes"][:30]:
            lines.append(
                f"| `{item['sample_id']}` | {item[a] if item[a] is not None else '-'} "
                f"| {item[b] if item[b] is not None else '-'} "
                f"| {item['delta'] if item['delta'] is not None else '-'} |"
            )
    lines.append("")

    lines.append("## 人工改判变化")
    lines.append("")
    hd = diff.human_review_diff
    lines.append(f"- `{a}` 有人工改判: {len(hd['reviewed_in_a'])} 条")
    lines.append(f"- `{b}` 有人工改判: {len(hd['reviewed_in_b'])} 条")
    lines.append(f"- 改判情况有变化的样本数: **{len(hd['review_changes'])}**")
    if hd["review_changes"]:
        lines.append("")
        lines.append("| 样本ID | {a} 改判次数 | {b} 改判次数 | {a} 最终结论 | {b} 最终结论 |".format(a=a, b=b))
        lines.append("| --- | ---: | ---: | --- | --- |")
        for item in hd["review_changes"]:
            lines.append(
                f"| `{item['sample_id']}` | {item[f'{a}_reviews']} | {item[f'{b}_reviews']} "
                f"| {item[f'{a}_conclusion'] or '-'} | {item[f'{b}_conclusion'] or '-'} |"
            )
    lines.append("")

    lines.append("## 指标变化")
    lines.append("")
    md = diff.metric_diff
    lines.append("| 指标 | {a} | {b} | 变化值 | {a} 占比 | {b} 占比 |".format(a=a, b=b))
    lines.append("| --- | ---: | ---: | ---: | ---: | ---: |")
    for k, v in md.items():
        if f"{a}_rate" in v:
            lines.append(
                f"| {k} | {v[a]} | {v[b]} | {v['delta']:+d} "
                f"| {v[f'{a}_rate']:.2f}% | {v[f'{b}_rate']:.2f}% |"
            )
        else:
            lines.append(
                f"| {k} | {v[a]} | {v[b]} | {v['delta']:+d} | - | - |"
            )
    lines.append("")

    lines.append("## 状态翻转")
    lines.append("")
    sfd = diff.status_diff
    lines.append(f"状态发生变化的样本数: **{sfd['total_flips']}**")
    if sfd["flips"]:
        lines.append("")
        lines.append("| 样本ID | {a} 状态 | {b} 状态 | {a} 污染 | {b} 污染 |".format(a=a, b=b))
        lines.append("| --- | --- | --- | --- | --- |")
        for item in sfd["flips"][:50]:
            lines.append(
                f"| `{item['sample_id']}` | {item[f'{a}_status']} | {item[f'{b}_status']} "
                f"| {item[f'{a}_pollution']} | {item[f'{b}_pollution']} |"
            )
    lines.append("")

    return "\n".join(lines)
