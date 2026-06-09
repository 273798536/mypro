import os
import pandas as pd
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import (
    Batch, ExperimentRecord, TemperatureCurve, DataIssue,
    StatusTransition, CalculationRecord, ImportFile,
    BatchStatus, IssueSeverity, IssueType, TemperatureUnit
)
from app.services.status_service import STATUS_LABEL_CN
from app.utils.temperature_utils import to_celsius

EXPORT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "exports")
os.makedirs(EXPORT_DIR, exist_ok=True)

SEVERITY_LABEL_CN = {
    IssueSeverity.INFO: "提示",
    IssueSeverity.WARNING: "警告",
    IssueSeverity.ERROR: "严重"
}

ISSUE_TYPE_LABEL_CN = {
    IssueType.TEMPERATURE_UNIT_MIXED: "温度单位混用",
    IssueType.WEIGHING_PRECISION_LOW: "称量精度不足",
    IssueType.MISSING_FIELD: "字段缺失",
    IssueType.ABNORMAL_CURVE: "温度曲线异常",
    IssueType.UNIT_AMBIGUOUS: "单位不明确"
}

TEMP_UNIT_LABEL_CN = {
    TemperatureUnit.CELSIUS: "摄氏度(°C)",
    TemperatureUnit.FAHRENHEIT: "华氏度(°F)",
    TemperatureUnit.KELVIN: "开尔文(K)",
    TemperatureUnit.UNKNOWN: "未标注"
}


def export_batch_report(db: Session, batch_id: int) -> str:
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise ValueError(f"批次ID {batch_id} 不存在")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"催化剂活性衰减报告_{batch.batch_no}_{timestamp}.xlsx"
    filepath = os.path.join(EXPORT_DIR, filename)

    with pd.ExcelWriter(filepath, engine='xlsxwriter') as writer:
        _write_summary_sheet(writer, batch, db)
        _write_experiment_sheet(writer, batch, db)
        _write_curve_sheet(writer, batch, db)
        _write_issues_sheet(writer, batch, db)
        _write_calculation_sheet(writer, batch, db)
        _write_status_history_sheet(writer, batch, db)
        _write_import_sources_sheet(writer, batch, db)

    return filepath


def _write_summary_sheet(writer, batch: Batch, db: Session):
    wb = writer.book
    ws = wb.add_worksheet("0-报告概览")

    title_format = wb.add_format({
        'bold': True, 'font_size': 18, 'align': 'center',
        'bg_color': '#1F4E79', 'font_color': 'white', 'border': 1
    })
    header_format = wb.add_format({
        'bold': True, 'bg_color': '#D6E4F0', 'border': 1, 'align': 'left'
    })
    normal_format = wb.add_format({'border': 1, 'text_wrap': True, 'align': 'left', 'valign': 'top'})
    warn_format = wb.add_format({'bg_color': '#FFF2CC', 'border': 1, 'text_wrap': True, 'align': 'left', 'valign': 'top'})
    error_format = wb.add_format({'bg_color': '#FCE4D6', 'border': 1, 'text_wrap': True, 'align': 'left', 'valign': 'top'})

    ws.merge_range('A1:D1', '催化剂活性衰减分析报告', title_format)
    ws.set_row(0, 35)

    exps = db.query(ExperimentRecord).filter(ExperimentRecord.batch_id == batch.id).count()
    curves = db.query(TemperatureCurve).filter(TemperatureCurve.batch_id == batch.id).count()
    issues = db.query(DataIssue).filter(DataIssue.batch_id == batch.id).all()
    unresolved_errors = [i for i in issues if i.severity == IssueSeverity.ERROR and not i.is_resolved]
    unresolved_warnings = [i for i in issues if i.severity == IssueSeverity.WARNING and not i.is_resolved]

    summary_data = [
        ["报告项目", "内容"],
        ["批次编号", batch.batch_no],
        ["催化剂名称", batch.catalyst_name or "未填写"],
        ["当前状态", STATUS_LABEL_CN.get(batch.status, str(batch.status))],
        ["实验操作员", batch.operator or "未填写"],
        ["复核人", batch.reviewer or "未审核"],
        ["导入备注", batch.import_remark or "无"],
        ["实验记录数", str(exps) + " 条"],
        ["温度曲线数据点", str(curves) + " 个"],
        ["数据问题总数", str(len(issues)) + " 个"],
        ["  其中未解决的严重问题", str(len(unresolved_errors)) + " 个"],
        ["  其中未解决的警告", str(len(unresolved_warnings)) + " 个"],
        ["报告生成时间", datetime.now().strftime("%Y-%m-%d %H:%M:%S")]
    ]

    for row_idx, row_data in enumerate(summary_data):
        r = row_idx + 2
        for col_idx, val in enumerate(row_data):
            fmt = header_format if row_idx == 0 else normal_format
            if row_idx >= 9 and "严重问题" in str(row_data[0]) and unresolved_errors:
                fmt = error_format
            elif row_idx >= 9 and "警告" in str(row_data[0]) and unresolved_warnings:
                fmt = warn_format
            ws.write(r, col_idx, val, fmt)

    ws.set_column('A:A', 22)
    ws.set_column('B:B', 50)
    ws.set_column('C:C', 5)
    ws.set_column('D:D', 30)

    note_row = len(summary_data) + 4
    ws.write(note_row, 0, "阅读说明:", header_format)
    notes = [
        "1. 本报告面向质检主管和材料工程师，所有数据问题均使用自然语言描述，无需理解代码字段含义",
        "2. 温度单位混用问题会在【数据问题清单】中明确标注具体出现在哪份文件的哪个工作表的哪一行",
        "3. 称量精度不足的原因会用通俗语言解释，不会只显示缩写或字段名",
        "4. 配平计算前后的差异详见【配平计算记录】工作表",
        "5. 若存在红色标注的未解决严重问题，该批次数据不建议直接使用"
    ]
    for i, note in enumerate(notes):
        ws.write(note_row + 1 + i, 0, note, normal_format)


