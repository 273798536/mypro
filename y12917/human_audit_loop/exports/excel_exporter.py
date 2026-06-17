import os
from typing import Dict, List, Optional

import pandas as pd
import xlsxwriter

from core.data_loader import BatchProcessResult, UnifiedRecord
from core.batch_processor import trace_record


def _build_overview_sheet_data(batch: BatchProcessResult) -> List[List]:
    s = batch.stats
    rows = []
    rows.append(["【人审反馈闭环助手 - 处理概览】"])
    rows.append(["批处理编号", batch.batch_id])
    rows.append(["运行时间", batch.run_time])
    rows.append([])

    rows.append(["一、总体指标（给业务方和平台工程师快速看）"])
    rows.append(["指标名称", "数值", "说明"])
    rows.append(["总记录数", s["总记录数"], "新旧版表合计"])
    rows.append(["旧版表记录数", s["旧版表记录数"], "来自旧版人审表"])
    rows.append(["新版表记录数", s["新版表记录数"], "来自新版人审表"])
    rows.append(["重复记录数", s["重复记录数"], "被判定为重复、可合并掉的"])
    rows.append(["去重后有效记录数", s["去重后有效记录数"], "去重后保留的唯一记录"])
    rows.append(["重复组数", s["重复组数"], "多少组存在重复"])
    rows.append(["金额单位缺失数", s["金额单位缺失数"], "需业务方补填单位，避免统计金额时混乱"])
    rows.append(["含补录备注记录数", s["含补录备注记录数"], "经办人后期补过说明，复核时请关注原始单据"])
    rows.append(["已标注记录数", s["已标注记录数"], "有标签的记录数"])
    rows.append(["有处理意见记录数", s["有处理意见记录数"], "有明确处理意见、可跟进闭环的"])
    rows.append(["灰度对比覆盖数", s["灰度对比覆盖数"], "参与灰度对比实验的记录"])
    rows.append(["异常/回滚案例数", s["异常案例数"], "版本回滚、迁移等造成的异常"])
    rows.append([])

    rows.append(["二、标注标签分布"])
    rows.append(["标签", "数量"])
    for k, v in s["标注标签分布"].items():
        rows.append([k, v])
    rows.append([])

    rows.append(["三、处理状态分布"])
    rows.append(["状态", "数量"])
    for k, v in s["处理状态分布"].items():
        rows.append([k, v])
    rows.append([])

    rows.append(["四、灰度对比汇总"])
    rows.append(["灰度组", "总数", "一致数", "不一致数", "一致率(%)", "说明"])
    gray = s["灰度对比分析"]
    if gray:
        for grp, info in gray.items():
            rows.append([
                grp, info["总数"], info["一致数"], info["不一致数"], info["一致率(%)"],
                "不一致明细请查看'灰度对比明细'sheet",
            ])
    rows.append([])

    rows.append(["五、【可直接复制转发给同事的说明文字】"])
    explain = (
        f"各位好，这是批处理 {batch.batch_id} 的人审反馈闭环结果，"
        f"运行时间 {batch.run_time}。本次共处理 {s['总记录数']} 条记录"
        f"（旧版 {s['旧版表记录数']} / 新版 {s['新版表记录数']}），"
        f"去重后有效 {s['去重后有效记录数']} 条，识别到 {s['重复组数']} 组重复。"
        f"需要关注：①金额单位没填的有 {s['金额单位缺失数']} 条，请业务方核对补全；"
        f"②带补录备注的有 {s['含补录备注记录数']} 条，建议复核时留意备注里的原始单据；"
        f"③异常/回滚案例 {s['异常案例数']} 条，详见'异常案例'sheet。"
        f"如需倒查某条记录，使用记录ID在工具里 trace 一下，即可看到标注、处理意见、灰度判定的完整链路。"
    )
    rows.append([explain])
    return rows


