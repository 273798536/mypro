import io
from typing import Optional, List
from sqlalchemy.orm import Session

import xlsxwriter

from app.models.models import ScoreRecord, ImportBatch, DataIssue, ReviewLog


def export_records_to_excel(
    db: Session,
    batch_id: Optional[int] = None,
    status: Optional[str] = None,
    only_issues: bool = False,
) -> bytes:
    query = db.query(ScoreRecord)
    if batch_id:
        query = query.filter(ScoreRecord.batch_id == batch_id)
    if status:
        query = query.filter(ScoreRecord.status == status)

    records = query.all()

    output = io.BytesIO()
    workbook = xlsxwriter.Workbook(output, {"in_memory": True})

    header_fmt = workbook.add_format({"bold": True, "bg_color": "#D7E4BC", "border": 1})
    wrap_fmt = workbook.add_format({"text_wrap": True, "valign": "top"})

    ws = workbook.add_worksheet("多项式外推警报记录")
    headers = [
        "批次号", "行号", "学号", "姓名", "班级", "科目", "单元",
        "原始分", "修正分", "外推分", "警报等级", "警报标记",
        "状态", "审核人", "审核时间", "审核备注",
        "备注(原始)", "备注(清洗)", "是否缺失单元", "是否重复",
        "导入时间", "最后更新时间",
    ]
    for col, h in enumerate(headers):
        ws.write(0, col, h, header_fmt)

    for row, r in enumerate(records, start=1):
        batch = db.query(ImportBatch).filter(ImportBatch.id == r.batch_id).first()
        ws.write(row, 0, batch.batch_no if batch else "")
        ws.write(row, 1, r.row_no or "")
        ws.write(row, 2, r.student_id or "")
        ws.write(row, 3, r.student_name or "")
        ws.write(row, 4, r.class_name or "")
        ws.write(row, 5, r.subject or "")
        ws.write(row, 6, r.unit_name or "")
        ws.write(row, 7, r.score_original_value if r.score_original_value is not None else "")
        ws.write(row, 8, r.score_corrected_value if r.score_corrected_value is not None else "")
        ws.write(row, 9, r.score_extrapolated if r.score_extrapolated is not None else "")
        ws.write(row, 10, r.alarm_level or "")
        ws.write(row, 11, "是" if r.alarm_flag else "否")
        ws.write(row, 12, _status_label(r.status))
        ws.write(row, 13, r.reviewed_by or "")
        ws.write(row, 14, str(r.reviewed_at) if r.reviewed_at else "")
        ws.write(row, 15, r.review_note or "")
        ws.write(row, 16, r.remark_raw or "", wrap_fmt)
        ws.write(row, 17, r.remark_clean or "", wrap_fmt)
        ws.write(row, 18, "是" if r.unit_missing else "否")
        ws.write(row, 19, "是" if r.is_duplicate else "")
        ws.write(row, 20, str(r.created_at))
        ws.write(row, 21, str(r.updated_at))

    ws.set_column(0, 0, 22)
    ws.set_column(1, 1, 6)
    ws.set_column(2, 6, 14)
    ws.set_column(7, 9, 10)
    ws.set_column(16, 17, 30)

    ws_issue = workbook.add_worksheet("数据问题")
    issue_headers = ["批次号", "记录ID", "行号", "问题类型", "问题详情", "涉及字段", "是否解决", "解决备注", "创建时间"]
    for col, h in enumerate(issue_headers):
        ws_issue.write(0, col, h, header_fmt)
    issues_q = db.query(DataIssue)
    if batch_id:
        issues_q = issues_q.filter(DataIssue.batch_id == batch_id)
    issues = issues_q.all()
    for row, iss in enumerate(issues, start=1):
        batch = db.query(ImportBatch).filter(ImportBatch.id == iss.batch_id).first()
        ws_issue.write(row, 0, batch.batch_no if batch else "")
        ws_issue.write(row, 1, iss.record_id or "")
        ws_issue.write(row, 2, iss.row_no or "")
        ws_issue.write(row, 3, _issue_label(iss.issue_type))
        ws_issue.write(row, 4, iss.issue_detail or "", wrap_fmt)
        ws_issue.write(row, 5, iss.column_name or "")
        ws_issue.write(row, 6, "是" if iss.resolved else "否")
        ws_issue.write(row, 7, iss.resolved_note or "", wrap_fmt)
        ws_issue.write(row, 8, str(iss.created_at))
    ws_issue.set_column(4, 4, 40)

    ws_log = workbook.add_worksheet("审核修改留痕")
    log_headers = ["记录ID", "操作类型", "原状态", "新状态", "修改字段", "原值", "新值", "操作人", "备注", "时间"]
    for col, h in enumerate(log_headers):
        ws_log.write(0, col, h, header_fmt)
    logs_q = db.query(ReviewLog).join(ScoreRecord).filter(ReviewLog.record_id == ScoreRecord.id)
    if batch_id:
        logs_q = logs_q.filter(ScoreRecord.batch_id == batch_id)
    logs = logs_q.order_by(ReviewLog.created_at.desc()).all()
    for row, lg in enumerate(logs, start=1):
        ws_log.write(row, 0, lg.record_id)
        ws_log.write(row, 1, lg.action or "")
        ws_log.write(row, 2, lg.from_status or "")
        ws_log.write(row, 3, lg.to_status or "")
        ws_log.write(row, 4, lg.field_name or "")
        ws_log.write(row, 5, lg.old_value or "", wrap_fmt)
        ws_log.write(row, 6, lg.new_value or "", wrap_fmt)
        ws_log.write(row, 7, lg.operator or "")
        ws_log.write(row, 8, lg.note or "", wrap_fmt)
        ws_log.write(row, 9, str(lg.created_at))
    ws_log.set_column(5, 6, 15)
    ws_log.set_column(8, 8, 30)

    workbook.close()
    output.seek(0)
    return output.read()


def _status_label(s: Optional[str]) -> str:
    mapping = {
        "pending": "待确认",
        "corrected": "已修正待复核",
        "duplicate": "重复待处理",
        "approved": "通过",
        "rejected": "驳回",
        "merged": "已合并",
    }
    return mapping.get(s or "", s or "")


def _issue_label(t: Optional[str]) -> str:
    mapping = {
        "unit_missing": "单元缺失",
        "missing_identity": "身份信息缺失",
        "missing_score": "分数缺失",
        "mixed_remark": "备注混写",
        "duplicate_record": "重复记录",
    }
    return mapping.get(t or "", t or "")
