"""报告生成工具：输出 PDF + 普通话解释 + 异常追溯链。"""
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, ListFlowable, ListItem
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from ..config import settings


_FONT_REGISTERED = False


def _register_cn_font():
    """注册中文字体，优先使用系统常见字体，否则回退到 Helvetica。"""
    global _FONT_REGISTERED
    if _FONT_REGISTERED:
        return True
    candidates = [
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/STHeiti Light.ttc",
        "/Library/Fonts/Songti.ttc",
        "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "C:/Windows/Fonts/msyh.ttc",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                pdfmetrics.registerFont(TTFont("ChineseFont", path))
                _FONT_REGISTERED = True
                return True
            except Exception:
                continue
    _FONT_REGISTERED = True
    return False


def _cn(text: str) -> str:
    return text or ""


def generate_report_plain_explain(record_detail: Dict[str, Any]) -> str:
    """生成一段可以直接复制给同事的普通话解释。"""
    subs = record_detail.get("substrate_conversions", [])
    conds = record_detail.get("reaction_conditions", [])
    specs = record_detail.get("spectrum_data", [])

    temp_mix = record_detail.get("has_temp_unit_mix")
    peak_mix = record_detail.get("has_peak_overlap")
    weight_issue = record_detail.get("has_weighing_issue")

    lines = []
    lines.append(
        f"【{record_detail.get('material_name', '酶促反应底物换算')}处理说明（批次：{record_detail.get('batch_no', '')}）】"
    )
    lines.append(
        f"各位同事：本批「{record_detail.get('material_name', '')}」的底物换算与反应条件复核已完成，"
        f"共纳入 {len(subs)} 个底物、{len(conds)} 项反应条件、{len(specs)} 个谱峰数据，"
        f"处理单号为 {record_detail.get('record_no', '')}。"
    )

    # 底物换算结果简述
    if subs:
        lines.append("【底物浓度换算结果】")
        for s in subs:
            lines.append(
                f"• {s.get('substrate_name', '')}："
                f"称样 {s.get('initial_mass', '')}{s.get('initial_mass_unit', '')}"
                f" / 定容 {s.get('volume', '')}{s.get('volume_unit', '')}"
                f" → 终浓度 {s.get('final_concentration', '')}{s.get('final_concentration_unit', '')}。"
            )
            if s.get("is_weighing_insufficient") and s.get("weighing_issue_explain"):
                lines.append(f"  ⚠ 称量精度提醒：{s.get('weighing_issue_explain')}")

    # 温度单位混用
    if temp_mix:
        detail = record_detail.get("temp_unit_issue_detail") or {}
        lines.append(
            f"【反应温度复核】存在温度单位混用（{detail.get('units_used', [])}），"
            f"已全部归一化为 ℃。{detail.get('summary', '')}。请相关同事在记录中统一使用 ℃ 以便追溯。"
        )

    # 谱峰重叠
    if peak_mix:
        detail = record_detail.get("peak_overlap_detail") or {}
        lines.append(
            f"【谱图判读】共检出 {len(detail.get('overlaps', []))} 处峰重叠，"
            f"其中中度及以上重叠请在定量时注意背景扣除，处理意见已写入复核记录。"
        )
        for o in detail.get("overlaps", [])[:3]:
            lines.append(f"  • {o.get('note', '')}")

    # 处理意见
    opinion = record_detail.get("processing_opinion")
    if opinion:
        lines.append(f"【处理意见/放行意见】{opinion}")

    # 安全备注
    safety = record_detail.get("safety_note")
    if safety:
        lines.append(f"【安全提醒】{safety}")

    lines.append(
        f"——以上内容由系统根据记录号 {record_detail.get('record_no', '')} 自动生成，"
        f"如有疑问请联系复核人 {record_detail.get('reviewer', '')}。"
    )
    return "\n\n".join(lines)


def generate_audit_chain(record_detail: Dict[str, Any], anomaly_key: str = None) -> List[Dict[str, Any]]:
    """
    顺着异常往回查：生成完整追溯链。
    anomaly_key 可选指定异常点（如 "ONPG称量精度"/"峰6.12重叠"），否则返回从当前状态到导入的完整链。
    """
    chain = []
    record_no = record_detail.get("record_no", "")

    # 异常点定位
    anchor = None
    if anomaly_key:
        for s in record_detail.get("substrate_conversions", []):
            if s.get("is_weighing_insufficient") and anomaly_key in (s.get("substrate_name") or ""):
                anchor = {"type": "称量精度不足", "target": s.get("substrate_name"), "detail": s}
                break
        if not anchor:
            for sp in record_detail.get("spectrum_data", []):
                if sp.get("is_overlap") and anomaly_key in (sp.get("peak_name") or ""):
                    anchor = {"type": "谱峰重叠", "target": sp.get("peak_name"), "detail": sp}
                    break
        if not anchor:
            for c in record_detail.get("reaction_conditions", []):
                if (c.get("is_unit_missing") or c.get("is_unit_mismatch")) and anomaly_key in (c.get("condition_name") or ""):
                    anchor = {"type": "温度单位异常", "target": c.get("condition_name"), "detail": c}
                    break

    if anchor:
        chain.append({
            "level": 0,
            "node": f"异常定位：{anchor['type']} → {anchor['target']}",
            "evidence": anchor.get("detail", {}),
            "suggestion": "请先确认该异常是否影响放行判定。",
        })

    # 处理意见
    if record_detail.get("processing_opinion"):
        chain.append({
            "level": 1 if anchor else 0,
            "node": "处理意见（复核人给出）",
            "evidence": {
                "复核人": record_detail.get("reviewer"),
                "复核时间": str(record_detail.get("reviewed_at", "")),
                "意见内容": record_detail.get("processing_opinion"),
            },
        })

    # 反应条件关联
    chain.append({
        "level": 2 if anchor else 1,
        "node": "反应条件复核（与换算/判读共用同一记录号）",
        "evidence": {
            f"条件{c.get('row_order', i+1)} {c.get('condition_name')}": (
                f"原值={c.get('condition_value')} {c.get('unit') or '(未填)'}"
                f"；归一化={c.get('normalized_value')} {c.get('normalized_unit')}"
                f"；{'⚠ ' + c.get('issue_description') if c.get('issue_description') else '正常'}"
            )
            for i, c in enumerate(record_detail.get("reaction_conditions", []))
        },
    })

    # 浓度换算记录
    chain.append({
        "level": 3 if anchor else 2,
        "node": "底物浓度换算（与谱图判读绑定）",
        "evidence": {
            s.get("substrate_name") or f"底物{i+1}": {
                "称样": f"{s.get('initial_mass')}{s.get('initial_mass_unit')}",
                "定容": f"{s.get('volume')}{s.get('volume_unit')}",
                "分子量": s.get("molecular_weight"),
                "纯度": f"{s.get('purity')}%",
                "终浓度": f"{s.get('final_concentration')}{s.get('final_concentration_unit')}",
                "公式": s.get("conversion_formula"),
                "称量提醒": s.get("weighing_issue_explain") or "正常",
            }
            for i, s in enumerate(record_detail.get("substrate_conversions", []))
        },
    })

    # 谱图判读
    chain.append({
        "level": 4 if anchor else 3,
        "node": "谱图判读记录",
        "evidence": {
            sp.get("peak_name") or f"峰{i+1}": {
                "RT(min)": sp.get("retention_time"),
                "峰面积": sp.get("peak_area"),
                "峰高": sp.get("peak_height"),
                "是否重叠": "是" if sp.get("is_overlap") else "否",
                "重叠对象": sp.get("overlap_with") or "—",
                "判读结论": sp.get("interpretation") or "—",
            }
            for i, sp in enumerate(record_detail.get("spectrum_data", []))
        },
    })

    # 导入来源
    chain.append({
        "level": 5 if anchor else 4,
        "node": "数据来源 / 导入痕迹",
        "evidence": {
            "记录号": record_no,
            "源文件": record_detail.get("source_file_name"),
            "源格式": record_detail.get("source_format"),
            "导入时间": str(record_detail.get("created_at", "")),
            "补录备注": record_detail.get("supplementary_note") or "—",
            "综合备注": record_detail.get("remark") or "—",
        },
    })

    # 状态变迁
    if record_detail.get("status_logs"):
        chain.append({
            "level": 6 if anchor else 5,
            "node": "状态推进日志",
            "evidence": {
                str(i + 1): (
                    f"{l.get('operated_at')} "
                    f"{l.get('from_status', '—')} → {l.get('to_status', '—')} "
                    f"操作人={l.get('operator')} 备注={l.get('operation_note') or '—'}"
                )
                for i, l in enumerate(record_detail.get("status_logs", []))
            },
        })

    return chain


def export_pdf(record_detail: Dict[str, Any], audit_chain: List[Dict[str, Any]] = None) -> str:
    """生成 PDF 报告文件，返回文件名。"""
    _register_cn_font()
    has_cn = _FONT_REGISTERED
    font_name = "ChineseFont" if has_cn else "Helvetica"

    settings.EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"酶促反应底物换算报告_{record_detail.get('record_no', stamp)}_{stamp}.pdf"
    filepath = settings.EXPORT_DIR / filename

    doc = SimpleDocTemplate(str(filepath), pagesize=A4,
                            leftMargin=2 * cm, rightMargin=2 * cm,
                            topMargin=1.8 * cm, bottomMargin=1.8 * cm,
                            title=f"酶促反应底物换算报告 - {record_detail.get('record_no', '')}")

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("TitleCN", parent=styles["Title"], fontName=font_name, fontSize=18, leading=24)
    h2 = ParagraphStyle("H2", parent=styles["Heading2"], fontName=font_name, fontSize=13, leading=18, spaceBefore=10)
    body = ParagraphStyle("BodyCN", parent=styles["BodyText"], fontName=font_name, fontSize=10.5, leading=16)
    small = ParagraphStyle("Small", parent=body, fontSize=9, leading=13, textColor=colors.grey)
    warning_style = ParagraphStyle("Warning", parent=body, textColor=colors.HexColor("#a00"))

    story = []

    # 封面/标题
    story.append(Paragraph("酶促反应底物换算复核报告", title_style))
    story.append(Spacer(1, 0.3 * cm))
    meta = [
        ["记录号", record_detail.get("record_no", ""), "批次号", record_detail.get("batch_no", "")],
        ["物料名称", record_detail.get("material_name", ""), "当前状态", record_detail.get("status", "")],
        ["源文件", record_detail.get("source_file_name", ""), "导入时间", str(record_detail.get("created_at", ""))[:19]],
        ["复核人", record_detail.get("reviewer", ""), "复核时间", str(record_detail.get("reviewed_at") or "")[:19]],
        ["导出人", record_detail.get("exporter", ""), "导出时间", datetime.now().strftime("%Y-%m-%d %H:%M:%S")],
    ]
    t = Table(meta, colWidths=[2.2 * cm, 5.6 * cm, 2.2 * cm, 5.6 * cm])
    t.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), font_name),
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#eef3fb")),
        ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#eef3fb")),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#aac")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.5 * cm))

    # 普通话解释
    story.append(Paragraph("一、可直接转发的普通话说明", h2))
    explain = generate_report_plain_explain(record_detail)
    for para in explain.split("\n\n"):
        story.append(Paragraph(para.replace("\n", "<br/>"), body))
        story.append(Spacer(1, 0.15 * cm))
    story.append(Paragraph("（本节可直接复制粘贴给同事，无需重新翻译）", small))
    story.append(Spacer(1, 0.4 * cm))

    # 异常总览
    story.append(Paragraph("二、异常与问题总览", h2))
    issues = []
    if record_detail.get("has_temp_unit_mix"):
        issues.append(f"• 温度单位混用：{record_detail.get('temp_unit_issue_detail', {}).get('summary', '')}")
    if record_detail.get("has_peak_overlap"):
        ov = record_detail.get("peak_overlap_detail", {})
        issues.append(f"• 谱峰重叠：共 {len(ov.get('overlaps', []))} 处，含中度/严重重叠")
    if record_detail.get("has_weighing_issue"):
        wi = record_detail.get("weighing_issue_detail", {})
        issues.append(f"• 称量精度不足：共 {wi.get('count', 0)} 项底物低于推荐称样量")
    missing = record_detail.get("missing_unit_fields") or []
    if missing:
        issues.append(f"• 漏填单位字段：{len(missing)} 项（见下文详细清单）")

    if not issues:
        story.append(Paragraph("本批次未检出异常。", body))
    else:
        for it in issues:
            story.append(Paragraph(it, warning_style))
    story.append(Spacer(1, 0.3 * cm))

    # 反应条件
    story.append(Paragraph("三、反应条件（温度单位已归一化复核）", h2))
    cond_header = ["#", "条件名称", "原值", "单位", "归一化值", "归一化单位", "问题/备注"]
    cond_data = [cond_header]
    for i, c in enumerate(record_detail.get("reaction_conditions", [])):
        tag = ""
        if c.get("is_unit_missing"):
            tag += "[漏填单位] "
        if c.get("is_unit_mismatch"):
            tag += "[单位不一致] "
        if c.get("is_abnormal"):
            tag += "[数值异常] "
        cond_data.append([
            str(i + 1),
            str(c.get("condition_name") or ""),
            str(c.get("condition_value") or ""),
            str(c.get("unit") or "") + ("⚠" if c.get("is_unit_missing") else ""),
            str(c.get("normalized_value") or ""),
            str(c.get("normalized_unit") or ""),
            tag + (c.get("issue_description") or "") + (c.get("review_note") or ""),
        ])
    cond_tbl = Table(cond_data, colWidths=[0.7 * cm, 4.2 * cm, 2.3 * cm, 1.8 * cm, 2 * cm, 1.8 * cm, 4.2 * cm])
    cond_tbl.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), font_name),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#dfe9ff")),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#99a")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(cond_tbl)
    story.append(Spacer(1, 0.3 * cm))

    # 底物换算
    story.append(Paragraph("四、底物浓度换算（含称量精度说明）", h2))
    sub_header = ["底物名称", "称样/单位", "体积/单位", "分子量", "纯度", "终浓度", "称量精度说明"]
    sub_data = [sub_header]
    for s in record_detail.get("substrate_conversions", []):
        sub_data.append([
            Paragraph(str(s.get("substrate_name") or ""), body),
            f"{s.get('initial_mass')}{s.get('initial_mass_unit')}",
            f"{s.get('volume')}{s.get('volume_unit')}",
            str(s.get("molecular_weight") or ""),
            f"{s.get('purity')}%" if s.get("purity") else "",
            f"{s.get('final_concentration')}{s.get('final_concentration_unit')}",
            Paragraph(s.get("weighing_issue_explain") or "称量精度满足要求",
                      warning_style if s.get("is_weighing_insufficient") else body),
        ])
    sub_tbl = Table(sub_data, colWidths=[3.2 * cm, 2.3 * cm, 2.3 * cm, 1.8 * cm, 1.4 * cm, 2.3 * cm, 4.7 * cm], repeatRows=1)
    sub_tbl.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), font_name),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e3f5e3")),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#99a")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(sub_tbl)
    story.append(Spacer(1, 0.2 * cm))
    # 单独列换算公式（小字）
    for s in record_detail.get("substrate_conversions", []):
        if s.get("conversion_formula"):
            story.append(Paragraph(
                f"▸ {s.get('substrate_name')}换算过程：{s.get('conversion_formula')}", small))
    story.append(Spacer(1, 0.3 * cm))

    # 谱图判读
    story.append(Paragraph("五、谱图数据与判读（与换算记录绑定）", h2))
    spec_header = ["峰名", "RT(min)", "峰面积", "峰高", "是否重叠", "重叠对象", "判读结论"]
    spec_data = [spec_header]
    for sp in record_detail.get("spectrum_data", []):
        is_ov = "是（" + (sp.get("overlap_severity") or "") + "）" if sp.get("is_overlap") else "否"
        spec_data.append([
            str(sp.get("peak_name") or ""),
            str(sp.get("retention_time") or ""),
            str(sp.get("peak_area") or ""),
            str(sp.get("peak_height") or ""),
            is_ov,
            sp.get("overlap_with") or "—",
            Paragraph(sp.get("interpretation") or "", body),
        ])
    spec_tbl = Table(spec_data, colWidths=[3 * cm, 1.6 * cm, 2 * cm, 1.8 * cm, 2.2 * cm, 2.5 * cm, 4.9 * cm], repeatRows=1)
    spec_tbl.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), font_name),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#fff4dc")),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#99a")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(spec_tbl)

    # 安全备注/处理意见
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph("六、安全备注 & 处理意见 & 补录说明", h2))
    if record_detail.get("safety_note"):
        story.append(Paragraph(f"<b>安全备注：</b>{record_detail.get('safety_note')}", warning_style))
    if record_detail.get("supplementary_note"):
        story.append(Paragraph(f"<b>补录说明：</b>{record_detail.get('supplementary_note')}", body))
    if record_detail.get("remark"):
        story.append(Paragraph(f"<b>综合备注：</b>{record_detail.get('remark')}", body))
    if record_detail.get("processing_opinion"):
        story.append(Paragraph(f"<b>处理意见（放行）：</b>{record_detail.get('processing_opinion')}", body))

    # 追溯链
    story.append(PageBreak())
    story.append(Paragraph("七、异常追溯链（从异常点反查到原始记录）", h2))
    story.append(Paragraph(
        "说明：验收时可从任一异常点顺藤摸瓜，依次查看处理意见→反应条件→浓度换算→谱图判读→导入痕迹。",
        small))

    audit = audit_chain or generate_audit_chain(record_detail)
    for idx, node in enumerate(audit):
        indent = node.get("level", idx) * 0.4
        story.append(Spacer(1, 0.15 * cm))
        bullet = "►" if idx == 0 else ("└─" if indent else "•")
        story.append(Paragraph(
            f"<b>{bullet} 节点{idx + 1}：{node.get('node', '')}</b>（可向上追溯 {node.get('level', idx)} 层）",
            body))
        ev = node.get("evidence") or {}
        if isinstance(ev, dict):
            ev_lines = [f"  ‣ <i>{k}</i>：{v}" for k, v in ev.items()]
            for el in ev_lines:
                story.append(Paragraph(el, small))
        else:
            story.append(Paragraph(f"  {ev}", small))
        if node.get("suggestion"):
            story.append(Paragraph(f"  <font color='brown'>建议：{node['suggestion']}</font>", small))

    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph(
        f"<b>报告结束</b> —— 本报告由系统生成，"
        f"数据来源于处理记录号 {record_detail.get('record_no', '')}，"
        f"所有浓度换算与谱图判读共用同一批处理记录。",
        small))

    doc.build(story)
    return filename
