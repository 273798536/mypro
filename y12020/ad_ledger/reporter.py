import csv
import io
from decimal import Decimal
from datetime import date
from pathlib import Path

from .models import BalanceEntry, Consumption, Rebate, Refund
from .engine import ReconciliationResult


def format_amount(value: Decimal) -> str:
    return f"{value:,.2f}"


def generate_balance_report(
    result: ReconciliationResult,
    consumptions: list[Consumption],
    rebates: list[Rebate],
    refunds: list[Refund],
) -> str:
    lines: list[str] = []
    sep = "═" * 64

    lines.append(sep)
    lines.append("  广告预充值消耗账本 · 余额报告")
    if result.balances:
        lines.append(f"  报告日期: {result.balances[0].as_of_date.isoformat()}")
    lines.append(f"  匹配口径: FIFO（先入先出，按充值日期排序）")
    lines.append(sep)
    lines.append("")

    lines.append("■ 余额总览")
    lines.append("")
    header = (
        f"  {'账户ID':<10} {'账户名称':<12} "
        f"{'累计充值':>12} {'累计消耗':>12} "
        f"{'累计返点':>10} {'累计退款':>10} {'当前余额':>12}"
    )
    lines.append(header)
    lines.append("  " + "─" * 88)

    for b in result.balances:
        row = (
            f"  {b.account_id:<10} {b.account_name:<12} "
            f"{format_amount(b.total_recharged):>12} "
            f"{format_amount(b.total_consumed):>12} "
            f"{format_amount(b.total_rebated):>10} "
            f"{format_amount(b.total_refunded):>10} "
            f"{format_amount(b.current_balance):>12}"
        )
        lines.append(row)

    lines.append("")

    lines.append("■ 消耗匹配明细")
    lines.append("")
    lines.append("  匹配方法: FIFO —— 每笔消耗按日期顺序从最早可用充值中扣减")
    lines.append("")

    consumption_map = {c.consumption_id: c for c in consumptions}
    for m in result.matched:
        c = consumption_map.get(m["consumption_id"])
        if c is None:
            continue
        settled_info = ""
        if c.settled_date and c.settled_date > c.date:
            settled_info = f"，结算日 {c.settled_date.isoformat()}"
        lines.append(
            f"  消耗 {c.consumption_id}  账户 {c.account_id}  "
            f"金额 {format_amount(c.amount)}  "
            f"消耗日 {c.date.isoformat()}{settled_info}"
        )
        for src in m["matched_from"]:
            lines.append(
                f"    ← 充值 {src['recharge_id']}: {format_amount(Decimal(src['amount']))}"
            )
        lines.append("")

    if result.delayed_consumptions:
        lines.append("■ 结算延迟预警")
        lines.append("")
        for d in result.delayed_consumptions:
            lines.append(
                f"  消耗 {d['consumption_id']}  延迟 {d['delay_days']} 天  "
                f"消耗日 {d['date']}  结算日 {d['settled_date']}"
            )
        lines.append("")

    if result.unmatched_consumptions:
        lines.append("■ 未匹配消耗")
        lines.append("")
        for c in result.unmatched_consumptions:
            lines.append(
                f"  消耗 {c.consumption_id}  账户 {c.account_id}  "
                f"金额 {format_amount(c.amount)}  消耗日 {c.date.isoformat()}"
            )
        lines.append("")

    if result.orphan_rebates:
        lines.append("■ 悬空返点（引用的充值不存在）")
        lines.append("")
        for rb in result.orphan_rebates:
            lines.append(
                f"  返点 {rb.rebate_id} → 充值 {rb.rebate_from_recharge_id}  "
                f"金额 {format_amount(rb.amount)}"
            )
        lines.append("")

    if result.orphan_refunds:
        lines.append("■ 悬空退款（引用的记录不存在）")
        lines.append("")
        for rf in result.orphan_refunds:
            lines.append(
                f"  退款 {rf.refund_id} → {rf.refund_from_type} {rf.refund_from_id}  "
                f"金额 {format_amount(rf.amount)}"
            )
        lines.append("")

    rebate_from_map: dict[str, list[Rebate]] = {}
    for rb in rebates:
        rebate_from_map.setdefault(rb.rebate_from_recharge_id, []).append(rb)

    if rebate_from_map:
        lines.append("■ 返点追溯（返点 → 充值来源）")
        lines.append("")
        for recharge_id, rb_list in sorted(rebate_from_map.items()):
            for rb in rb_list:
                lines.append(
                    f"  返点 {rb.rebate_id}  金额 {format_amount(rb.amount)}  "
                    f"日期 {rb.date.isoformat()}  "
                    f"← 充值 {rb.rebate_from_recharge_id}"
                )
        lines.append("")

    refund_from_map: dict[str, list[Refund]] = {}
    for rf in refunds:
        key = f"{rf.refund_from_type}:{rf.refund_from_id}"
        refund_from_map.setdefault(key, []).append(rf)

    if refund_from_map:
        lines.append("■ 退款占用（退款 → 原始记录）")
        lines.append("")
        for ref_key, rf_list in sorted(refund_from_map.items()):
            for rf in rf_list:
                lines.append(
                    f"  退款 {rf.refund_id}  金额 {format_amount(rf.amount)}  "
                    f"日期 {rf.date.isoformat()}  "
                    f"← {rf.refund_from_type} {rf.refund_from_id}"
                )
        lines.append("")

    if result.warnings:
        lines.append("■ 警告汇总")
        lines.append("")
        for w in result.warnings:
            lines.append(f"  ⚠ {w}")
        lines.append("")

    lines.append(sep)
    lines.append("  匹配口径说明: 本报告消耗匹配采用 FIFO（先入先出）方法。")
    lines.append("  每笔消耗按消耗日期顺序，从同账户中最早有可用余额的充值扣减。")
    lines.append("  若一笔消耗跨越多笔充值，匹配明细中会逐一列出各充值来源及金额。")
    lines.append("  返点与退款均指向原始充值或消耗记录，可在上述追溯/占用章节核实。")
    lines.append(sep)

    return "\n".join(lines)


