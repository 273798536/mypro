from typing import List, Optional
from datetime import datetime

from app.models.matrix import BatchJob, MatrixRecord, MatrixStatus, ChangeSource, JumpReason


def _format_condition(cond: Optional[float]) -> str:
    if cond is None:
        return "-"
    return f"{cond:.4f}"


def _status_text(status: MatrixStatus) -> str:
    mapping = {
        MatrixStatus.PENDING: "待计算",
        MatrixStatus.NORMAL: "正常",
        MatrixStatus.EMPTY: "空集合",
        MatrixStatus.SINGULAR: "奇异矩阵",
        MatrixStatus.OUT_OF_BOUND: "越界",
        MatrixStatus.OVERRIDDEN: "人工改判",
        MatrixStatus.ERROR: "错误",
    }
    return mapping.get(status, str(status))


def _jump_reason_text(reason: JumpReason) -> str:
    mapping = {
        JumpReason.THRESHOLD: "阈值调整",
        JumpReason.UNIT: "单位变更",
        JumpReason.LATE_ATTACHMENT: "晚到附件",
        JumpReason.UNKNOWN: "待查",
    }
    return mapping.get(reason, str(reason))


def generate_markdown_report(batch: BatchJob) -> str:
    lines = []
    s = batch.summary

    lines.append(f"# 矩阵条件数批量验算报告")
    lines.append("")
    lines.append(f"**批次名称**：{batch.name}")
    lines.append(f"**生成时间**：{batch.updated_at.strftime('%Y-%m-%d %H:%M:%S')}")
    if batch.threshold is not None:
        lines.append(f"**判定阈值**：{batch.threshold}")
    if batch.unit:
        lines.append(f"**单位**：{batch.unit}")
    lines.append("")

    lines.append("## 一、整体结论")
    lines.append("")
    lines.append(f"本次共验算 **{s.total}** 个矩阵，其中：")
    lines.append("")
    lines.append(f"- ✅ 正常：**{s.normal}** 个")
    if s.empty > 0:
        lines.append(f"- ⚪ 空集合：**{s.empty}** 个（已排除，不计入正常结果）")
    if s.singular > 0:
        lines.append(f"- ⚠️ 奇异矩阵：**{s.singular}** 个（不可逆，无法计算条件数）")
    if s.out_of_bound > 0:
        lines.append(f"- 🔴 越界：**{s.out_of_bound}** 个（条件数超过阈值，已单独列出）")
    if s.overridden > 0:
        lines.append(f"- ✏️ 人工改判：**{s.overridden}** 个")
    if s.error > 0:
        lines.append(f"- ❌ 错误：**{s.error}** 个")
    lines.append("")

    if batch.gray_release_note:
        lines.append("## 二、灰度发布说明")
        lines.append("")
        lines.append(batch.gray_release_note)
        lines.append("")

    normal_records = [r for r in batch.records if r.status == MatrixStatus.NORMAL]
    if normal_records:
        lines.append("## 三、正常结果")
        lines.append("")
        lines.append("| 序号 | 矩阵名称 | 条件数 | 状态 |")
        lines.append("|------|----------|--------|------|")
        for i, r in enumerate(normal_records, 1):
            lines.append(f"| {i} | {r.name} | {_format_condition(r.condition_number)} | {_status_text(r.status)} |")
        lines.append("")

    oob_records = [r for r in batch.records if r.status == MatrixStatus.OUT_OF_BOUND]
    if oob_records:
        lines.append("## 四、外推越界记录（单独列出）")
        lines.append("")
        lines.append("> ⚠️ 以下矩阵条件数超过阈值，已从正常结果中隔离，请重点关注。")
        lines.append("")
        lines.append("| 序号 | 矩阵名称 | 条件数 | 阈值 | 超出比例 |")
        lines.append("|------|----------|--------|------|----------|")
        for i, r in enumerate(oob_records, 1):
            ratio = f"{r.bound_exceeded*100:.1f}%" if r.bound_exceeded else "-"
            lines.append(f"| {i} | {r.name} | {_format_condition(r.condition_number)} | {batch.threshold} | {ratio} |")
        lines.append("")

    empty_records = [r for r in batch.records if r.status == MatrixStatus.EMPTY]
    if empty_records:
        lines.append("## 五、空集合记录")
        lines.append("")
        lines.append("> ⚪ 以下记录为空集合，未参与正常计算。请检查数据来源是否完整。")
        lines.append("")
        lines.append("| 序号 | 矩阵名称 | 来源文件 | 备注 |")
        lines.append("|------|----------|----------|------|")
        for i, r in enumerate(empty_records, 1):
            lines.append(f"| {i} | {r.name} | {r.source_file or '-'} | {r.remark or '-'} |")
        lines.append("")

    singular_records = [r for r in batch.records if r.status == MatrixStatus.SINGULAR]
    if singular_records:
        lines.append("## 六、奇异矩阵记录")
        lines.append("")
        lines.append("> ⚠️ 以下矩阵为奇异矩阵（行列式为0），无法计算条件数。")
        lines.append("")
        lines.append("| 序号 | 矩阵名称 | 来源文件 |")
        lines.append("|------|----------|----------|")
        for i, r in enumerate(singular_records, 1):
            lines.append(f"| {i} | {r.name} | {r.source_file or '-'} |")
        lines.append("")

    overridden_records = [r for r in batch.records if r.status == MatrixStatus.OVERRIDDEN]
    if overridden_records:
        lines.append("## 七、人工改判记录")
        lines.append("")
        lines.append("> ✏️ 以下记录经过人工改判，点击可查看改判历史。")
        lines.append("")
        lines.append("| 序号 | 矩阵名称 | 原状态 | 当前状态 | 改判人 | 原因 |")
        lines.append("|------|----------|--------|----------|--------|------|")
        for i, r in enumerate(overridden_records, 1):
            last_change = r.status_history[-1] if r.status_history else None
            from_status = _status_text(last_change.from_status) if last_change else "-"
            operator = last_change.operator if last_change else "-"
            reason = last_change.reason if last_change else "-"
            lines.append(f"| {i} | {r.name} | {from_status} | {_status_text(r.status)} | {operator} | {reason} |")
        lines.append("")

    jump_records = [r for r in batch.records if r.jump_analysis and r.jump_analysis.has_jump]
    if jump_records:
        lines.append("## 八、结果跳变分析")
        lines.append("")
        lines.append("> 📈 以下矩阵的条件数与上次相比发生显著变化（变化幅度 > 50%）。")
        lines.append("")
        lines.append("| 序号 | 矩阵名称 | 上次条件数 | 当前条件数 | 变化幅度 | 跳变原因 |")
        lines.append("|------|----------|------------|------------|----------|----------|")
        for i, r in enumerate(jump_records, 1):
            ja = r.jump_analysis
            prev = _format_condition(ja.previous_condition)
            curr = _format_condition(ja.current_condition)
            ratio = f"{ja.change_ratio*100:.1f}%" if ja.change_ratio else "-"
            reason = _jump_reason_text(ja.reason)
            lines.append(f"| {i} | {r.name} | {prev} | {curr} | {ratio} | {reason} |")
        lines.append("")
        lines.append("### 跳变原因说明")
        lines.append("")
        lines.append("- **阈值调整**：判定阈值变更导致分类结果变化")
        lines.append("- **单位变更**：数据单位调整导致数值量级变化")
        lines.append("- **晚到附件**：后续补充的附件数据影响了计算结果")
        lines.append("- **待查**：暂无明确原因，需人工核实")
        lines.append("")

    has_changes = any(len(r.status_history) > 1 for r in batch.records)
    if has_changes:
        lines.append("## 九、状态变更溯源")
        lines.append("")
        lines.append("> 🔍 以下矩阵发生过状态变更，可追溯每次变更的来源和原因。")
        lines.append("")
        changed_records = [r for r in batch.records if len(r.status_history) > 1]
        for r in changed_records:
            lines.append(f"### {r.name}")
            lines.append("")
            lines.append("| 时间 | 原状态 → 新状态 | 变更来源 | 操作人 | 原因 |")
            lines.append("|------|----------------|----------|--------|------|")
            for ch in r.status_history:
                source_map = {
                    ChangeSource.AUTO_CALC: "自动计算",
                    ChangeSource.MANUAL_OVERRIDE: "人工改判",
                    ChangeSource.THRESHOLD_CHANGE: "阈值调整",
                    ChangeSource.UNIT_CHANGE: "单位变更",
                    ChangeSource.LATE_ATTACHMENT: "晚到附件",
                    ChangeSource.GRAY_RELEASE: "灰度发布",
                }
                source_text = source_map.get(ch.source, str(ch.source))
                lines.append(
                    f"| {ch.timestamp.strftime('%m-%d %H:%M')} | "
                    f"{_status_text(ch.from_status)} → {_status_text(ch.to_status)} | "
                    f"{source_text} | {ch.operator or '-'} | {ch.reason or '-'} |"
                )
            lines.append("")

    lines.append("---")
    lines.append("")
    lines.append(f"*报告由矩阵条件数批量验算系统自动生成 · {batch.updated_at.strftime('%Y-%m-%d')}*")

    return "\n".join(lines)