def _write_experiment_sheet(writer, batch: Batch, db: Session):
    wb = writer.book
    ws = wb.add_worksheet("1-实验记录")

    header_format = wb.add_format({
        'bold': True, 'bg_color': '#D6E4F0', 'border': 1, 'align': 'center', 'valign': 'vcenter'
    })
    normal_format = wb.add_format({'border': 1, 'text_wrap': True, 'align': 'center', 'valign': 'top'})
    warn_format = wb.add_format({'bg_color': '#FFF2CC', 'border': 1, 'text_wrap': True, 'align': 'center', 'valign': 'top'})

    headers = [
        "记录编号", "实验日期", "样品质量(g)", "称量精度说明",
        "反应条件", "反应温度(原始)", "温度单位", "换算后°C",
        "空速", "初始活性(%)", "最终活性(%)", "衰减率(%)",
        "原始备注", "补录备注", "数据来源"
    ]

    for col, h in enumerate(headers):
        ws.write(0, col, h, header_format)

    experiments = db.query(ExperimentRecord).filter(
        ExperimentRecord.batch_id == batch.id
    ).order_by(ExperimentRecord.id.asc()).all()

    for row_idx, exp in enumerate(experiments):
        r = row_idx + 1
        celsius_val = to_celsius(exp.reaction_temperature, exp.temperature_unit)
        celsius_str = f"{celsius_val:.2f}" if celsius_val is not None else "无法换算"

        precision_note = ""
        if exp.sample_weight is not None:
            weight_str = f"{exp.sample_weight:.10f}".rstrip('0').rstrip('.')
            places = len(weight_str.split('.')[1]) if '.' in weight_str else 0
            if places < 3:
                precision_note = f"⚠精度不足:仅{places}位小数,建议≥3位"

        row_data = [
            exp.record_no or f"#{r}",
            exp.experiment_date or "未填",
            f"{exp.sample_weight:.4f}" if exp.sample_weight else "未填",
            exp.weighing_precision or precision_note or "未标注",
            exp.reaction_condition or "未说明",
            exp.temperature_raw or str(exp.reaction_temperature or "未填"),
            TEMP_UNIT_LABEL_CN.get(exp.temperature_unit, str(exp.temperature_unit)),
            celsius_str,
            exp.space_velocity or "未填",
            f"{exp.initial_activity:.2f}" if exp.initial_activity else "未填",
            f"{exp.final_activity:.2f}" if exp.final_activity else "未填",
            f"{exp.decay_rate:.2f}" if exp.decay_rate else "未计算",
            exp.raw_remark or "无",
            exp.supplementary_note or "无",
            f"{exp.source_sheet or '未知表'} 第{exp.source_row or '?'}行"
        ]

        has_warning = precision_note != "" or exp.temperature_unit == TemperatureUnit.UNKNOWN
        for col, val in enumerate(row_data):
            fmt = warn_format if has_warning else normal_format
            ws.write(r, col, val, fmt)

    widths = [12, 14, 14, 24, 28, 16, 14, 12, 14, 14, 14, 12, 22, 22, 22]
    for i, w in enumerate(widths):
        ws.set_column(i, i, w)


