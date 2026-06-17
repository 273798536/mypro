import pandas as pd
from typing import List, Dict, Any, Tuple
from io import BytesIO
from sqlalchemy.orm import Session
from datetime import datetime

from app.models import Feedback
from app.schemas import FeedbackCreate
from app.services.feedback_service import generate_feedback_no, create_feedback, _log_operation, STATUS_LABEL_MAP
from app.database import SessionLocal


EXCEL_COLUMN_MAPPING = {
    "来源": "original_source",
    "原始地点": "original_location",
    "地点描述": "original_location",
    "反馈内容": "original_content",
    "内容": "original_content",
    "投诉内容": "original_content",
    "反映人": "original_reporter",
    "姓名": "original_reporter",
    "联系方式": "original_contact",
    "电话": "original_contact",
    "反馈日期": "original_date",
    "日期": "original_date",
    "时间": "original_date",
    "桥名": "bridge_name",
    "桥梁名称": "bridge_name",
    "影响范围": "impact_scope",
    "复核备注": "review_remark",
    "容量结论": "capacity_conclusion",
    "处理人": "handler",
    "状态": "status"
}

STATUS_CN_TO_EN = {
    "待处理": "pending",
    "复核中": "reviewing",
    "待补材料": "need_evidence",
    "可放行": "approved",
    "已归并": "merged",
    "已结案": "closed"
}


def read_excel_to_records(file_bytes: bytes) -> Tuple[List[Dict[str, Any]], List[str]]:
    """读取 Excel，返回(标准化记录列表, 原始列名列表)"""
    df = pd.read_excel(BytesIO(file_bytes))
    original_columns = list(df.columns)
    records = []

    for _, row in df.iterrows():
        raw_row = {str(k): (v if pd.notna(v) else None) for k, v in row.to_dict().items()}
        record: Dict[str, Any] = {"original_raw_row": raw_row}

        for cn_col, field in EXCEL_COLUMN_MAPPING.items():
            if cn_col in raw_row and raw_row[cn_col] is not None:
                val = str(raw_row[cn_col]).strip()
                if field == "status" and val in STATUS_CN_TO_EN:
                    val = STATUS_CN_TO_EN[val]
                record[field] = val

        if "original_location" not in record or not record["original_location"]:
            for col in original_columns:
                if "地点" in col or "地址" in col or "位置" in col:
                    if raw_row.get(col):
                        record["original_location"] = str(raw_row[col]).strip()
                        break

        if "original_content" not in record or not record["original_content"]:
            for col in original_columns:
                if "内容" in col or "问题" in col or "描述" in col:
                    if raw_row.get(col):
                        record["original_content"] = str(raw_row[col]).strip()
                        break

        records.append(record)

    return records, original_columns


def import_excel_to_db(file_bytes: bytes, operator: str = "system") -> Dict[str, Any]:
    db = SessionLocal()
    try:
        records, columns = read_excel_to_records(file_bytes)
        created = []
        failed = []
        for idx, rec in enumerate(records):
            try:
                feedback_no = generate_feedback_no(db)
                data = FeedbackCreate(feedback_no=feedback_no, **rec)
                obj = create_feedback(db, data)
                created.append({"row": idx + 2, "feedback_no": feedback_no, "id": obj.id})
            except Exception as e:
                failed.append({"row": idx + 2, "error": str(e), "data": rec})
        return {
            "total_rows": len(records),
            "created_count": len(created),
            "failed_count": len(failed),
            "columns": columns,
            "created": created,
            "failed": failed
        }
    finally:
        db.close()


def export_feedbacks_to_excel(feedbacks: List[Feedback]) -> bytes:
    rows = []
    for fb in feedbacks:
        rows.append({
            "编号": fb.feedback_no,
            "状态": STATUS_LABEL_MAP.get(fb.status, fb.status),
            "原始来源": fb.original_source or "",
            "原始地点": fb.original_location or "",
            "规范地点": fb.normalized_location or "",
            "桥名": fb.bridge_name or "",
            "经度": fb.lng or "",
            "纬度": fb.lat or "",
            "影响范围": fb.impact_scope or "",
            "反馈内容": fb.original_content or "",
            "反映人": fb.original_reporter or "",
            "联系方式": fb.original_contact or "",
            "反馈日期": fb.original_date or "",
            "复核备注": fb.review_remark or "",
            "容量结论": fb.capacity_conclusion or "",
            "处理人": fb.handler or "",
            "领导问询": fb.leader_inquiry or "",
            "创建时间": fb.created_at.strftime("%Y-%m-%d %H:%M") if fb.created_at else "",
            "更新时间": fb.updated_at.strftime("%Y-%m-%d %H:%M") if fb.updated_at else "",
            "原始数据痕迹": str(fb.original_raw_row) if fb.original_raw_row else ""
        })
    df = pd.DataFrame(rows)
    output = BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="慢行桥坡道容量复核")
        ws = writer.sheets["慢行桥坡道容量复核"]
        for col in ws.columns:
            max_len = max(len(str(c.value)) if c.value else 0 for c in col)
            ws.column_dimensions[col[0].column_letter].width = min(max_len + 4, 60)
    return output.getvalue()