def _build_detail_data(batch: BatchProcessResult) -> pd.DataFrame:
    out = []
    for rec in batch.unified_records:
        remark = rec.remark
        remark_trunc_reason = ""
        if len(remark) > 80:
            remark_trunc_reason = (
                f"备注内容较长（{len(remark)}字），已在表格中截断显示；"
                f"如需完整内容，请在工具中用 trace 命令查看，或打开原始人审表查看"
            )
            remark = remark[:77] + "..."

        opinion = rec.opinion
        opinion_trunc_reason = ""
        if len(opinion) > 100:
            opinion_trunc_reason = (
                f"处理意见较长（{len(opinion)}字），已截断；"
                f"完整处理意见请使用 trace 命令查看该记录详情"
            )
            opinion = opinion[:97] + "..."

        out.append({
            "记录ID": rec.record_id,
            "来源表": rec.source_table,
            "客户姓名": rec.customer_name,
            "所属城市": rec.city,
            "产品": rec.product,
            "金额": rec.amount,
            "金额单位": rec.unit if rec.unit else "【未填】请补单位",
            "登记/提交日期": rec.date,
            "审核人": rec.auditor,
            "复核结论": rec.review_result,
            "关联旧流水号": rec.link_old_id,
            "是否判定为重复": "是（已合并）" if rec.is_duplicate else "否",
            "重复主记录ID": rec.duplicate_of,
            "去重判定依据": rec.dedupe_reason,
            "标注标签": rec.label,
            "标注时间": rec.label_time,
            "标注人": rec.labeler,
            "处理意见（截断说明见下一列）": opinion,
            "处理意见截断说明": opinion_trunc_reason,
            "跟进负责人": rec.owner,
            "处理状态": rec.status,
            "灰度组": rec.gray_group,
            "模型/规则版本": rec.model_version,
            "系统判定": rec.auto_decision,
            "人工判定": rec.human_decision,
            "系统与人工是否一致": rec.is_consistent,
            "备注（截断说明见下一列）": remark,
            "备注截断说明": remark_trunc_reason,
            "系统自动检测到的问题": "；".join(rec.issues) if rec.issues else "无",
        })
    return pd.DataFrame(out)


def _build_dedupe_detail(batch: BatchProcessResult) -> pd.DataFrame:
    rows = []
    idx = 1
    for master_id, dup_ids in batch.dedup_groups.items():
        master = next((r for r in batch.unified_records if r.record_id == master_id), None)
        if not master:
            continue
        rows.append({
            "重复组编号": f"G{idx:03d}",
            "组内角色": "保留的主记录",
            "记录ID": master_id,
            "来源表": master.source_table,
            "客户": master.customer_name,
            "产品": master.product,
            "金额": master.amount,
            "单位": master.unit,
            "关联旧流水号": master.link_old_id,
            "标注标签": master.label,
            "处理意见": master.opinion,
            "处理状态": master.status,
            "合并依据说明": "与下列记录在客户+产品+金额+城市维度一致，或显式关联了旧流水号",
        })
        for did in dup_ids:
            dr = next((r for r in batch.unified_records if r.record_id == did), None)
            if not dr:
                continue
            rows.append({
                "重复组编号": f"G{idx:03d}",
                "组内角色": "被合并掉的重复记录",
                "记录ID": did,
                "来源表": dr.source_table,
                "客户": dr.customer_name,
                "产品": dr.product,
                "金额": dr.amount,
                "单位": dr.unit,
                "关联旧流水号": dr.link_old_id,
                "标注标签": dr.label,
                "处理意见": dr.opinion,
                "处理状态": dr.status,
                "合并依据说明": dr.dedupe_reason,
            })
        idx += 1
    return pd.DataFrame(rows)


def _build_gray_detail(batch: BatchProcessResult) -> pd.DataFrame:
    gray = batch.stats["灰度对比分析"]
    rows = []
    for grp, info in gray.items():
        rows.append({
            "灰度组": grp,
            "总数": info["总数"],
            "一致数": info["一致数"],
            "不一致数": info["不一致数"],
            "一致率(%)": info["一致率(%)"],
            "系统自动通过": info["系统自动通过"],
            "系统自动拒绝": info["系统自动拒绝"],
            "系统转人工": info["系统转人工"],
            "人工通过": info["人工通过"],
            "人工驳回": info["人工驳回"],
            "人工待补充": info["人工待补充"],
            "说明": "下面列出不一致明细",
        })
        rows.append({
            "灰度组": "↓ 该组不一致明细 ↓",
            "记录ID": "", "客户": "", "系统判定": "", "人工判定": "",
            "标注标签": "", "处理意见": "", "备注": "",
        })
        for d in info["不一致明细"]:
            rows.append({
                "灰度组": grp,
                "记录ID": d["记录ID"],
                "来源表": d["来源表"],
                "客户": d["客户"],
                "金额": d["金额"],
                "系统判定": d["系统判定"],
                "人工判定": d["人工判定"],
                "标注标签": d["标注标签"],
                "处理意见": d["处理意见"],
            })
    return pd.DataFrame(rows)