def generate_export_csv(
    result: ReconciliationResult,
    consumptions: list[Consumption],
    rebates: list[Rebate],
    refunds: list[Refund],
) -> str:
    buf = io.StringIO()
    writer = csv.writer(buf)

    writer.writerow(["## 余额总览 ##"])
    writer.writerow([
        "账户ID", "账户名称", "累计充值", "累计消耗",
        "累计返点", "累计退款", "当前余额",
    ])
    for b in result.balances:
        writer.writerow([
            b.account_id,
            b.account_name,
            str(b.total_recharged),
            str(b.total_consumed),
            str(b.total_rebated),
            str(b.total_refunded),
            str(b.current_balance),
        ])
    writer.writerow([])

    writer.writerow(["## 消耗匹配明细 ##"])
    writer.writerow([
        "消耗ID", "账户ID", "消耗金额", "消耗日期",
        "结算日期", "匹配充值ID", "匹配金额",
    ])
    consumption_map = {c.consumption_id: c for c in consumptions}
    for m in result.matched:
        c = consumption_map.get(m["consumption_id"])
        if c is None:
            continue
        settled = c.settled_date.isoformat() if c.settled_date else ""
        for src in m["matched_from"]:
            writer.writerow([
                c.consumption_id,
                c.account_id,
                str(c.amount),
                c.date.isoformat(),
                settled,
                src["recharge_id"],
                src["amount"],
            ])
    writer.writerow([])

    writer.writerow(["## 返点追溯 ##"])
    writer.writerow([
        "返点ID", "账户ID", "返点金额", "返点日期",
        "来源充值ID", "备注",
    ])
    for rb in rebates:
        writer.writerow([
            rb.rebate_id,
            rb.account_id,
            str(rb.amount),
            rb.date.isoformat(),
            rb.rebate_from_recharge_id,
            rb.note,
        ])
    writer.writerow([])

    writer.writerow(["## 退款占用 ##"])
    writer.writerow([
        "退款ID", "账户ID", "退款金额", "退款日期",
        "来源类型", "来源ID", "备注",
    ])
    for rf in refunds:
        writer.writerow([
            rf.refund_id,
            rf.account_id,
            str(rf.amount),
            rf.date.isoformat(),
            rf.refund_from_type,
            rf.refund_from_id,
            rf.note,
        ])
    writer.writerow([])

    writer.writerow(["## 结算延迟 ##"])
    writer.writerow(["消耗ID", "账户ID", "金额", "消耗日期", "结算日期", "延迟天数"])
    for d in result.delayed_consumptions:
        writer.writerow([
            d["consumption_id"],
            d["account_id"],
            d["amount"],
            d["date"],
            d["settled_date"],
            d["delay_days"],
        ])

    return buf.getvalue()
