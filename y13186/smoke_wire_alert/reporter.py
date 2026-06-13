from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from .models import WindTunnelSmokeAlert, ProcessingStatus, JumpCause


STATUS_LABELS = {
    ProcessingStatus.PENDING: "待处理",
    ProcessingStatus.PROCESSING: "处理中",
    ProcessingStatus.ALERT: "触发预警",
    ProcessingStatus.NORMAL: "正常",
    ProcessingStatus.BLOCKED: "阻塞",
    ProcessingStatus.MANUAL_OVERRIDDEN: "人工覆盖",
    ProcessingStatus.REPROCESSED: "已重跑",
}

JUMP_LABELS = {
    JumpCause.THRESHOLD_CHANGED: "阈值变更",
    JumpCause.UNIT_CHANGED: "单位变更",
    JumpCause.LATE_ATTACHMENT_ARRIVED: "晚到附件到达",
}


class MarkdownReporter:

    def generate(
        self,
        alerts: List[WindTunnelSmokeAlert],
        title: str = "风洞烟线阈值预警报告",
    ) -> str:
        lines: List[str] = []
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        lines.append(f"# {title}")
        lines.append("")
        lines.append(f"**生成时间**: {now}")
        lines.append(f"**记录总数**: {len(alerts)}")
        counts = self._count_status(alerts)
        lines.append(
            f"**统计**: 预警 {counts['alert']} | 正常 {counts['normal']} | "
            f"阻塞 {counts['blocked']} | 人工覆盖 {counts['manual']} | "
            f"跳变 {counts['jump']}"
        )
        lines.append("")
        lines.append("---")
        lines.append("")

        lines.append("## 一、处理概览")
        lines.append("")
        lines.append("| 编号 | 来源 | 时间 | 状态 | 计算值 | 高阈值 | 低阈值 | 跳变 |")
        lines.append("|---|---|---|---|---:|---:|---:|---|")
        for i, a in enumerate(alerts, 1):
            jump_mark = "是" if a.jump_detected else "-"
            lines.append(
                f"| {i} | {a.source or '-'} | {a.record_time or '-'} | "
                f"{STATUS_LABELS.get(a.status, a.status.value)} | "
                f"{a.formula_result if a.formula_result is not None else '-'} | "
                f"{a.threshold_high if a.threshold_high is not None else '-'} | "
                f"{a.threshold_low if a.threshold_low is not None else '-'} | "
                f"{jump_mark} |"
            )
        lines.append("")

        lines.append("## 二、阻塞记录明细（算不出的记录）")
        lines.append("")
        blocked = [a for a in alerts if a.status == ProcessingStatus.BLOCKED]
        if not blocked:
            lines.append("_无阻塞记录_")
        else:
            for a in blocked:
                lines.append(f"### 记录 {a.id}")
                lines.append("")
                lines.append(f"- **来源**: {a.source or '-'}")
                lines.append(f"- **阻塞原因**: {a.block_reason.value if a.block_reason else '-'}")
                lines.append(f"- **详细说明**: {a.block_detail or '-'}")
                if a.next_step:
                    lines.append(f"- **下一步处理**: {a.next_step}")
                lines.append("")
                lines.append("原始字段:")
                lines.append("")
                lines.append("```json")
                lines.append(self._to_json(a.raw_fields))
                lines.append("```")
                lines.append("")

        lines.append("## 三、报警与人工备注对齐情况")
        lines.append("")
        with_notes = [a for a in alerts if a.manual_notes]
        if not with_notes:
            lines.append("_暂无带人工备注的记录_")
        else:
            for a in with_notes:
                lines.append(f"### 记录 {a.id} (系统: {STATUS_LABELS.get(a.status, a.status.value)})")
                lines.append("")
                for n in a.manual_notes:
                    align = "✅ 一致" if n.aligns_with_alert is True else (
                        "❌ 不一致" if n.aligns_with_alert is False else "⚠️ 无法对齐"
                    )
                    lines.append(f"- **[{n.timestamp}] {n.author or '匿名'}**: {n.content}")
                    lines.append(f"  - 人工判断: {n.judgment or '未填写'}")
                    lines.append(f"  - 与系统结论: {align}")
                    if n.misalignment_reason:
                        lines.append(f"  - 不一致说明: {n.misalignment_reason}")
                lines.append("")

        lines.append("## 四、结果跳变与归因")
        lines.append("")
        jumped = [a for a in alerts if a.jump_detected]
        if not jumped:
            lines.append("_无跳变记录_")
        else:
            for a in jumped:
                lines.append(f"### 记录 {a.id}")
                lines.append("")
                lines.append(
                    f"- **数值跳变**: {a.previous_result if a.previous_result is not None else '-'} "
                    f"→ {a.formula_result if a.formula_result is not None else '-'}"
                )
                lines.append(
                    f"- **归因类型**: "
                    f"{JUMP_LABELS.get(a.jump_cause, a.jump_cause.value if a.jump_cause else '-')}"
                )
                lines.append(f"- **归因说明**: {a.jump_detail or '-'}")
                if a.attachments:
                    late = [x for x in a.attachments if x.is_late]
                    if late:
                        lines.append(
                            f"- **晚到附件**: "
                            + ", ".join(f"{x.name or x.id}(字段: {x.fields_affected})" for x in late)
                        )
                lines.append("")

        lines.append("## 五、人工修改历史（交接班留痕）")
        lines.append("")
        with_history = [a for a in alerts if a.history]
        if not with_history:
            lines.append("_暂无人工修改记录_")
        else:
            for a in with_history:
                lines.append(f"### 记录 {a.id}")
                lines.append("")
                for idx, hc in enumerate(a.history, 1):
                    tag = " **【临时修改】**" if hc.is_temporary else ""
                    lines.append(
                        f"{idx}. [{hc.timestamp}] {hc.operator or '未知'}"
                        f"{tag}: {hc.field_name} "
                        f"`{hc.old_value}` → `{hc.new_value}`"
                    )
                    lines.append(f"   - 原因: {hc.reason or '未说明'}")
                lines.append("")

        lines.append("## 六、下一步处理清单")
        lines.append("")
        actionable = [
            a for a in alerts
            if a.next_step
        ]
        if not actionable:
            lines.append("_无待办事项_")
        else:
            for a in actionable:
                lines.append(
                    f"- [{STATUS_LABELS.get(a.status, a.status.value)}] "
                    f"记录 {a.id}: {a.next_step}"
                )
            lines.append("")

        return "\n".join(lines)

    def write(
        self,
        alerts: List[WindTunnelSmokeAlert],
        output_path: str,
        title: str = "风洞烟线阈值预警报告",
    ) -> str:
        content = self.generate(alerts, title)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(content)
        return output_path

    def _count_status(self, alerts: List[WindTunnelSmokeAlert]):
        c = {"alert": 0, "normal": 0, "blocked": 0, "manual": 0, "jump": 0}
        for a in alerts:
            if a.status == ProcessingStatus.ALERT:
                c["alert"] += 1
            elif a.status == ProcessingStatus.NORMAL:
                c["normal"] += 1
            elif a.status == ProcessingStatus.BLOCKED:
                c["blocked"] += 1
            if a.status == ProcessingStatus.MANUAL_OVERRIDDEN:
                c["manual"] += 1
            if a.jump_detected:
                c["jump"] += 1
        return c

    def _to_json(self, obj) -> str:
        import json
        return json.dumps(obj, ensure_ascii=False, indent=2)