def _build_exception_detail(batch: BatchProcessResult) -> pd.DataFrame:
    rows = []
    for _, er in batch.raw_excep_df.iterrows():
        rid = str(er.get("record_id", "")).strip()
        trace = trace_record(batch, rid)
        found = trace.get("找到", False)
        desc = str(er.get("description", ""))
        desc_trunc = ""
        if len(desc) > 120:
            desc_trunc = (
                f"问题描述原文共{len(desc)}字，已截断；完整描述请使用 trace 命令追踪"
                f"关联记录ID {rid} 查看详情"
            )
            desc = desc[:117] + "..."
        impact = str(er.get("impact", ""))
        impact_trunc = ""
        if len(impact) > 80:
            impact_trunc = "影响范围过长已截断，完整内容请用 trace 命令查看"
            impact = impact[:77] + "..."

        if found:
            chain = trace["标注与处理链路"]
            rows.append({
                "异常ID": str(er.get("excep_id", "")),
                "关联记录ID": rid,
                "异常类型": str(er.get("excep_type", "")),
                "发现时间": str(er.get("found_time", "")),
                "问题描述（截断说明见下一列）": desc,
                "问题描述截断说明": desc_trunc,
                "影响范围（截断说明见下一列）": impact,
                "影响范围截断说明": impact_trunc,
                "当前处理人": str(er.get("handler", "")),
                "处理进展": str(er.get("progress", "")),
                "证据路径": str(er.get("evidence_path", "")),
                "【回查结果】是否能追到标注": "是",
                "【回查结果】标注标签": chain.get("标注标签", ""),
                "【回查结果】标注时间": chain.get("标注时间", ""),
                "【回查结果】标注人": chain.get("标注人", ""),
                "【回查结果】处理意见": chain.get("处理意见", ""),
                "【回查结果】跟进负责人": chain.get("跟进负责人", ""),
                "【回查结果】当前状态": chain.get("当前状态", ""),
            })
        else:
            rows.append({
                "异常ID": str(er.get("excep_id", "")),
                "关联记录ID": rid,
                "异常类型": str(er.get("excep_type", "")),
                "发现时间": str(er.get("found_time", "")),
                "问题描述（截断说明见下一列）": desc,
                "问题描述截断说明": desc_trunc,
                "影响范围（截断说明见下一列）": impact,
                "影响范围截断说明": impact_trunc,
                "当前处理人": str(er.get("handler", "")),
                "处理进展": str(er.get("progress", "")),
                "证据路径": str(er.get("evidence_path", "")),
                "【回查结果】是否能追到标注": "否（请确认记录是否真的存在于当前批次）",
                "【回查结果】失败原因": trace.get("原因", ""),
            })
    return pd.DataFrame(rows)


def _build_trace_sheet(
    batch: BatchProcessResult, target_id: Optional[str]
) -> pd.DataFrame:
    rows = []
    if not target_id:
        rows.append(["提示", "使用命令行 --trace-id 参数指定要追踪的记录ID，这里会自动生成追踪详情"])
        return pd.DataFrame(rows)
    trace = trace_record(batch, target_id)
    if not trace.get("找到"):
        rows.append(["结果", "未找到该记录"])
        rows.append(["原因", trace.get("原因", "")])
        return pd.DataFrame(rows)
    rows.append(["字段", "内容"])
    rows.append(["记录ID", trace["记录ID"]])
    for k, v in trace["基本信息"].items():
        rows.append([f"基本信息 - {k}", str(v)])
    rows.append(["检测到的问题", "；".join(trace["检测到的问题"])])
    for k, v in trace["去重信息"].items():
        rows.append([f"去重信息 - {k}", str(v)])
    for k, v in trace["标注与处理链路"].items():
        rows.append([f"标注与处理链路 - {k}", str(v)])
    for k, v in trace["灰度判定链路"].items():
        rows.append([f"灰度判定链路 - {k}", str(v)])
    if "跨表关联" in trace:
        for k, v in trace["跨表关联"].items():
            rows.append([f"跨表关联 - {k}", str(v)])
    if "被保留的主记录详情" in trace:
        for k, v in trace["被保留的主记录详情"].items():
            rows.append([f"主记录详情 - {k}", str(v)])
    if "关联异常案例" in trace:
        for k, v in trace["关联异常案例"].items():
            rows.append([f"关联异常 - {k}", str(v)])
    return pd.DataFrame(rows)