def _write_curve_sheet(writer, batch: Batch, db: Session):
    wb = writer.book
    ws = wb.add_worksheet("2-温度曲线")

    header_format = wb.add_format({
        'bold': True, 'bg_color': '#D6E4F0', 'border': 1, 'align': 'center'
    })
    normal_format = wb.add_format({'border': 1, 'align': 'center'})
    abnormal_format = wb.add_format({'bg_color': '#FCE4D6', 'border': 1, 'align': 'center', 'text_wrap': True})

    headers = [
        "时间(h)", "时间单位", "温度(原始数据)", "温度单位",
        "换算后°C", "活性值(%)", "是否异常", "异常原因", "数据来源"
    ]
    for col, h in enumerate(headers):
        ws.write(0, col, h, header_format)

    curves = db.query(TemperatureCurve).filter(
        TemperatureCurve.batch_id == batch.id
    ).order_by(TemperatureCurve.time_point.asc()).all()

    for row_idx, c in enumerate(curves):
        r = row_idx + 1
        celsius_val = to_celsius(c.temperature_value, c.temperature_unit)
        celsius_str = f"{celsius_val:.2f}" if celsius_val is not None else "无法换算"

        row_data = [
            c.time_point,
            c.time_unit or "h",
            c.temperature_raw or str(c.temperature_value or ""),
            TEMP_UNIT_LABEL_CN.get(c.temperature_unit, str(c.temperature_unit)),
            celsius_str,
            f"{c.activity_value:.2f}" if c.activity_value else "",
            "是 ⚠" if c.is_abnormal else "否",
            c.abnormal_reason or "",
            f"{c.source_sheet or '曲线表'} 第{c.source_row or '?'}行"
        ]

        fmt = abnormal_format if c.is_abnormal else normal_format
        for col, val in enumerate(row_data):
            ws.write(r, col, val, fmt)

    widths = [10, 10, 18, 14, 12, 14, 10, 40, 22]
    for i, w in enumerate(widths):
        ws.set_column(i, i, w)


def _write_issues_sheet(writer, batch: Batch, db: Session):
    wb = writer.book
    ws = wb.add_worksheet("3-数据问题清单")

    title_format = wb.add_format({
        'bold': True, 'font_size': 14, 'bg_color': '#1F4E79', 'font_color': 'white', 'border': 1
    })
    header_format = wb.add_format({
        'bold': True, 'bg_color': '#D6E4F0', 'border': 1, 'align': 'left', 'valign': 'vcenter'
    })
    normal_format = wb.add_format({'border': 1, 'text_wrap': True, 'align': 'left', 'valign': 'top'})
    info_format = wb.add_format({'bg_color': '#E2EFDA', 'border': 1, 'text_wrap': True, 'align': 'left', 'valign': 'top'})
    warn_format = wb.add_format({'bg_color': '#FFF2CC', 'border': 1, 'text_wrap': True, 'align': 'left', 'valign': 'top'})
    error_format = wb.add_format({'bg_color': '#FCE4D6', 'border': 1, 'text_wrap': True, 'align': 'left', 'valign': 'top'})
    resolved_format = wb.add_format({'bg_color': '#D9D9D9', 'border': 1, 'text_wrap': True, 'align': 'left', 'valign': 'top', 'font_strikeout': True})

    ws.merge_range('A1:G1', '数据问题清单（质检主管请重点关注红色标记的未解决问题）', title_format)
    ws.set_row(0, 28)

    headers = [
        "严重程度", "问题类型", "问题位置",
        "通俗描述（给非技术人员看）", "来源文件", "来源工作表", "是否已解决", "解决说明"
    ]
    for col, h in enumerate(headers):
        ws.write(1, col, h, header_format)

    issues = db.query(DataIssue).filter(
        DataIssue.batch_id == batch.id
    ).order_by(
        DataIssue.is_resolved.asc(),
        DataIssue.severity.desc(),
        DataIssue.created_at.asc()
    ).all()

    if not issues:
        ws.write(2, 0, "✅ 本批次数据未发现任何问题", normal_format)
    else:
        for row_idx, issue in enumerate(issues):
            r = row_idx + 2

            if issue.is_resolved:
                fmt = resolved_format
            elif issue.severity == IssueSeverity.ERROR:
                fmt = error_format
            elif issue.severity == IssueSeverity.WARNING:
                fmt = warn_format
            else:
                fmt = info_format

            row_data = [
                SEVERITY_LABEL_CN.get(issue.severity, str(issue.severity)),
                ISSUE_TYPE_LABEL_CN.get(issue.issue_type, str(issue.issue_type)),
                issue.location or "",
                issue.human_readable_desc or issue.description or "",
                issue.source_file or "未记录",
                issue.source_sheet or "未记录",
                "✅ 已解决" if issue.is_resolved else "❌ 未解决",
                issue.resolved_remark or ("" if issue.is_resolved else "等待处理")
            ]
            for col, val in enumerate(row_data):
                ws.write(r, col, val, fmt)

    widths = [10, 16, 28, 55, 20, 18, 12, 30]
    for i, w in enumerate(widths):
        ws.set_column(i, i, w)


