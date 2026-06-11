import os
from datetime import datetime
from typing import List
from collections import Counter
from . import storage
from .models import RiskWarning, WarningStatus, ConfirmReason


REPORT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "reports")


def _status_label(s) -> str:
    if isinstance(s, WarningStatus):
        pass
    else:
        try:
            s = WarningStatus(s)
        except Exception:
            return str(s) or "-"
    return {
        WarningStatus.IMPORTED: "已导入",
        WarningStatus.PENDING_CONFIRM: "待确认",
        WarningStatus.CONFIRMED: "已确认",
        WarningStatus.WITHDRAWN: "已撤回",
        WarningStatus.CONFLICT: "冲突中",
        WarningStatus.BAD_DATA: "坏数据",
    }.get(s, s.value)


def _status_label_name(s: str) -> str:
    try:
        return _status_label(WarningStatus(s))
    except Exception:
        return s or "-"


def _reason_label(r) -> str:
    if not r:
        return "-"
    if isinstance(r, ConfirmReason):
        pass
    else:
        try:
            r = ConfirmReason(r)
        except Exception:
            return str(r)
    return {
        ConfirmReason.CURRENCY_MISMATCH: "币种错误",
        ConfirmReason.DOUBLE_COUNTING: "双口径重复统计",
        ConfirmReason.LATE_ATTACHMENT: "晚到附件补充",
        ConfirmReason.NORMAL: "正常确认",
        ConfirmReason.OTHER: "其他",
    }.get(r, r.value)