def export_feedbacks_to_pdf(feedbacks: List[Feedback]) -> bytes:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
    from reportlab.lib.units import cm
    from reportlab.lib import colors
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    import os
    import platform

    font_name = "Helvetica"
    system = platform.system()
    font_candidates = []
    if system == "Darwin":
        font_candidates = [
            "/System/Library/Fonts/PingFang.ttc",
            "/System/Library/Fonts/STHeiti Medium.ttc",
            "/Library/Fonts/Arial Unicode.ttf"
        ]
    elif system == "Windows":
        font_candidates = ["C:/Windows/Fonts/msyh.ttc", "C:/Windows/Fonts/simhei.ttf"]
    else:
        font_candidates = [
            "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
            "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
        ]

    for fc in font_candidates:
        if os.path.exists(fc):
            try:
                pdfmetrics.registerFont(TTFont("CNFont", fc))
                font_name = "CNFont"
                break
            except Exception:
                continue

    output = BytesIO()
    doc = SimpleDocTemplate(output, pagesize=A4,
                            leftMargin=2 * cm, rightMargin=2 * cm,
                            topMargin=2 * cm, bottomMargin=2 * cm)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "title", parent=styles["Title"], fontName=font_name, fontSize=18, leading=24,
        textColor=colors.HexColor("#1a3c6e"), spaceAfter=12
    )
    h2_style = ParagraphStyle(
        "h2", parent=styles["Heading2"], fontName=font_name, fontSize=13, leading=18,
        textColor=colors.HexColor("#2c5282"), spaceBefore=10, spaceAfter=6
    )
    body_style = ParagraphStyle(
        "body", parent=styles["BodyText"], fontName=font_name, fontSize=10, leading=16
    )
    label_style = ParagraphStyle(
        "label", parent=body_style, textColor=colors.HexColor("#4a5568"), fontSize=9
    )
    evidence_style = ParagraphStyle(
        "evidence", parent=body_style, fontSize=9, textColor=colors.HexColor("#8b4513"),
        leftIndent=10
    )

    story = []
    story.append(Paragraph("慢行桥坡道容量复核 汇总报告", title_style))
    story.append(Paragraph(f"导出时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | 共 {len(feedbacks)} 条记录", label_style))
    story.append(Spacer(1, 0.5 * cm))

    stats = {}
    for fb in feedbacks:
        stats[fb.status] = stats.get(fb.status, 0) + 1
    status_text = "  |  ".join([f"{STATUS_LABEL_MAP.get(k, k)}：{v}条" for k, v in stats.items()])
    story.append(Paragraph(f"<b>状态统计：</b>{status_text}", body_style))
    story.append(Spacer(1, 0.6 * cm))

    for idx, fb in enumerate(feedbacks, 1):
        status_label = STATUS_LABEL_MAP.get(fb.status, fb.status)
        status_color = {
            "pending": "#e67e22", "reviewing": "#3498db", "need_evidence": "#e74c3c",
            "approved": "#27ae60", "merged": "#7f8c8d", "closed": "#8e44ad"
        }.get(fb.status, "#333333")

        story.append(Paragraph(f"{idx}. {fb.feedback_no}  <font color='{status_color}'>[{status_label}]</font>", h2_style))

        data = [
            ["原始来源", fb.original_source or "—", "桥名", fb.bridge_name or "—"],
            ["原始地点", fb.original_location or "—", "规范地点", fb.normalized_location or "—"],
            ["反映人", fb.original_reporter or "—", "联系方式", fb.original_contact or "—"],
            ["反馈日期", fb.original_date or "—", "影响范围", fb.impact_scope or "—"],
        ]
        t = Table(data, colWidths=[2.2 * cm, 5.8 * cm, 2.2 * cm, 5.8 * cm])
        t.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (-1, -1), font_name),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#edf2f7")),
            ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#edf2f7")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e0")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(t)
        story.append(Spacer(1, 0.3 * cm))

        story.append(Paragraph("<b>反馈内容：</b>", label_style))
        story.append(Paragraph(fb.original_content or "（无）", body_style))
        story.append(Spacer(1, 0.2 * cm))

        if fb.review_remark:
            story.append(Paragraph("<b>复核备注：</b>", label_style))
            story.append(Paragraph(fb.review_remark, body_style))
            story.append(Spacer(1, 0.2 * cm))

        if fb.capacity_conclusion:
            story.append(Paragraph("<b>容量结论：</b>", label_style))
            story.append(Paragraph(fb.capacity_conclusion, evidence_style))
            story.append(Spacer(1, 0.2 * cm))

        if fb.leader_inquiry:
            story.append(Paragraph(f"<b>领导问询：</b>{fb.leader_inquiry}", evidence_style))
            story.append(Spacer(1, 0.2 * cm))

        if fb.original_raw_row:
            raw_preview = str(fb.original_raw_row)
            if len(raw_preview) > 200:
                raw_preview = raw_preview[:200] + "..."
            story.append(Paragraph(f"<b>原始数据留痕：</b>{raw_preview}", label_style))

        story.append(Spacer(1, 0.4 * cm))
        story.append(Paragraph("—" * 90, label_style))
        story.append(Spacer(1, 0.3 * cm))

        if idx % 4 == 0 and idx != len(feedbacks):
            story.append(PageBreak())

    doc.build(story)
    return output.getvalue()