def _write_calculation_sheet(writer, batch: Batch, db: Session):
    wb = writer.book
    ws = wb.add_worksheet("4-配平计算记录")

    header_format = wb.add_format({
        'bold': True, 'bg_color': '#D6E4F0', 'border': 1, 'align': 'left', 'valign': 'vcenter'
    })
    normal_format = wb.add_format({'border': 1, 'text_wrap': True, 'align': 'left', 'valign': 'top'})

    headers = [
        "计算类型", "计算前数据", "计算后结果", "前后差异", "计算原因说明", "操作人", "计算时间"
    ]
    for col, h in enumerate(headers):
        ws.write(0, col, h, header_format)

    records = db.query(CalculationRecord).filter(
        CalculationRecord.batch_id == batch.id
    ).order_by(CalculationRecord.calculated_at.desc()).all()

    if not records:
        ws.write(1, 0, "尚未执行配平计算，请先运行计算流程", normal_format)
    else:
        for row_idx, calc in enumerate(records):
            r = row_idx + 1
            row_data = [
                calc.calculation_type,
                calc.before_value or "",
                calc.after_value or "",
                calc.difference or "",
                calc.reason or "",
                calc.operator or "系统",
                calc.calculated_at.strftime("%Y-%m-%d %H:%M:%S") if calc.calculated_at else ""
            ]
            for col, val in enumerate(row_data):
                ws.write(r, col, val, normal_format)

    widths = [20, 45, 45, 40, 40, 12, 20]
    for i, w in enumerate(widths):
        ws.set_column(i, i, w)


def _write_status_history_sheet(writer, batch: Batch, db: Session):
    wb = writer.book
    ws = wb.add_worksheet("5-审核流转记录")

    header_format = wb.add_format({
        'bold': True, 'bg_color': '#D6E4F0', 'border': 1, 'align': 'center'
    })
    normal_format = wb.add_format({'border': 1, 'text_wrap': True, 'align': 'left'})

    headers = ["序号", "从状态", "转到状态", "操作人", "流转备注", "操作时间"]
    for col, h in enumerate(headers):
        ws.write(0, col, h, header_format)

    transitions = db.query(StatusTransition).filter(
        StatusTransition.batch_id == batch.id
    ).order_by(StatusTransition.transition_at.asc()).all()

    for row_idx, t in enumerate(transitions):
        r = row_idx + 1
        row_data = [
            row_idx + 1,
            STATUS_LABEL_CN.get(t.from_status, str(t.from_status)) if t.from_status else "(新建)",
            STATUS_LABEL_CN.get(t.to_status, str(t.to_status)),
            t.operator or "系统",
            t.remark or "无",
            t.transition_at.strftime("%Y-%m-%d %H:%M:%S") if t.transition_at else ""
        ]
        for col, val in enumerate(row_data):
            ws.write(r, col, val, normal_format)

    widths = [8, 14, 14, 12, 35, 20]
    for i, w in enumerate(widths):
        ws.set_column(i, i, w)


def _write_import_sources_sheet(writer, batch: Batch, db: Session):
    wb = writer.book
    ws = wb.add_worksheet("6-原始文件来源")

    header_format = wb.add_format({
        'bold': True, 'bg_color': '#D6E4F0', 'border': 1, 'align': 'left'
    })
    normal_format = wb.add_format({'border': 1, 'text_wrap': True, 'align': 'left'})

    headers = ["序号", "文件名", "文件类型", "包含的工作表", "上传备注", "上传时间"]
    for col, h in enumerate(headers):
        ws.write(0, col, h, header_format)

    files = db.query(ImportFile).filter(
        ImportFile.batch_id == batch.id
    ).order_by(ImportFile.uploaded_at.asc()).all()

    if not files:
        ws.write(1, 0, "无导入文件记录", normal_format)
    else:
        for row_idx, f in enumerate(files):
            r = row_idx + 1
            row_data = [
                row_idx + 1,
                f.file_name,
                f.file_type or "未知",
                f.sheet_names or "未知",
                f.import_remark or "无",
                f.uploaded_at.strftime("%Y-%m-%d %H:%M:%S") if f.uploaded_at else ""
            ]
            for col, val in enumerate(row_data):
                ws.write(r, col, val, normal_format)

    widths = [8, 35, 10, 30, 25, 20]
    for i, w in enumerate(widths):
        ws.set_column(i, i, w)
