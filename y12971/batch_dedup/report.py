from __future__ import annotations

import os
from datetime import datetime
from typing import Any

from .audit import get_audit_for_fingerprint, load_audit_log
from .importer import (
    load_confirmations,
    load_saved_index_suggestion,
    load_sessions,
    load_work_orders,
)
from .index_suggest import describe_index_diff
from .models import (
    ConfirmationAction,
    DedupVerdict,
    ImportSession,
    IndexSuggestion,
    WorkOrder,
    WorkOrderStatus,
)


REPORTS_DIR = "reports"


def _reports_dir(output_dir: str) -> str:
    return os.path.join(output_dir, REPORTS_DIR)


def _status_label(status: WorkOrderStatus) -> str:
    labels = {
        WorkOrderStatus.NEW: "🆕 新增",
        WorkOrderStatus.DUPLICATE: "🔄 重复",
        WorkOrderStatus.CHANGED: "✏️ 变更",
        WorkOrderStatus.CONFIRMED: "✅ 已确认",
        WorkOrderStatus.REJECTED: "❌ 已驳回",
    }
    return labels.get(status, str(status))


def _verdict_label(verdict: DedupVerdict) -> str:
    labels = {
        DedupVerdict.UNIQUE: "唯一",
        DedupVerdict.DUPLICATE: "重复",
        DedupVerdict.UNCERTAIN: "待定",
    }
    return labels.get(verdict, str(verdict))


def _safe_str(v: Any) -> str:
    if v is None:
        return ""
    if isinstance(v, dict):
        items = [f"{k}: {v2}" for k, v2 in v.items() if v2]
        return "; ".join(items)
    return str(v)


def _build_index_section(
    old_suggestion: IndexSuggestion | None,
    new_suggestion: IndexSuggestion | None,
) -> str:
    diff = describe_index_diff(old_suggestion, new_suggestion)
    lines: list[str] = []
    lines.append("## 索引建议")
    lines.append("")

    if not diff["changed"]:
        lines.append(f"- 当前唯一键: `{', '.join(diff['new_fields']) or '(无)'}`")
        lines.append(f"- 推断置信度: {diff['new_confidence']:.0%}")
        lines.append(f"- 推断依据: {diff['new_reason'] or '(无)'}")
    else:
        lines.append("### ⚠️ 索引建议已变更")
        lines.append("")
        lines.append("| 项目 | 变更前 | 变更后 |")
        lines.append("|------|--------|--------|")
        lines.append(f"| 唯一键字段 | `{', '.join(diff['old_fields']) or '(无)'}` | `{', '.join(diff['new_fields']) or '(无)'}` |")
        lines.append(f"| 推断置信度 | {diff['old_confidence']:.0%} | {diff['new_confidence']:.0%} |")
        lines.append(f"| 推断依据 | {diff['old_reason'] or '(无)'} | {diff['new_reason'] or '(无)'} |")
        lines.append("")
        lines.append("> 索引建议变更可能影响重复判断结果,请复核上述工单的判定结论。")

    lines.append("")
    return "\n".join(lines)


def _build_summary_section(session: ImportSession) -> str:
    lines: list[str] = []
    lines.append("## 导入概要")
    lines.append("")
    lines.append(f"- 导入批次: `{session.batch_id}`")
    lines.append(f"- 输入文件: {', '.join(session.input_files)}")
    lines.append(f"- 数据字典: {session.data_dict_file or '(未提供)'}")
    lines.append(f"- 补录模式: {'是' if session.is_supplement else '否'}")
    lines.append(f"- 开始时间: {session.started_at}")
    lines.append(f"- 完成时间: {session.finished_at or '(进行中)'}")
    lines.append("")
    lines.append("### 统计")
    lines.append("")
    lines.append(f"| 指标 | 数量 |")
    lines.append(f"|------|------|")
    lines.append(f"| 总行数 | {session.total_rows} |")
    lines.append(f"| 新增 | {session.new_count} |")
    lines.append(f"| 重复 | {session.duplicate_count} |")
    lines.append(f"| 变更 | {session.changed_count} |")
    lines.append(f"| 待定 | {session.uncertain_count} |")
    lines.append(f"| 已确认 | {session.confirmed_count} |")
    lines.append("")
    return "\n".join(lines)


