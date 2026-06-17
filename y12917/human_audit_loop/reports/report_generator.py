import os
from typing import Dict, List
from datetime import datetime

from core.data_loader import BatchProcessResult, UnifiedRecord
from core.batch_processor import trace_record


def _generate_plain_summary(batch: BatchProcessResult) -> str:
    s = batch.stats
    lines = []
    lines.append(f"【人审闭环情况说明（可直接转发）】")
    lines.append(f"各位好，这是批处理 {batch.batch_id} 的人审反馈闭环结果，运行时间：{batch.run_time}。")
    lines.append("")
    lines.append("一、总体情况：")
    lines.append(
        f"这次一共处理了 {s['总记录数']} 条记录，其中旧版表 {s['旧版表记录数']} 条、新版表 {s['新版表记录数']} 条。"
        f"去重前共 {s['总记录数']} 条，去掉重复后实际有效 {s['去重后有效记录数']} 条，"
        f"识别到 {s['重复组数']} 组重复记录（共 {s['重复记录数']} 条被判定为重复）。"
    )
    lines.append("")
    lines.append("二、需要关注的问题：")
    lines.append(
        f"1. 金额单位没填的有 {s['金额单位缺失数']} 条，建议业务方核对补全，避免后续统计时出现单位混乱；"
    )
    lines.append(
        f"2. 带补录备注的记录有 {s['含补录备注记录数']} 条，这类一般是经办人后期补上的说明，"
        f"复核时建议留意一下备注里提到的原始单据或线下沟通记录；"
    )
    lines.append(
        f"3. 已完成标注的有 {s['已标注记录数']} 条、有明确处理意见的有 {s['有处理意见记录数']} 条，"
        f"灰度对比覆盖 {s['灰度对比覆盖数']} 条；"
    )
    lines.append(
        f"4. 另外版本回滚/迁移类的异常有 {s['异常案例数']} 条，已经在异常表里单独列出来了，处理进展可以在异常明细里查。"
    )
    lines.append("")
    lines.append("三、标注标签分布（方便快速定位问题类型）：")
    for k, v in s["标注标签分布"].items():
        lines.append(f"  · {k}：{v} 条")
    lines.append("")
    lines.append("四、处理状态分布：")
    for k, v in s["处理状态分布"].items():
        lines.append(f"  · {k}：{v} 条")
    lines.append("")
    lines.append("五、灰度对比结论：")
    gray = s["灰度对比分析"]
    if gray:
        for grp, info in gray.items():
            lines.append(
                f"  · {grp}：共{info['总数']}条，系统和人工一致{info['一致数']}条，"
                f"一致率{info['一致率(%)']}%。"
                f"不一致的有{info['不一致数']}条，明细已附在报告后面，建议逐条看下是否需要调规则。"
            )
    else:
        lines.append("  本次无灰度对比数据。")
    lines.append("")
    lines.append(
        "如果需要倒查某条具体记录，直接用记录ID在工具里追一下，"
        "就能看到标注、处理意见、灰度判定、是否跨表关联等完整链路。"
    )
    lines.append("")
    return "\n".join(lines)


def _generate_record_table_rows(records: List[UnifiedRecord]) -> List[Dict]:
    rows = []
    for rec in records:
        trunc_map = {}
        remark_display = rec.remark
        if len(remark_display) > 60:
            remark_display = remark_display[:57] + "..."
            trunc_map["备注"] = "备注内容超过60字已截断，完整内容请查看原始表或详情导出"
        opinion_display = rec.opinion
        if len(opinion_display) > 80:
            opinion_display = opinion_display[:77] + "..."
            trunc_map["处理意见"] = "处理意见超过80字已截断，完整内容请使用'追踪单条记录'功能查看"
        desc_display = rec.remark
        if rec.is_duplicate:
            desc_display += f"（被判定为与{rec.duplicate_of}重复，原因：{rec.dedupe_reason}）"

        rows.append({
            "记录ID": rec.record_id,
            "来源表": rec.source_table,
            "客户": rec.customer_name,
            "城市": rec.city,
            "产品": rec.product,
            "金额": rec.amount,
            "单位": rec.unit if rec.unit else "(未填)",
            "日期": rec.date,
            "是否重复": "是" if rec.is_duplicate else "否",
            "重复主记录ID": rec.duplicate_of,
            "标注标签": rec.label,
            "当前状态": rec.status,
            "跟进负责人": rec.owner,
            "备注(截断提示)": remark_display,
            "处理意见(截断提示)": opinion_display,
            "检测到的问题": "；".join(rec.issues) if rec.issues else "",
            "截断说明": "；".join([f"{k}：{v}" for k, v in trunc_map.items()]) if trunc_map else "",
        })
    return rows


def _generate_duplicate_detail(batch: BatchProcessResult) -> List[Dict]:
    rows = []
    for master_id, dup_ids in batch.dedup_groups.items():
        master = next((r for r in batch.unified_records if r.record_id == master_id), None)
        if not master:
            continue
        rows.append({
            "组内角色": "保留(主记录)",
            "记录ID": master_id,
            "来源表": master.source_table,
            "客户": master.customer_name,
            "产品": master.product,
            "金额": master.amount,
            "关联旧流水号": master.link_old_id,
            "标注标签": master.label,
            "处理意见": master.opinion,
            "去重依据": "客户+产品+金额+城市匹配 / 显式关联旧流水号",
        })
        for did in dup_ids:
            dr = next((r for r in batch.unified_records if r.record_id == did), None)
            if not dr:
                continue
            rows.append({
                "组内角色": "被合并(重复)",
                "记录ID": did,
                "来源表": dr.source_table,
                "客户": dr.customer_name,
                "产品": dr.product,
                "金额": dr.amount,
                "关联旧流水号": dr.link_old_id,
                "标注标签": dr.label,
                "处理意见": dr.opinion,
                "去重依据": dr.dedupe_reason,
            })
        rows.append({
            "组内角色": "—— 分组分隔线 ——",
            "记录ID": "", "来源表": "", "客户": "", "产品": "",
            "金额": "", "关联旧流水号": "", "标注标签": "",
            "处理意见": "", "去重依据": "",
        })
    return rows


