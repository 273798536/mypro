from io import BytesIO
import pandas as pd
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from typing import Dict, Any, List
import os
from datetime import datetime

from database import (
    STATUS_CHOICES, STATUS_EXPORT_DESCRIPTIONS, PROCESSING_STATUS_CHOICES
)

STYLE_HEADER_FILL = PatternFill("solid", fgColor="2E5C8A")
STYLE_HEADER_FONT = Font(bold=True, color="FFFFFF", size=11)
STYLE_DUP_FILL = PatternFill("solid", fgColor="FFF3CD")
STYLE_DUP_FONT = Font(color="856404", bold=True)
THIN_BORDER = Border(
    left=Side(style="thin"), right=Side(style="thin"),
    top=Side(style="thin"), bottom=Side(style="thin"),
)
WRAP_ALIGN = Alignment(wrap_text=True, vertical="top")
CENTER_ALIGN = Alignment(horizontal="center", vertical="center", wrap_text=True)


def export_trials_to_excel(
    trials: List[Dict[str, Any]],
    export_type: str = "full",
    screenshot_caption: str = "",
) -> bytes:
    """
    导出试算数据到 Excel (bytes)。
    三个 Sheet：
    1. 试算明细（带重复样本黄标）
    2. 截图说明（与页面状态完全一致的文字）
    3. 数据字典（字段名、状态码解释）
    """
    wb = openpyxl.Workbook()

    # ============ Sheet1: 试算明细 ============
    ws1 = wb.active
    ws1.title = "贝叶斯先验参数试算明细"

    headers = [
        "试算编号", "项目名称", "参数名称", "状态",
        "先验α", "先验β", "先验均值",
        "样本成功", "样本总数", "样本失败",
        "后验α'", "后验β'", "后验均值",
        "权重", "是否重复样本", "重复判定理由",
        "来源批次", "来源文件", "上传人",
        "创建时间", "更新时间", "说明",
    ]
    ws1.append(headers)
    for col_idx in range(1, len(headers) + 1):
        c = ws1.cell(row=1, column=col_idx)
        c.fill = STYLE_HEADER_FILL
        c.font = STYLE_HEADER_FONT
        c.alignment = CENTER_ALIGN
        c.border = THIN_BORDER

    row_idx = 2
    for t in trials:
        dup = t.get("is_duplicate", False)
        ws1.cell(row=row_idx, column=1, value=t.get("trial_no", ""))
        ws1.cell(row=row_idx, column=2, value=t.get("project_name", ""))
        ws1.cell(row=row_idx, column=3, value=t.get("parameter_name", ""))
        ws1.cell(row=row_idx, column=4,
                 value=STATUS_CHOICES.get(t.get("status", ""), t.get("status", "")))
        ws1.cell(row=row_idx, column=5, value=t.get("prior_alpha"))
        ws1.cell(row=row_idx, column=6, value=t.get("prior_beta"))
        ws1.cell(row=row_idx, column=7, value=t.get("prior_mean"))
        ws1.cell(row=row_idx, column=8, value=t.get("sample_success"))
        ws1.cell(row=row_idx, column=9, value=t.get("sample_total"))
        ws1.cell(row=row_idx, column=10, value=t.get("sample_fail"))
        ws1.cell(row=row_idx, column=11, value=t.get("posterior_alpha"))
        ws1.cell(row=row_idx, column=12, value=t.get("posterior_beta"))
        ws1.cell(row=row_idx, column=13, value=t.get("posterior_mean"))
        ws1.cell(row=row_idx, column=14, value=t.get("weight"))
        ws1.cell(row=row_idx, column=15,
                 value="重复样本" if dup else "")
        ws1.cell(row=row_idx, column=16, value=t.get("duplicate_reason") or "")
        ws1.cell(row=row_idx, column=17, value=t.get("source_batch_no") or "")
        ws1.cell(row=row_idx, column=18, value=t.get("source_filename") or "")
        ws1.cell(row=row_idx, column=19, value=t.get("source_uploader") or "")
        ws1.cell(row=row_idx, column=20,
                 value=str(t.get("created_at", ""))[:19] if t.get("created_at") else "")
        ws1.cell(row=row_idx, column=21,
                 value=str(t.get("updated_at", ""))[:19] if t.get("updated_at") else "")
        ws1.cell(row=row_idx, column=22, value=t.get("description") or "")

        for col in range(1, len(headers) + 1):
            cell = ws1.cell(row=row_idx, column=col)
            cell.border = THIN_BORDER
            cell.alignment = WRAP_ALIGN
            if dup:
                cell.fill = STYLE_DUP_FILL
                if col == 15:
                    cell.font = STYLE_DUP_FONT
        row_idx += 1

    col_widths = [18, 18, 18, 10, 10, 10, 12, 10, 10, 10,
                  10, 10, 12, 8, 12, 30, 14, 20, 10, 18, 18, 24]
    for i, w in enumerate(col_widths, 1):
        ws1.column_dimensions[get_column_letter(i)].width = w
    ws1.freeze_panes = "A2"
    ws1.auto_filter.ref = f"A1:{get_column_letter(len(headers))}{row_idx-1}"

    # ============ Sheet2: 截图说明（与页面状态完全一致）============
    ws2 = wb.create_sheet("截图说明(与页面状态一致)")
    ws2.merge_cells("A1:F1")
    title_cell = ws2["A1"]
    title_cell.value = "贝叶斯先验参数试算 · 截图说明（本页文字与接口状态字段保持一致）"
    title_cell.font = Font(bold=True, size=14, color="2E5C8A")
    title_cell.alignment = Alignment(horizontal="center", vertical="center")
    ws2.row_dimensions[1].height = 30

    ws2.cell(row=2, column=1, value="导出时间").font = Font(bold=True)
    ws2.cell(row=2, column=2, value=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"))

    ws2.cell(row=3, column=1, value="导出条数").font = Font(bold=True)
    ws2.cell(row=3, column=2, value=len(trials))

    ws2.cell(row=4, column=1, value="包含重复样本数").font = Font(bold=True)
    ws2.cell(row=4, column=2,
             value=sum(1 for t in trials if t.get("is_duplicate", False)))

    ws2.cell(row=6, column=1, value="状态码说明（与接口/status字段同源）").font = Font(bold=True)
    r = 7
    for code, label in STATUS_CHOICES.items():
        ws2.cell(row=r, column=1, value=code)
        ws2.cell(row=r, column=2, value=label)
        ws2.cell(row=r, column=3,
                 value=STATUS_EXPORT_DESCRIPTIONS.get(code, ""))
        r += 1

    r += 1
    ws2.cell(row=r, column=1,
             value="单条截图说明（每条对应接口detail的文字，可直接贴到PPT/邮件）").font = Font(bold=True)
    r += 1
    for t in trials:
        cap_lines = []
        cap_lines.append(f"=== {t.get('trial_no')} / {t.get('project_name')}-{t.get('parameter_name')} ===")
        st = t.get("status", "")
        cap_lines.append(
            f"当前状态：【{STATUS_CHOICES.get(st, st)}】"
            f"{STATUS_EXPORT_DESCRIPTIONS.get(st, '')}"
        )
        if t.get("status_remark"):
            cap_lines.append(f"状态说明：{t.get('status_remark')}")
        if t.get("is_duplicate", False):
            cap_lines.append(f"⚠️  重复样本：{t.get('duplicate_reason') or ''}")
        cap_lines.append(
            f"先验 α={t.get('prior_alpha')}, β={t.get('prior_beta')}；"
            f"样本 成功/总数={t.get('sample_success')}/{t.get('sample_total')}；"
            f"权重={t.get('weight')}"
        )
        cap_lines.append(
            f"后验 α'={t.get('posterior_alpha')}, β'={t.get('posterior_beta')}；"
            f"后验均值={t.get('posterior_mean')}"
        )
        src_parts = []
        if t.get("source_batch_no"):
            src_parts.append(f"批次={t['source_batch_no']}")
        if t.get("source_filename"):
            src_parts.append(f"文件={t['source_filename']}")
        if src_parts:
            cap_lines.append("数据来源：" + "｜".join(src_parts))
        full = "\n".join(cap_lines)

        ws2.cell(row=r, column=1, value=t.get("trial_no")).font = Font(bold=True)
        ws2.merge_cells(start_row=r, start_column=2, end_row=r, end_column=6)
        cap_cell = ws2.cell(row=r, column=2, value=full)
        cap_cell.alignment = WRAP_ALIGN
        ws2.row_dimensions[r].height = 90
        r += 1

    if screenshot_caption:
        r += 1
        ws2.cell(row=r, column=1, value="自定义备注").font = Font(bold=True)
        ws2.merge_cells(start_row=r, start_column=2, end_row=r, end_column=6)
        ws2.cell(row=r, column=2, value=screenshot_caption).alignment = WRAP_ALIGN

    ws2.column_dimensions["A"].width = 16
    ws2.column_dimensions["B"].width = 20
    for c in ["C", "D", "E", "F"]:
        ws2.column_dimensions[c].width = 32

    # ============ Sheet3: 数据字典 ============
    ws3 = wb.create_sheet("数据字典与处理状态")
    dict_headers = ["标准字段名", "字段说明", "可能的原始字段名举例"]
    ws3.append(dict_headers)
    for c in range(1, len(dict_headers) + 1):
        cell = ws3.cell(row=1, column=c)
        cell.fill = STYLE_HEADER_FILL
        cell.font = STYLE_HEADER_FONT
        cell.alignment = CENTER_ALIGN
        cell.border = THIN_BORDER

    field_dict_rows = [
        ["trial_no", "试算编号（系统生成，唯一）", "编号,序号,ID,No,BYS编号"],
        ["project_name", "项目名称", "项目,项目名,project,所属项目"],
        ["parameter_name", "参数名称", "参数,参数名,指标,parameter,prior参数"],
        ["prior_alpha", "先验α（Beta分布形状参数1）", "α,alpha,先验α,形状参数1,a,prior_a"],
        ["prior_beta", "先验β（Beta分布形状参数2）", "β,beta,先验β,形状参数2,b,prior_b"],
        ["sample_success", "样本成功数", "成功数,命中,阳性,s,成功"],
        ["sample_total", "样本总数", "总数,n,样本量,总量,样本数"],
        ["weight", "权重", "权重,w,重要性,weight"],
        ["status", "状态码", "状态,审核状态,status,state"],
        ["is_duplicate", "是否重复样本", "重复,重复标记,duplicate,是否重复"],
        ["source_batch_no", "来源批次号", "批次号,批次,导入批次,batch_no"],
        ["source_filename", "来源文件名", "文件名,文件,来源文件,import_file"],
    ]
    for r, row in enumerate(field_dict_rows, 2):
        for c, val in enumerate(row, 1):
            cell = ws3.cell(row=r, column=c, value=val)
            cell.border = THIN_BORDER
            cell.alignment = WRAP_ALIGN

    r += 2
    ws3.cell(row=r, column=1,
             value="历史答案处理状态码").font = Font(bold=True, color="2E5C8A")
    r += 1
    for code, label in PROCESSING_STATUS_CHOICES.items():
        ws3.cell(row=r, column=1, value=code)
        ws3.cell(row=r, column=2, value=label)
        r += 1

    ws3.column_dimensions["A"].width = 20
    ws3.column_dimensions["B"].width = 36
    ws3.column_dimensions["C"].width = 36

    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()


def export_single_detail(detail: Dict[str, Any]) -> bytes:
    """
    导出单条详情，包含所有关联信息：
    历史答案、权重变更、状态变更、追溯线索、导出记录
    """
    wb = openpyxl.Workbook()

    ws = wb.active
    ws.title = "详情-主记录"
    ws.append(["字段", "值", "说明"])
    for c in range(1, 4):
        cell = ws.cell(row=1, column=c)
        cell.fill = STYLE_HEADER_FILL
        cell.font = STYLE_HEADER_FONT
        cell.alignment = CENTER_ALIGN
        cell.border = THIN_BORDER

    main_rows = [
        ["试算编号", detail.get("trial_no", ""), "系统唯一"],
        ["项目名称", detail.get("project_name", ""), ""],
        ["参数名称", detail.get("parameter_name", ""), ""],
        ["状态", f"{detail.get('status_label', '')} ({detail.get('status', '')})",
         detail.get("status_export_description", "")],
        ["状态说明", detail.get("status_remark") or "", ""],
        ["先验α", detail.get("prior_alpha"), ""],
        ["先验β", detail.get("prior_beta"), ""],
        ["先验均值", detail.get("prior_mean"), "α/(α+β)"],
        ["样本成功", detail.get("sample_success"), ""],
        ["样本总数", detail.get("sample_total"), ""],
        ["样本失败", detail.get("sample_fail"), "总数-成功"],
        ["后验α'", detail.get("posterior_alpha"), "α+成功"],
        ["后验β'", detail.get("posterior_beta"), "β+失败"],
        ["后验均值", detail.get("posterior_mean"), "α'/α'+β'"],
        ["权重", detail.get("weight"), "可修改，修改有日志"],
        ["是否重复样本",
         "是 ⚠️ " if detail.get("is_duplicate") else "否",
         detail.get("duplicate_reason", "")],
        ["关联主样本ID", detail.get("duplicate_of_id") or "", ""],
        ["来源批次", detail.get("source_batch_no") or "", ""],
        ["来源文件", detail.get("source_filename") or "", ""],
        ["上传人", detail.get("source_uploader") or "", ""],
        ["创建时间", str(detail.get("created_at", ""))[:19], ""],
        ["更新时间", str(detail.get("updated_at", ""))[:19], ""],
        ["创建人", detail.get("created_by") or "", ""],
        ["说明", detail.get("description") or "", ""],
    ]
    for r, row in enumerate(main_rows, 2):
        for c, val in enumerate(row, 1):
            cell = ws.cell(row=r, column=c, value=val)
            cell.border = THIN_BORDER
            cell.alignment = WRAP_ALIGN

    ws.column_dimensions["A"].width = 18
    ws.column_dimensions["B"].width = 40
    ws.column_dimensions["C"].width = 40

    # Sheet2 权重变更记录
    ws2 = wb.create_sheet("权重变更记录")
    ws2.append(["时间", "修改前权重", "修改后权重", "变化量",
                "关联历史答案ID", "参考答案取值", "参考来源", "理由", "操作人"])
    for c in range(1, 10):
        cell = ws2.cell(row=1, column=c)
        cell.fill = STYLE_HEADER_FILL
        cell.font = STYLE_HEADER_FONT
        cell.alignment = CENTER_ALIGN
        cell.border = THIN_BORDER
    for r, w in enumerate(detail.get("weight_changes", []) or [], 2):
        row_data = [
            str(w.get("changed_at", ""))[:19],
            w.get("old_weight"), w.get("new_weight"),
            w.get("delta"),
            w.get("historical_answer_id"),
            w.get("reference_answer_value"),
            w.get("historical_answer_source") or "",
            w.get("reason") or "", w.get("changed_by") or "",
        ]
        for c, val in enumerate(row_data, 1):
            cell = ws2.cell(row=r, column=c, value=val)
            cell.border = THIN_BORDER
            cell.alignment = WRAP_ALIGN
    for i, w in enumerate([18, 12, 12, 10, 14, 12, 16, 20, 10], 1):
        ws2.column_dimensions[get_column_letter(i)].width = w

    # Sheet3 状态变更日志
    ws3 = wb.create_sheet("状态变更日志")
    ws3.append(["时间", "原状态", "新状态", "变更说明", "操作人"])
    for c in range(1, 6):
        cell = ws3.cell(row=1, column=c)
        cell.fill = STYLE_HEADER_FILL
        cell.font = STYLE_HEADER_FONT
        cell.alignment = CENTER_ALIGN
        cell.border = THIN_BORDER
    for r, s in enumerate(detail.get("status_changes", []) or [], 2):
        row_data = [
            str(s.get("changed_at", ""))[:19],
            s.get("old_status_label") or s.get("old_status"),
            s.get("new_status_label") or s.get("new_status"),
            s.get("remark") or "", s.get("changed_by") or "",
        ]
        for c, val in enumerate(row_data, 1):
            cell = ws3.cell(row=r, column=c, value=val)
            cell.border = THIN_BORDER
            cell.alignment = WRAP_ALIGN
    for i, w in enumerate([18, 12, 12, 30, 10], 1):
        ws3.column_dimensions[get_column_letter(i)].width = w

    # Sheet4 历史答案（保留来源，字段名可能前后不一）
    ws4 = wb.create_sheet("历史答案(保留原始字段)")
    ws4.append(["时间", "来源", "批次", "答案取值", "可信度",
                "原始字段名(可能前后不一)", "处理状态", "处理说明",
                "被权重修改引用次数", "完整原始载荷(JSON)"])
    for c in range(1, 11):
        cell = ws4.cell(row=1, column=c)
        cell.fill = STYLE_HEADER_FILL
        cell.font = STYLE_HEADER_FONT
        cell.alignment = CENTER_ALIGN
        cell.border = THIN_BORDER
    for r, h in enumerate(detail.get("historical_answers", []) or [], 2):
        import json as _json
        raw_payload = h.get("raw_answer_payload")
        raw_str = _json.dumps(raw_payload, ensure_ascii=False) if raw_payload else ""
        orig_fields = ", ".join(h.get("original_field_names") or [])
        row_data = [
            str(h.get("created_at", ""))[:19],
            h.get("answer_source") or "", h.get("answer_batch") or "",
            h.get("answer_value"), h.get("answer_confidence"),
            orig_fields,
            f"{h.get('processing_status_label')} ({h.get('processing_status')})",
            h.get("processing_remark") or "",
            h.get("weight_change_used_count") or 0,
            raw_str,
        ]
        for c, val in enumerate(row_data, 1):
            cell = ws4.cell(row=r, column=c, value=val)
            cell.border = THIN_BORDER
            cell.alignment = WRAP_ALIGN
    for i, w in enumerate([18, 14, 12, 10, 10, 30, 16, 20, 14, 40], 1):
        ws4.column_dimensions[get_column_letter(i)].width = w

    # Sheet5 追溯线索（彩排讲给不看代码的人听）
    ws5 = wb.create_sheet("追溯线索(人话版)")
    ws5.append(["时间", "阶段", "涉及字段", "变更前", "变更后",
                "人话描述（可直接讲）", "证据引用", "操作人"])
    for c in range(1, 9):
        cell = ws5.cell(row=1, column=c)
        cell.fill = STYLE_HEADER_FILL
        cell.font = STYLE_HEADER_FONT
        cell.alignment = CENTER_ALIGN
        cell.border = THIN_BORDER
    for r, t in enumerate(detail.get("trace_records", []) or [], 2):
        row_data = [
            str(t.get("operated_at", ""))[:19],
            t.get("trace_stage_label") or t.get("trace_stage"),
            t.get("field_name") or "", t.get("field_value_before") or "",
            t.get("field_value_after") or "", t.get("narrative") or "",
            t.get("evidence_ref") or "", t.get("operator") or "",
        ]
        for c, val in enumerate(row_data, 1):
            cell = ws5.cell(row=r, column=c, value=val)
            cell.border = THIN_BORDER
            cell.alignment = WRAP_ALIGN
    for i, w in enumerate([18, 12, 12, 12, 12, 40, 20, 10], 1):
        ws5.column_dimensions[get_column_letter(i)].width = w

    # Sheet6 导出记录
    ws6 = wb.create_sheet("导出记录(与状态一致)")
    ws6.append(["时间", "类型", "文件名", "导出时状态", "导出时状态说明",
                "导出时是否重复", "导出时权重", "导出截图说明文字"])
    for c in range(1, 9):
        cell = ws6.cell(row=1, column=c)
        cell.fill = STYLE_HEADER_FILL
        cell.font = STYLE_HEADER_FONT
        cell.alignment = CENTER_ALIGN
        cell.border = THIN_BORDER
    for r, e in enumerate(detail.get("export_records", []) or [], 2):
        row_data = [
            str(e.get("exported_at", ""))[:19],
            e.get("export_type") or "", e.get("export_filename") or "",
            e.get("export_status_label") or "",
            e.get("export_status_description") or "",
            "是" if e.get("is_duplicate_at_export") else "否",
            e.get("weight_at_export"),
            e.get("export_screenshot_caption") or "",
        ]
        for c, val in enumerate(row_data, 1):
            cell = ws6.cell(row=r, column=c, value=val)
            cell.border = THIN_BORDER
            cell.alignment = WRAP_ALIGN
    for i, w in enumerate([18, 10, 30, 14, 24, 14, 10, 40], 1):
        ws6.column_dimensions[get_column_letter(i)].width = w

    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()


def import_from_records(raw_records: List[Dict[str, Any]],
                        field_mapping: Dict[str, str]) -> List[Dict[str, Any]]:
    """
    将原始导入记录按字段映射转换为标准字段。
    返回转换后的标准数据字典列表，同时保留原始数据。
    """
    import copy
    result = []
    for rec in raw_records:
        standardized = {}
        reverse_map = {}
        for orig_field, std_field in field_mapping.items():
            if orig_field in rec and rec[orig_field] is not None:
                standardized[std_field] = rec[orig_field]
                reverse_map[std_field] = orig_field
        # 保留所有原始字段 + 映射快照
        item = {
            "standardized": standardized,
            "reverse_mapping": reverse_map,
            "raw_payload": copy.deepcopy(rec),
            "original_keys": list(rec.keys()),
        }
        result.append(item)
    return result
