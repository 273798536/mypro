import os
from typing import List, Optional
from datetime import datetime

from ..models.recon import ReconBatch, ReconItem, ProcessStatus


def _fmt_num(v) -> str:
    if v is None:
        return "-"
    if isinstance(v, (int, float)):
        if abs(v) >= 1000:
            return f"{v:,.4f}"
        return f"{v:.6f}".rstrip("0").rstrip(".")
    return str(v)


def _status_icon(s: ProcessStatus) -> str:
    return {
        ProcessStatus.MATCHED: "✅",
        ProcessStatus.MISMATCH: "❌",
        ProcessStatus.NEED_MANUAL: "👤",
        ProcessStatus.VOUCHER_LATE: "⏰",
        ProcessStatus.RESOLVED: "✔️",
        ProcessStatus.HISTORY_MISMATCH: "⚠️",
        ProcessStatus.PENDING: "⏳",
    }.get(s, "•")


def _summary_table(batch: ReconBatch) -> str:
    summary = batch.status_summary()
    lines = ["| 状态 | 数量 |", "| --- | ---: |"]
    order = [
        ProcessStatus.MATCHED, ProcessStatus.MISMATCH,
        ProcessStatus.VOUCHER_LATE, ProcessStatus.NEED_MANUAL,
        ProcessStatus.HISTORY_MISMATCH, ProcessStatus.PENDING, ProcessStatus.RESOLVED,
    ]
    total = 0
    for s in order:
        cnt = summary.get(s.value, 0)
        if cnt > 0:
            lines.append(f"| {_status_icon(s)} {s.value} | {cnt} |")
            total += cnt
    lines.append(f"| **合计** | **{total}** |")
    return "\n".join(lines)


def _filter_info(batch: ReconBatch) -> str:
    if not batch.filter_criteria:
        return "_未设置额外筛选口径，以全部输入数据为准_"
    lines = ["| 口径 | 值 |", "| --- | --- |"]
    for k, v in batch.filter_criteria.items():
        lines.append(f"| {k} | {v} |")
    return "\n".join(lines)


def _source_info(batch: ReconBatch) -> str:
    email_src = sorted({e.source_file for e in batch.emails})
    tax_src = sorted({t.source_file for t in batch.tax_records})
    lines = []
    if email_src:
        lines.append("**审批邮件来源：** " + "、".join(email_src))
    if tax_src:
        lines.append("**税费记录来源：** " + "、".join(tax_src))
    if batch.emails:
        sample = batch.emails[0]
        if sample.normalized_field_map:
            lines.append("")
            lines.append("**邮件字段映射（自动归一化）：**")
            lines.append("| 标准字段 | 实际列名 |")
            lines.append("| --- | --- |")
            for std, orig in sample.normalized_field_map.items():
                lines.append(f"| {std} | {orig} |")
    if batch.tax_records:
        sample = batch.tax_records[0]
        if sample.normalized_field_map:
            lines.append("")
            lines.append("**税费字段映射（自动归一化）：**")
            lines.append("| 标准字段 | 实际列名 |")
            lines.append("| --- | --- |")
            for std, orig in sample.normalized_field_map.items():
                lines.append(f"| {std} | {orig} |")
    return "\n".join(lines) if lines else "_无来源信息_"


def _item_rows(items: List[ReconItem], show_reason: bool) -> str:
    headers = ["状态", "交易日", "审批主题", "税种", "HKD税费", "CNY税费", "邮件汇率", "税费汇率", "差异"]
    if show_reason:
        headers += ["原因/历史检查", "下一步"]
    headers += ["凭证", "来源", "轮次"]
    lines = ["| " + " | ".join(headers) + " |"]
    lines.append("| " + " | ".join(["---"] * len(headers)) + " |")
    for it in items:
        row = [
            f"{_status_icon(it.status)} {it.status.value}",
            it.trade_date or "-",
            it.approval_subject or "-",
            it.tax_type or "-",
            _fmt_num(it.tax_amount_hkd),
            _fmt_num(it.tax_amount_cny),
            _fmt_num(it.exchange_rate_from_email),
            _fmt_num(it.exchange_rate_from_tax),
            _fmt_num(it.exchange_rate_diff),
        ]
        if show_reason:
            reason_parts = []
            if it.reason:
                reason_parts.append(it.reason)
            if it.history_check:
                reason_parts.append(it.history_check)
            row.append("；".join(reason_parts) or "-")
            row.append(it.next_step or "-")
        voucher_info = "-"
        if it.voucher_no or it.voucher_date:
            voucher_info = f"{it.voucher_no or '-'}/{it.voucher_date or '-'}"
            if it.voucher_expected_by:
                voucher_info += f"（应到：{it.voucher_expected_by}）"
        row.append(voucher_info)
        row.append("、".join(it.sources) if it.sources else "-")
        row.append(str(it.run_round) + (f"·{it.remark}" if it.remark else ""))
        lines.append("| " + " | ".join(str(c) for c in row) + " |")
    return "\n".join(lines)


