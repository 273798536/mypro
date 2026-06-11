from datetime import datetime
from typing import List

from models import AdvancePayment, PaymentStatus, BatchReplaySummary, ReplayResult
from service import store


def _status_icon(status: PaymentStatus) -> str:
    return {
        PaymentStatus.MATCHED: "✅",
        PaymentStatus.RELEASED: "✅",
        PaymentStatus.PENDING: "⏳",
        PaymentStatus.NEED_VOUCHER: "🧾",
        PaymentStatus.NEED_SUPPLEMENT: "📎",
        PaymentStatus.DISPUTED: "⚠️",
        PaymentStatus.DUPLICATE: "❌",
    }.get(status, "❓")


def _action_badge(status: PaymentStatus) -> str:
    return {
        PaymentStatus.RELEASED: "**可放行**",
        PaymentStatus.MATCHED: "**可放行**",
        PaymentStatus.NEED_VOUCHER: "🔴 **需催凭证**",
        PaymentStatus.NEED_SUPPLEMENT: "🟡 **需补材料**",
        PaymentStatus.DISPUTED: "🔴 **需核实争议**",
        PaymentStatus.DUPLICATE: "🔴 **重复认领，需核对**",
        PaymentStatus.PENDING: "⏳ **待处理**",
    }.get(status, "")


def generate_markdown_report(batch_id: str, results: List[ReplayResult], summary: BatchReplaySummary) -> str:
    lines = []
    lines.append(f"# 供应链预付款异常回放报告")
    lines.append("")
    lines.append(f"**批次号：** {batch_id}")
    lines.append(f"**回放时间：** {summary.replay_time.strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("")

    lines.append("## 一、处理摘要（老许请看这里）")
    lines.append("")
    lines.append(f"| 类别 | 数量 | 说明 |")
    lines.append(f"|------|------|------|")
    lines.append(f"| ✅ 可放行 | {summary.released_count} | 材料齐全，直接过 |")
    lines.append(f"| 🧾 需催凭证 | {sum(1 for r in results if r.new_status == PaymentStatus.NEED_VOUCHER)} | 凭证号未到，找财务要 |")
    lines.append(f"| 📎 需补材料 | {summary.need_supplement_count} | 供应商缺材料，跟进催 |")
    lines.append(f"| 🔴 有问题 | {summary.disputed_count} | 重复/争议，人工核 |")
    lines.append(f"| **合计** | **{summary.total_count}** | |")
    lines.append("")

    lines.append("## 二、明细清单")
    lines.append("")

    lines.append("### 🔴 需要催办（凭证/材料）")
    lines.append("")
    need_action = [r for r in results if r.new_status in [PaymentStatus.NEED_VOUCHER, PaymentStatus.NEED_SUPPLEMENT]]
    if need_action:
        lines.append("| 付款单号 | 供应商 | 金额 | 当前状态 | 下一步怎么做 |")
        lines.append("|----------|--------|------|----------|-------------|")
        for r in need_action:
            p = store.get_payment(r.payment_id)
            amount = f"{p.amount:,.2f}" if p else "-"
            lines.append(f"| {r.payment_no} | {r.supplier_name} | {amount} | {_action_badge(r.new_status)} | {r.action_needed or '-'} |")
    else:
        lines.append("_暂无_")
    lines.append("")

    lines.append("### ⚠️ 需要人工核对（争议/重复）")
    lines.append("")
    disputed = [r for r in results if r.new_status in [PaymentStatus.DISPUTED, PaymentStatus.DUPLICATE]]
    if disputed:
        lines.append("| 付款单号 | 供应商 | 金额 | 问题类型 | 下一步怎么做 |")
        lines.append("|----------|--------|------|----------|-------------|")
        for r in disputed:
            p = store.get_payment(r.payment_id)
            amount = f"{p.amount:,.2f}" if p else "-"
            lines.append(f"| {r.payment_no} | {r.supplier_name} | {amount} | {_action_badge(r.new_status)} | {r.action_needed or '-'} |")
    else:
        lines.append("_暂无_")
    lines.append("")

    lines.append("### ✅ 可直接放行")
    lines.append("")
    ok = [r for r in results if r.new_status in [PaymentStatus.MATCHED, PaymentStatus.RELEASED]]
    if ok:
        lines.append("| 付款单号 | 供应商 | 金额 | 凭证号 |")
        lines.append("|----------|--------|------|--------|")
        for r in ok:
            p = store.get_payment(r.payment_id)
            amount = f"{p.amount:,.2f}" if p else "-"
            voucher = p.voucher_no if p and p.voucher_no else "-"
            lines.append(f"| {r.payment_no} | {r.supplier_name} | {amount} | {voucher} |")
    else:
        lines.append("_暂无_")
    lines.append("")

    lines.append("## 三、每笔历史轨迹")
    lines.append("")
    lines.append("> 每次改判、备注、凭证到账都会记录在这里，不再丢失历史。")
    lines.append("")

    payments = store.list_payments(batch_id)
    for p in payments:
        lines.append(f"### {_status_icon(p.current_status)} {p.payment_no} · {p.supplier_name} · ¥{p.amount:,.2f}")
        lines.append("")
        lines.append(f"- **当前状态：** {_action_badge(p.current_status)}")
        lines.append(f"- **业务日期：** {p.business_date}")
        lines.append(f"- **对账口径：** {p.recon_caliber or '-'}")
        if p.voucher_no:
            lines.append(f"- **凭证号：** {p.voucher_no}")
        if p.current_remark:
            lines.append(f"- **当前备注：** {p.current_remark}")
        lines.append("")
        lines.append("**变更历史：**")
        lines.append("")
        lines.append("| 时间 | 操作来源 | 操作人 | 状态变化 | 备注/说明 | 截图 |")
        lines.append("|------|----------|--------|----------|-----------|------|")
        for h in p.history:
            old = h.old_status.value if h.old_status else "(初始)"
            new = h.new_status.value
            status_str = f"{old} → {new}" if h.old_status != h.new_status else new
            remark = h.remark or h.detail or ""
            if len(remark) > 40:
                remark = remark[:40] + "…"
            shot = "📷 有" if h.screenshot_ref else "-"
            lines.append(f"| {h.timestamp.strftime('%m-%d %H:%M')} | {h.source.value} | {h.operator} | {status_str} | {remark} | {shot} |")
        lines.append("")

    lines.append("---")
    lines.append("")
    lines.append(f"_报告生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}_")
    lines.append("")

    return "\n".join(lines)
