from datetime import datetime
from pathlib import Path
from typing import Optional

from .models import ReplayState, ComplaintStatus, MeetingMinute
from .classifier import StatusClassifier
from .history import HistoryManager
from .idempotent import IdempotencyManager


class ReportGenerator:
    def __init__(self, state: ReplayState):
        self.state = state
        self.classifier = StatusClassifier(state)
        self.history = HistoryManager(state)
        self.idempotent = IdempotencyManager(state)

    def generate_full_report(self, output_path: str) -> str:
        lines = []

        lines.append("# 公交港湾投诉回放报告")
        lines.append("")
        lines.append(f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"**数据时间**: {self.state.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("")

        lines.append("## 一、总览")
        lines.append("")
        total = len(self.state.records)
        minute_count = len(self.state.minutes)
        history_count = len(self.state.history)
        lines.append(f"- 投诉记录总数: {total} 条")
        lines.append(f"- 会议纪要数: {minute_count} 份")
        lines.append(f"- 历史操作记录: {history_count} 条")
        lines.append(f"- 幂等去重已拦截: {self.idempotent.stats()['total_seen'] - total} 次重复提交")
        lines.append("")

        lines.append("## 二、状态分类")
        lines.append("")
        lines.append("| 状态 | 数量 |")
        lines.append("|------|------|")
        for status in [ComplaintStatus.PENDING_SITE, ComplaintStatus.PROCESSED, ComplaintStatus.CONFLICT, ComplaintStatus.PENDING_REVIEW]:
            records = self.classifier.get_by_status(status)
            lines.append(f"| {status.value} | {len(records)} |")
        lines.append("")

        lines.append("### 待复核点位明细")
        lines.append("")
        lines.append("> 公示前复核用：已处理、待现场看、冲突记录已分开")
        lines.append("")

        lines.append("#### 1. 已处理")
        lines.append("")
        processed = self.classifier.get_processed()
        if processed:
            lines.append("| 编号 | 港湾 | 类型 | 处理人 | 处理结果 |")
            lines.append("|------|------|------|--------|----------|")
            for r in processed:
                result = (r.handle_result or "")[:30]
                lines.append(f"| {r.complaint_id} | {r.bay_name} | {r.complaint_type} | {r.handler or '-'} | {result} |")
        else:
            lines.append("_暂无已处理记录_")
        lines.append("")

        lines.append("#### 2. 待现场看")
        lines.append("")
        pending = self.classifier.get_pending_site()
        if pending:
            lines.append("| 编号 | 港湾 | 地址 | 类型 | 提交人 |")
            lines.append("|------|------|------|------|--------|")
            for r in pending:
                lines.append(f"| {r.complaint_id} | {r.bay_name} | {r.bay_address} | {r.complaint_type} | {r.submitter} |")
        else:
            lines.append("_暂无待现场记录_")
        lines.append("")

        lines.append("#### 3. 冲突记录")
        lines.append("")
        conflicts = self.classifier.get_conflicts()
        if conflicts:
            lines.append("| 编号 | 港湾 | 状态 | 冲突原因 |")
            lines.append("|------|------|------|----------|")
            for r in conflicts:
                reasons = r.extra.get("conflict_reasons", ["未知"])
                lines.append(f"| {r.complaint_id} | {r.bay_name} | {r.status.value} | {'; '.join(reasons)} |")
        else:
            lines.append("_暂无冲突记录_")
        lines.append("")

        lines.append("## 三、历史追溯")
        lines.append("")
        lines.append("### 会议纪要版本历史")
        lines.append("")
        lines.append("> 补的备注、旧版本截图都留在历史里，不只是最终值")
        lines.append("")

        for minute_id, versions in self.state.minutes.items():
            sorted_versions = sorted(versions, key=lambda m: m.version)
            latest = sorted_versions[-1]
            lines.append(f"#### {latest.meeting_title} ({minute_id})")
            lines.append("")
            lines.append(f"- 最新版本: v{latest.version}")
            lines.append(f"- 版本数: {len(sorted_versions)}")
            lines.append(f"- 记录人: {latest.recorder or '-'}")
            lines.append("")
            lines.append("| 版本 | 标题 | 是否补录 | 截图数 | 关联投诉 |")
            lines.append("|------|------|----------|--------|----------|")
            for v in sorted_versions:
                is_append = "是" if v.is_appendum else "否"
                append_note = f"（{v.appendum_note}）" if v.appendum_note else ""
                sc_count = len(v.screenshot_refs)
                related = ", ".join(v.related_complaint_ids[:3])
                if len(v.related_complaint_ids) > 3:
                    related += f" 等{len(v.related_complaint_ids)}条"
                lines.append(f"| v{v.version} | {v.meeting_title} | {is_append}{append_note} | {sc_count} | {related or '-'} |")
            lines.append("")

            lines.append("**版本内容溯源:**")
            lines.append("")
            for v in sorted_versions:
                tag = ""
                if v.is_appendum:
                    tag = " [补录]"
                lines.append(f"- v{v.version}{tag}: {v.meeting_title}")
                if v.appendum_note:
                    lines.append(f"  - 备注: {v.appendum_note}")
                if v.screenshot_refs:
                    lines.append(f"  - 截图: {', '.join(v.screenshot_refs)}")
                if v.content:
                    preview = v.content[:100] + "..." if len(v.content) > 100 else v.content
                    lines.append(f"  - 内容摘要: {preview}")
            lines.append("")

        lines.append("## 四、操作历史")
        lines.append("")
        lines.append("> 老何临时改过的判断都留在历史里，下一班能看到完整过程")
        lines.append("")

        all_history = self.history.all_history()
        if all_history:
            lines.append("| 时间 | 操作 | 操作人 | 对象 | 说明 |")
            lines.append("|------|------|--------|------|------|")
            for h in all_history[:50]:
                desc = h.reason or f"{h.entity_type} {h.entity_id}"
                lines.append(
                    f"| {h.timestamp.strftime('%Y-%m-%d %H:%M')} | {h.action.value} | {h.actor} | {h.entity_id} | {desc[:50]} |"
                )
            if len(all_history) > 50:
                lines.append("")
                lines.append(f"_共 {len(all_history)} 条历史，以上显示前 50 条_")
        else:
            lines.append("_暂无操作历史_")
        lines.append("")

        lines.append("## 五、幂等性校验")
        lines.append("")
        lines.append("> 两次相同请求不会把一条撤回记录算成两份")
        lines.append("")
        stats = self.idempotent.stats()
        lines.append(f"- 已记录幂等键: {stats['total_seen']} 个")
        lines.append(f"- 有效投诉记录: {len(self.state.records)} 条")
        lines.append(f"- 去重拦截: {stats['total_seen'] - len(self.state.records)} 次")
        lines.append("")

        report_content = "\n".join(lines)

        output = Path(output_path)
        output.parent.mkdir(parents=True, exist_ok=True)
        with open(output, "w", encoding="utf-8") as f:
            f.write(report_content)

        return str(output)

    def generate_minute_trace_report(self, minute_id: str, output_path: str) -> Optional[str]:
        trace = self.history.trace_minute_origin(minute_id)
        if not trace:
            return None

        lines = []
        lines.append(f"# 会议纪要溯源报告 - {minute_id}")
        lines.append("")
        lines.append(f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("")

        lines.append("## 基本信息")
        lines.append("")
        lines.append(f"- 原始版本: v{trace.get('original_version', '?')}")
        lines.append(f"- 最新版本: v{trace.get('latest_version', '?')}")
        lines.append(f"- 版本总数: {trace.get('total_versions', 0)}")
        lines.append(f"- 原始标题: {trace.get('original_title', '')}")
        lines.append(f"- 最新标题: {trace.get('latest_title', '')}")
        lines.append("")

        appendums = trace.get("appendums", [])
        if appendums:
            lines.append("## 补录备注")
            lines.append("")
            for m in appendums:
                lines.append(f"### v{m.version} - {m.meeting_title}")
                if m.appendum_note:
                    lines.append(f"- 备注: {m.appendum_note}")
                if m.screenshot_refs:
                    lines.append(f"- 截图: {', '.join(m.screenshot_refs)}")
                lines.append("")

        lines.append("## 原始说法")
        lines.append("")
        lines.append("> 能追到会议纪要的原始说法，不只是含糊警告")
        lines.append("")
        lines.append("```")
        lines.append(trace.get("original_content", "无") or "无")
        lines.append("```")
        lines.append("")

        screenshots = trace.get("screenshots", [])
        if screenshots:
            lines.append("## 截图引用")
            lines.append("")
            for s in screenshots:
                lines.append(f"- {s}")
            lines.append("")

        history_entries = trace.get("history_entries", [])
        if history_entries:
            lines.append("## 操作轨迹")
            lines.append("")
            for h in history_entries:
                lines.append(f"- {h.timestamp.strftime('%Y-%m-%d %H:%M')} [{h.action.value}] {h.actor}: {h.reason or ''}")
            lines.append("")

        report_content = "\n".join(lines)

        output = Path(output_path)
        output.parent.mkdir(parents=True, exist_ok=True)
        with open(output, "w", encoding="utf-8") as f:
            f.write(report_content)

        return str(output)