def _generate_exception_summary(batch: BatchProcessResult) -> List[Dict]:
    rows = []
    for _, er in batch.raw_excep_df.iterrows():
        rid = str(er.get("record_id", "")).strip()
        trace = trace_record(batch, rid)
        chain_snippet = ""
        if trace.get("找到"):
            lbl = trace["标注与处理链路"].get("标注标签", "")
            op = trace["标注与处理链路"].get("处理意见", "")
            chain_snippet = f"标注={lbl or '无'}; 处理意见={op or '无'}"
        desc = str(er.get("description", ""))
        if len(desc) > 100:
            desc = desc[:97] + "..."
        rows.append({
            "异常ID": str(er.get("excep_id", "")),
            "关联记录ID": rid,
            "异常类型": str(er.get("excep_type", "")),
            "发现时间": str(er.get("found_time", "")),
            "问题描述(截断提示)": desc,
            "截断说明": "问题描述超过100字已截断，完整描述请使用'追踪单条记录'功能" if len(str(er.get("description", ""))) > 100 else "",
            "影响范围": str(er.get("impact", "")),
            "当前处理人": str(er.get("handler", "")),
            "处理进展": str(er.get("progress", "")),
            "回查标注/处理意见结果": chain_snippet,
            "证据路径": str(er.get("evidence_path", "")),
        })
    return rows


def generate_text_report(batch: BatchProcessResult, output_dir: str) -> str:
    os.makedirs(output_dir, exist_ok=True)
    fname = f"人审闭环报告_{batch.batch_id}.txt"
    fpath = os.path.join(output_dir, fname)

    content = []
    content.append("=" * 72)
    content.append("                  人审反馈闭环助手 - 处理报告")
    content.append("=" * 72)
    content.append(f"批处理编号：{batch.batch_id}")
    content.append(f"运行时间    ：{batch.run_time}")
    content.append("")
    content.append(_generate_plain_summary(batch))

    content.append("")
    content.append("-" * 72)
    content.append("【附录A：所有记录处理明细表】")
    content.append("-" * 72)
    rows = _generate_record_table_rows(batch.unified_records)
    headers = list(rows[0].keys()) if rows else []
    col_widths = {h: max(len(h), 8) for h in headers}
    for row in rows:
        for h in headers:
            col_widths[h] = min(max(col_widths[h], len(str(row[h]))), 30)

    def fmt_row(r):
        return " | ".join(str(r[h]).ljust(col_widths[h])[: col_widths[h]] for h in headers)

    content.append(fmt_row({h: h for h in headers}))
    content.append("-+-".join("-" * col_widths[h] for h in headers))
    for row in rows[:50]:
        content.append(fmt_row(row))
    if len(rows) > 50:
        content.append(f"......(共 {len(rows)} 条，前50条已展示，完整内容请查看Excel导出)")
    content.append("")

    content.append("-" * 72)
    content.append("【附录B：重复样本明细】")
    content.append("-" * 72)
    dup_rows = _generate_duplicate_detail(batch)
    if dup_rows:
        dup_headers = list(dup_rows[0].keys())
        dw = {h: max(len(h), 8) for h in dup_headers}
        for r in dup_rows:
            for h in dup_headers:
                dw[h] = min(max(dw[h], len(str(r[h]))), 28)
        content.append(" | ".join(h.ljust(dw[h])[: dw[h]] for h in dup_headers))
        content.append("-+-".join("-" * dw[h] for h in dup_headers))
        for r in dup_rows:
            content.append(" | ".join(str(r[h]).ljust(dw[h])[: dw[h]] for h in dup_headers))
    else:
        content.append("无重复样本")
    content.append("")

    content.append("-" * 72)
    content.append("【附录C：版本回滚/异常案例（含可回查的标注记录）】")
    content.append("-" * 72)
    exc_rows = _generate_exception_summary(batch)
    if exc_rows:
        eh = list(exc_rows[0].keys())
        ew = {h: max(len(h), 10) for h in eh}
        for r in exc_rows:
            for h in eh:
                ew[h] = min(max(ew[h], len(str(r[h]))), 32)
        content.append(" | ".join(h.ljust(ew[h])[: ew[h]] for h in eh))
        content.append("-+-".join("-" * ew[h] for h in eh))
        for r in exc_rows:
            content.append(" | ".join(str(r[h]).ljust(ew[h])[: ew[h]] for h in eh))
    content.append("")

    content.append("=" * 72)
    content.append("报告结束。如需追踪单条异常记录，请使用 trace 命令。")
    content.append("=" * 72)

    with open(fpath, "w", encoding="utf-8") as f:
        f.write("\n".join(content))
    return fpath


def generate_plain_email_copy(batch: BatchProcessResult, output_dir: str) -> str:
    os.makedirs(output_dir, exist_ok=True)
    fname = f"人审闭环_可直接转发_{batch.batch_id}.txt"
    fpath = os.path.join(output_dir, fname)
    with open(fpath, "w", encoding="utf-8") as f:
        f.write(_generate_plain_summary(batch))
    return fpath