def _build_work_orders_section(
    output_dir: str,
    orders: dict[str, WorkOrder],
    session: ImportSession,
) -> str:
    lines: list[str] = []
    lines.append("## 工单明细")
    lines.append("")

    changed_orders = [wo for wo in orders.values() if wo.status == WorkOrderStatus.CHANGED]
    duplicate_orders = [wo for wo in orders.values() if wo.status == WorkOrderStatus.DUPLICATE]
    new_orders = [wo for wo in orders.values() if wo.status == WorkOrderStatus.NEW]
    confirmed_orders = [wo for wo in orders.values() if wo.status == WorkOrderStatus.CONFIRMED]
    rejected_orders = [wo for wo in orders.values() if wo.status == WorkOrderStatus.REJECTED]

    if changed_orders:
        lines.append("### ✏️ 变更工单（新旧结论并排）")
        lines.append("")
        lines.append(f"> 共 {len(changed_orders)} 条工单发生变更，需人工复核。")
        lines.append("")
        for idx, wo in enumerate(changed_orders, 1):
            lines.append(f"#### 变更 #{idx} · 指纹 `{wo.fingerprint}`")
            lines.append("")
            lines.append("| 项目 | 旧值 / 旧结论 | 新值 / 新结论 | 差异 |")
            lines.append("|------|--------------|--------------|------|")
            all_keys = sorted(set(list(wo.raw_data.keys()) + list(wo.new_values.keys())))
            for k in all_keys:
                old_v = wo.raw_data.get(k, "")
                new_v = wo.new_values.get(k, "")
                diff = "⚠️ 变更" if old_v != new_v else ""
                lines.append(f"| {k} | `{old_v}` | `{new_v}` | {diff} |")
            lines.append("")
            old_verdict = wo.previous_verdict if wo.previous_verdict else DedupVerdict.UNIQUE.value
            lines.append(f"| **判定结论** | **{_verdict_label(DedupVerdict(old_verdict))}** | **{_verdict_label(wo.verdict)}** | ⚠️ 变更 |")
            lines.append("")
            audits = get_audit_for_fingerprint(os.path.join(output_dir, "state"), wo.fingerprint)
            if audits:
                lines.append("**变更历史（谁改的、什么时候、为什么）：**")
                lines.append("")
                lines.append("| 时间 | 操作人 | 动作 | 原因 | 旧判定 → 新判定 |")
                lines.append("|------|--------|------|------|----------------|")
                for a in audits:
                    old_v = _verdict_label(DedupVerdict(a.old_verdict)) if a.old_verdict else "-"
                    new_v = _verdict_label(DedupVerdict(a.new_verdict))
                    lines.append(f"| {a.timestamp[:19]} | {a.operator} | {a.action} | {a.reason} | {old_v} → {new_v} |")
                lines.append("")
            lines.append("---")
            lines.append("")
        lines.append("")

    if duplicate_orders:
        lines.append("### 🔄 重复工单")
        lines.append("")
        lines.append(f"> 共 {len(duplicate_orders)} 条重复工单。")
        lines.append("")
        lines.append("| 指纹 | 首次出现 | 出现次数 | 当前判定 |")
        lines.append("|------|----------|----------|----------|")
        for wo in duplicate_orders:
            lines.append(f"| `{wo.fingerprint}` | {wo.first_seen_at[:19]} | {wo.seen_count} | {_verdict_label(wo.verdict)} |")
        lines.append("")

    if new_orders:
        lines.append("### 🆕 新增工单")
        lines.append("")
        lines.append(f"> 共 {len(new_orders)} 条新增工单。")
        lines.append("")
        lines.append("| 指纹 | 索引键 | 首次出现 |")
        lines.append("|------|--------|----------|")
        for wo in new_orders:
            lines.append(f"| `{wo.fingerprint}` | {wo.index_key_used or '(全字段)'} | {wo.first_seen_at[:19]} |")
        lines.append("")

    if confirmed_orders:
        lines.append("### ✅ 已确认工单")
        lines.append("")
        lines.append(f"> 共 {len(confirmed_orders)} 条工单已人工确认。")
        lines.append("")
        lines.append("| 指纹 | 确认后判定 | 最后出现 |")
        lines.append("|------|-----------|----------|")
        for wo in confirmed_orders:
            lines.append(f"| `{wo.fingerprint}` | {_verdict_label(wo.verdict)} | {wo.last_seen_at[:19]} |")
        lines.append("")

    if rejected_orders:
        lines.append("### ❌ 已驳回工单")
        lines.append("")
        lines.append(f"> 共 {len(rejected_orders)} 条工单被驳回（确认重复）。")
        lines.append("")
        lines.append("| 指纹 | 驳回后判定 | 最后出现 |")
        lines.append("|------|-----------|----------|")
        for wo in rejected_orders:
            lines.append(f"| `{wo.fingerprint}` | {_verdict_label(wo.verdict)} | {wo.last_seen_at[:19]} |")
        lines.append("")

    return "\n".join(lines)