def generate_markdown_report(batch_id: str, output_path: str = None,
                             skip_consistency_check: bool = False) -> dict:
    storage.init_db()
    if not batch_id or not batch_id.strip():
        return {"ok": False, "error": "批次号不能为空"}
    if not os.path.exists(REPORT_DIR):
        os.makedirs(REPORT_DIR)

    warnings = storage.get_warnings_by_batch(batch_id.strip())
    if not warnings:
        return {"ok": False, "error": f"批次不存在或无预警数据: {batch_id}"}

    from app.workflow import check_batch_consistency
    consistency = check_batch_consistency(batch_id.strip())

    bad_data = []
    source_files_seen = set()
    for w in warnings:
        r = storage.get_receipt_by_id(w.receipt_id)
        if r and r.source_file not in source_files_seen:
            source_files_seen.add(r.source_file)
            bad_data.extend(storage.get_bad_data_by_file(r.source_file))
    bad_data = list({bd.id: bd for bd in bad_data}.values())

    conflicts = storage.get_conflicts_by_batch(batch_id.strip())
    import_rounds = storage.get_import_rounds(batch_id.strip())

    by_round = Counter()
    for w in warnings:
        by_round[f"R{w.import_round}"] += 1

    total = len(warnings)
    status_counter = Counter(w.status.value for w in warnings)
    confirmed_count = status_counter.get(WarningStatus.CONFIRMED.value, 0)
    pending_count = status_counter.get(WarningStatus.PENDING_CONFIRM.value, 0)
    withdrawn_count = status_counter.get(WarningStatus.WITHDRAWN.value, 0)
    conflict_count = status_counter.get(WarningStatus.CONFLICT.value, 0)

    lines = []
    lines.append("# 券商适当性风险预警报告")
    lines.append("")
    lines.append(f"- **批次号**: {batch_id}")
    lines.append(f"- **生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"- **导入轮次**: {max(w.import_round for w in warnings) if warnings else 0} 轮")
    lines.append(f"- **导出前一致性检查**: {'✅ PASS 全部闭环' if consistency['clean'] else '❌ FAIL 存在未闭环项（见第六节）'}")
    lines.append("")

    lines.append("## 一、概览")
    lines.append("")
    lines.append("| 指标 | 数值 |")
    lines.append("| --- | --- |")
    lines.append(f"| 预警总数 | {total} |")
    lines.append(f"| 已确认 | {confirmed_count} |")
    lines.append(f"| 待确认 | {pending_count} |")
    lines.append(f"| 冲突中 | {conflict_count} |")
    lines.append(f"| 已撤回 | {withdrawn_count} |")
    lines.append(f"| 坏数据记录 | {len(bad_data)} |")
    lines.append(f"| 双口径冲突 | {len(conflicts)} (未解决 {sum(1 for c in conflicts if not c.resolved)}) |")
    lines.append(f"| 导入轮次分布 | {dict(by_round)} |")
    lines.append("")

    if import_rounds:
        lines.append("### 导入轮次明细")
        lines.append("")
        lines.append("| 轮次 | 来源文件 | 回执数 | 预警数 | 坏数据 | 冲突数 | 导入时间 |")
        lines.append("| --- | --- | --- | --- | --- | --- | --- |")
        for m in import_rounds:
            lines.append(
                f"| {m['import_round']} | {m['source_file']} | {m['receipts_count']} "
                f"| {m['warnings_count']} | {m['bad_data_count']} | {m['conflict_count']} "
                f"| {m['created_at']} |"
            )
        lines.append("")

    lines.append("## 二、预警明细")
    lines.append("")
    lines.append("| 轮次 | 预警编号 | 类型 | 投资者 | 金额 | 币种 | 状态 | 确认原因 | 复核人 | 结论 | 晚到附件 | 备注 | 来源(行号) |")
    lines.append("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |")
    for w in warnings:
        r = storage.get_receipt_by_id(w.receipt_id)
        investor = f"{r.investor_name}({r.investor_id})" if r else "-"
        amount = f"{r.amount:,.2f}" if r else "-"
        currency = r.currency if r else "-"
        src = f"{r.source_file}:{r.row_number}" if r else "-"
        lines.append(
            f"| {w.import_round} | {w.warning_code} | {w.warning_type} | {investor} | {amount} | {currency} "
            f"| {_status_label(w.status)} | {_reason_label(w.confirm_reason)} "
            f"| {w.confirmed_by or '-'} | {w.conclusion or '-'} "
            f"| {w.late_attachment_ref or '-'} | {w.remark or '-'} | {src} |"
        )
    lines.append("")

    lines.append("## 三、双口径冲突记录")
    lines.append("")
    if conflicts:
        lines.append("| 轮次 | 冲突ID | 投资者 | 金额 | 涉及口径 | 涉及预警ID | 是否解决 | 解决说明 |")
        lines.append("| --- | --- | --- | --- | --- | --- | --- | --- |")
        for c in conflicts:
            lines.append(
                f"| {c.import_round} | {c.id} | {c.investor_name}({c.investor_id}) | {c.amount:,.2f} "
                f"| {', '.join(c.calibres)} | {', '.join(str(x) for x in c.warning_ids)} "
                f"| {'✅ 是' if c.resolved else '❌ 否'} | {c.resolution or '-'} |"
            )
    else:
        lines.append("(无)")
    lines.append("")

    lines.append("## 四、坏数据记录（原始行定位）")
    lines.append("")
    if bad_data:
        lines.append("| 轮次 | 来源文件 | 行号 | 字段 | 原始值 | 错误信息 | 托管回执原始行 |")
        lines.append("| --- | --- | --- | --- | --- | --- | --- |")
        for bd in bad_data:
            raw_head = (bd.raw_content[:80] + "...") if len(bd.raw_content) > 80 else bd.raw_content
            lines.append(
                f"| {bd.import_round} | {bd.source_file} | {bd.row_number} | {bd.field_name} "
                f"| `{bd.raw_value}` | {bd.error_message} | {raw_head} |"
            )
    else:
        lines.append("(无)")
    lines.append("")

    lines.append("## 五、操作历史")
    lines.append("")
    has_history = False
    for w in warnings:
        histories = storage.get_history_by_warning(w.id)
        if histories:
            has_history = True
            break
    if has_history:
        lines.append("| 预警ID | 动作 | 操作人 | 旧状态 | 新状态 | 时间 | 说明 |")
        lines.append("| --- | --- | --- | --- | --- | --- | --- |")
        for w in warnings:
            histories = storage.get_history_by_warning(w.id)
            for h in histories:
                lines.append(
                    f"| {h.warning_id} | {h.action} | {h.action_by} "
                    f"| {_status_label_name(h.old_status)} | {_status_label_name(h.new_status)} "
                    f"| {h.created_at.strftime('%Y-%m-%d %H:%M:%S')} | {h.detail} |"
                )
    else:
        lines.append("(无)")
    lines.append("")

    lines.append("## 六、⚠️ 未闭环问题（必须处理后再存档）")
    lines.append("")
    if not consistency["clean"]:
        lines.append(f"> 共 {len(consistency['issues'])} 个未闭环项")
        lines.append("")
        for iss in consistency["issues"]:
            if "warning_id" in iss:
                lines.append(
                    f"- 预警#{iss['warning_id']} `{iss['code']}` → **{_status_label_name(iss['status'])}** "
                    f"原因={iss['reason'] or '-'}  `{iss['description']}`"
                )
            elif "conflict_id" in iss:
                lines.append(
                    f"- ❌ 冲突#{iss['conflict_id']} 未解决: {iss['investor']} {iss['amount']:,.2f} "
                    f"口径={iss['calibres']} 预警ID={iss['warning_ids']}"
                )
        lines.append("")
        lines.append("> 建议：先 `python3 warning.py finalize 20260609-01 --operator 小林` 自动收尾，或手动 `resolve-conflict` / `confirm`。")
    else:
        lines.append("(无) —— 所有预警和冲突均已闭环，可以直接归档本报告。")
    lines.append("")

    lines.append("## 七、说明")
    lines.append("")
    lines.append("- 本报告基于本地 SQLite 数据库 `data/warning.db` 生成。")
    lines.append("- 所有预警均关联原始托管回执行，可通过「来源(行号)」列中的 `source_file:row_number` 定位原始回执。")
    lines.append("- 双口径冲突按**口径A-申购金额 > 口径B-净资产变动**的优先级自动解决，解决后另一笔标记为「已撤回」。")
    lines.append("- 币种错误等异常数据需人工核实，结论记录在确认备注中；晚到附件通过「晚到附件」列关联到最终结论。")
    lines.append("- 同一批材料重复导入时，系统按 SHA1 指纹跳过完全重复的回执行，并在「导入轮次」列标记每轮归属。")
    lines.append("- 导出前一致性检查未通过时，本报告会在头部标 ❌ 并在第六节逐项列出未闭环项。")
    lines.append("")

    content = "\n".join(lines)
    if not output_path:
        clean_flag = "CLEAN" if consistency["clean"] else "UNCLOSED"
        output_path = os.path.join(
            REPORT_DIR,
            f"warning_report_{batch_id}_{clean_flag}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
        )
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)

    return {
        "ok": True,
        "batch_id": batch_id,
        "report_path": output_path,
        "warnings": total,
        "consistency_clean": consistency["clean"],
        "consistency": consistency,
    }


def list_reports() -> List[str]:
    if not os.path.exists(REPORT_DIR):
        return []
    return sorted([f for f in os.listdir(REPORT_DIR) if f.endswith(".md")], reverse=True)