def generate_markdown_report(batch: ReconBatch, output_path: str) -> str:
    issue_items = [i for i in batch.items if i.status in (
        ProcessStatus.MISMATCH, ProcessStatus.NEED_MANUAL,
        ProcessStatus.VOUCHER_LATE, ProcessStatus.HISTORY_MISMATCH,
    )]
    ok_items = [i for i in batch.items if i.status == ProcessStatus.MATCHED]

    lines: List[str] = []
    lines.append(f"# 港股通税费口径对账报告 — 批次 {batch.batch_id}")
    lines.append("")
    lines.append(f"> 生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  ｜  已运行 {batch.run_count} 轮  ｜  最近一次：{batch.last_run_at or '-'}")
    if batch.extra_remarks:
        lines.append("")
        lines.append("**运行备注：**")
        for r in batch.extra_remarks:
            lines.append(f"- {r}")

    lines.append("")
    lines.append("## 一、状态概览")
    lines.append("")
    lines.append(_summary_table(batch))

    lines.append("")
    lines.append("## 二、筛选口径")
    lines.append("")
    lines.append(_filter_info(batch))

    lines.append("")
    lines.append("## 三、数据来源与字段映射")
    lines.append("")
    lines.append(_source_info(batch))

    lines.append("")
    lines.append(f"## 四、异常与待处理（{len(issue_items)} 条）")
    lines.append("")
    if issue_items:
        lines.append(_item_rows(issue_items, show_reason=True))
    else:
        lines.append("_暂无异常，全部匹配_ ✅")

    lines.append("")
    lines.append(f"## 五、已匹配明细（{len(ok_items)} 条）")
    lines.append("")
    if ok_items:
        lines.append(_item_rows(ok_items, show_reason=False))
    else:
        lines.append("_暂无匹配记录_")

    lines.append("")
    lines.append("## 六、快速操作")
    lines.append("")
    lines.append("### 启动 Web 界面（推荐非开发同事使用）")
    lines.append("")
    lines.append("在项目根目录执行，以下两条等价，任选其一：")
    lines.append("")
    lines.append("```bash")
    lines.append("streamlit run webapp.py")
    lines.append("# 或")
    lines.append("python3 -m streamlit run hk_tax_recon/webapp.py")
    lines.append("```")
    lines.append("")
    lines.append("然后浏览器打开 `http://localhost:8501`。")
    lines.append("")
    lines.append("### 6.1 放样例数据并跑一轮（CLI）")
    lines.append("")
    lines.append("```bash")
    lines.append("python3 -m hk_tax_recon.cli sample --out-dir ./data")
    lines.append("python3 -m hk_tax_recon.cli run \\\\")
    lines.append(f"  --batch-id {batch.batch_id} \\\\")
    lines.append("  --emails ./data/sample_emails.xlsx \\\\")
    lines.append("  --tax    ./data/sample_tax.xlsx \\\\")
    lines.append("  --out    ./reports")
    lines.append("```")
    lines.append("")
    lines.append("### 6.2 重跑同一批次（保留历史对比，CLI）")
    lines.append("")
    lines.append("```bash")
    lines.append("python3 -m hk_tax_recon.cli rerun \\\\")
    lines.append(f"  --batch-json ./reports/{batch.batch_id}.json \\\\")
    lines.append("  --remark   \"补录凭证号后复核\" \\\\")
    lines.append("  --out      ./reports")
    lines.append("```")
    lines.append("")
    lines.append("### 6.3 查看产物")
    lines.append("")
    lines.append("```bash")
    lines.append(f"# Markdown 报告（可用浏览器 / VS Code / Typora 打开）")
    lines.append(f"open ./reports/{batch.batch_id}.md")
    lines.append("")
    lines.append(f"# 批次 JSON（用于 CLI rerun 或 Web「🔄 重跑批次」上传）")
    lines.append(f"ls -la ./reports/{batch.batch_id}.json")
    lines.append("```")

    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("### 材料入口 & 异常出口（给没参与开发的同事）")
    lines.append("")
    lines.append("- **入口**：把审批邮件（`.xlsx/.csv/.eml`）和税费明细（`.xlsx/.csv`）放在同一个目录，跑 `run` 命令或在 Web 上传即可。")
    lines.append("- **出口**：报告第四部分「异常与待处理」就是异常出口——每条都有 `原因` 和 `下一步` 两列，照着做即可。")
    lines.append("- 凭证晚到（⏰）：交易日+3个工作日还没凭证号会标出来，找托管要凭证号后重跑。")
    lines.append("- 需人工确认（👤）：缺邮件或缺税费，核对材料是否齐全。")
    lines.append("- 不匹配（❌）：汇率或金额差了，以托管对账单为准，确认后改数据再跑。")
    lines.append("- 历史不一致（⚠️）：同一批两轮结果不一样，确认是数据修正还是口径变更。")

    content = "\n".join(lines) + "\n"
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)
    return output_path