def export_to_excel(
    batch: BatchProcessResult,
    output_dir: str,
    trace_id: Optional[str] = None,
) -> str:
    os.makedirs(output_dir, exist_ok=True)
    fname = f"人审闭环导出_{batch.batch_id}.xlsx"
    fpath = os.path.join(output_dir, fname)

    with pd.ExcelWriter(fpath, engine="xlsxwriter") as writer:
        wb = writer.book
        header_fmt = wb.add_format({
            "bold": True, "bg_color": "#D9E1F2", "border": 1, "valign": "vcenter",
        })
        wrap_fmt = wb.add_format({"text_wrap": True, "valign": "top"})
        warn_fmt = wb.add_format({"bg_color": "#FFF2CC", "border": 1})

        overview = _build_overview_sheet_data(batch)
        max_cols = max(len(row) for row in overview) if overview else 1
        ws = wb.add_worksheet("1_概览")
        ws.set_column(0, max_cols - 1, 80, wrap_fmt)
        for row_idx, row in enumerate(overview):
            padded = list(row) + [""] * (max_cols - len(row))
            for col_idx, val in enumerate(padded):
                ws.write(row_idx, col_idx, str(val) if val is not None else "")

        detail = _build_detail_data(batch)
        detail.to_excel(writer, sheet_name="2_记录明细", index=False)
        ws = writer.sheets["2_记录明细"]
        for col_idx, col_name in enumerate(detail.columns):
            max_len = max(
                [len(str(col_name))] +
                [len(str(v)) for v in detail[col_name].astype(str).tolist()[:200]]
            )
            ws.set_column(col_idx, col_idx, min(max_len + 2, 40), wrap_fmt)
        for row_idx in range(1, len(detail) + 1):
            unit_val = detail.iloc[row_idx - 1].get("金额单位", "")
            if "未填" in str(unit_val):
                ws.write(row_idx, detail.columns.get_loc("金额单位"), str(unit_val), warn_fmt)

        dedupe_df = _build_dedupe_detail(batch)
        if len(dedupe_df) > 0:
            dedupe_df.to_excel(writer, sheet_name="3_去重明细", index=False)
            ws = writer.sheets["3_去重明细"]
            for col_idx, col_name in enumerate(dedupe_df.columns):
                ws.set_column(col_idx, col_idx, 25, wrap_fmt)
        else:
            pd.DataFrame([["无重复样本"]]).to_excel(
                writer, sheet_name="3_去重明细", index=False, header=False
            )

        gray_df = _build_gray_detail(batch)
        if len(gray_df) > 0:
            gray_df.to_excel(writer, sheet_name="4_灰度对比", index=False)
            ws = writer.sheets["4_灰度对比"]
            for col_idx, col_name in enumerate(gray_df.columns):
                ws.set_column(col_idx, col_idx, 28, wrap_fmt)

        exc_df = _build_exception_detail(batch)
        if len(exc_df) > 0:
            exc_df.to_excel(writer, sheet_name="5_异常案例(可回查)", index=False)
            ws = writer.sheets["5_异常案例(可回查)"]
            for col_idx, col_name in enumerate(exc_df.columns):
                ws.set_column(col_idx, col_idx, 28, wrap_fmt)

        trace_df = _build_trace_sheet(batch, trace_id)
        trace_df.to_excel(writer, sheet_name="6_单条记录追踪", index=False, header=False)
        ws = writer.sheets["6_单条记录追踪"]
        ws.set_column(0, 0, 32)
        ws.set_column(1, 1, 90, wrap_fmt)

    return fpath