def _build_audit_section(output_dir: str) -> str:
    state_dir = os.path.join(output_dir, "state")
    audits = load_audit_log(state_dir)
    if not audits:
        return ""

    lines: list[str] = []
    lines.append("## 审计日志")
    lines.append("")
    lines.append("| 时间 | 工单指纹 | 操作人 | 动作 | 原因 | 旧判定 | 新判定 |")
    lines.append("|------|----------|--------|------|------|--------|--------|")
    for a in reversed(audits[-30:]):
        lines.append(f"| {a.timestamp[:19]} | `{a.work_order_fingerprint}` | {a.operator} | {a.action} | {a.reason} | {_verdict_label(DedupVerdict(a.old_verdict)) if a.old_verdict else '-'} | {_verdict_label(DedupVerdict(a.new_verdict))} |")
    lines.append("")
    return "\n".join(lines)


def _build_confirmations_section(output_dir: str) -> str:
    confirmations = load_confirmations(output_dir)
    if not confirmations:
        return ""

    lines: list[str] = []
    lines.append("## 人工确认记录")
    lines.append("")
    lines.append("| 时间 | 工单指纹 | 操作人 | 动作 | 原因 | 旧判定 | 新判定 |")
    lines.append("|------|----------|--------|------|------|--------|--------|")
    for c in reversed(confirmations):
        action_label = {
            ConfirmationAction.APPROVE: "✅ 通过",
            ConfirmationAction.REJECT: "❌ 驳回",
            ConfirmationAction.DEFER: "⏸️ 暂缓",
        }.get(c.action, str(c.action))
        lines.append(f"| {c.timestamp[:19]} | `{c.work_order_fingerprint}` | {c.operator} | {action_label} | {c.reason} | {c.old_verdict} | {c.new_verdict} |")
    lines.append("")
    return "\n".join(lines)


def generate_report(output_dir: str, session: ImportSession) -> str:
    orders = load_work_orders(output_dir)
    old_suggestion = session.previous_index_suggestion
    new_suggestion = session.index_suggestion

    parts: list[str] = []
    parts.append(f"# 批量导入重复拦截报告")
    parts.append("")
    parts.append(f"> 生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    parts.append(f"> 批次: `{session.batch_id}`")
    parts.append("")

    parts.append(_build_summary_section(session))
    parts.append(_build_index_section(old_suggestion, new_suggestion))
    parts.append(_build_work_orders_section(output_dir, orders, session))

    audit_section = _build_audit_section(output_dir)
    if audit_section:
        parts.append(audit_section)

    confirm_section = _build_confirmations_section(output_dir)
    if confirm_section:
        parts.append(confirm_section)

    return "\n".join(parts)


def save_report(output_dir: str, content: str, suffix: str = "") -> str:
    reports_dir = _reports_dir(output_dir)
    os.makedirs(reports_dir, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"report_{ts}{suffix}.md"
    path = os.path.join(reports_dir, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    return path
