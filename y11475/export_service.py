from datetime import datetime
from typing import List, Dict, Any
from io import BytesIO
import json

import pandas as pd
from sqlalchemy.orm import Session

from models import (
    Batch, AbnormalRecord, BatchState, RecordState,
    BatchStateLog, RecordStateLog
)
from schemas import ExportSummary


def get_state_before_freeze(batch: Batch) -> BatchState:
    freeze_logs = [
        log for log in batch.state_logs
        if log.to_state == BatchState.FROZEN
    ]
    if freeze_logs:
        return freeze_logs[0].from_state
    return None


def get_batch_records_summary(db: Session, batch_id: str) -> Dict[str, Any]:
    records = db.query(AbnormalRecord).filter(
        AbnormalRecord.batch_id == batch_id
    ).all()

    summary = {
        "total": len(records),
        "approved": 0,
        "rejected": 0,
        "pending": 0,
        "frozen": 0,
        "manual_override": 0,
        "total_cost": 0,
        "recovered_cost": 0,
    }

    for r in records:
        if r.state == RecordState.APPROVED:
            summary["approved"] += 1
        elif r.state == RecordState.REJECTED:
            summary["rejected"] += 1
        elif r.state in (RecordState.DRAFT, RecordState.PENDING_REVIEW):
            summary["pending"] += 1
        elif r.state == RecordState.FROZEN:
            summary["frozen"] += 1

        if r.manual_override:
            summary["manual_override"] += 1

        if r.actual_cost:
            summary["total_cost"] += r.actual_cost

        if r.cost_recovery_status == "已追回" and r.actual_cost:
            summary["recovered_cost"] += r.actual_cost

    return summary


def generate_export_summary(
    db: Session,
    batch_id: str,
    exported_by: str
) -> ExportSummary:
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise ValueError(f"批次 {batch_id} 不存在")

    if batch.state != BatchState.FROZEN:
        raise ValueError(f"批次必须先冻结才能导出，当前状态: {batch.state.value}")

    records = db.query(AbnormalRecord).filter(
        AbnormalRecord.batch_id == batch_id
    ).all()

    summary_data = get_batch_records_summary(db, batch_id)
    state_before = get_state_before_freeze(batch)

    record_details = []
    for r in records:
        state_logs = [
            {
                "from": log.from_state.value if log.from_state else None,
                "to": log.to_state.value,
                "operator": log.operator,
                "reason": log.reason,
                "time": log.change_time.isoformat()
            }
            for log in r.state_logs
        ]

        original_evidences = [
            {
                "field": ev.parsed_field,
                "original_value": ev.original_value,
                "parsed_value": ev.parsed_value,
                "source_file": ev.source_file.file_name if ev.source_file else None,
                "row_number": ev.original_row_number
            }
            for ev in r.original_evidences
        ]

        record_details.append({
            "record_id": r.id,
            "state": r.state.value,
            "source": r.source.value,
            "room_code": r.room_code,
            "room_name": r.room_name,
            "appointment_id": r.appointment_id,
            "appointment_subject": r.appointment_subject,
            "appointment_date": r.appointment_date.isoformat() if r.appointment_date else None,
            "booker": r.booker,
            "booker_dept": r.booker_dept,
            "has_access_record": r.has_access_record,
            "access_person": r.access_person,
            "has_cancel_message": r.has_cancel_message,
            "cancel_operator": r.cancel_operator,
            "estimated_cost": r.estimated_cost,
            "actual_cost": r.actual_cost,
            "cost_recovery_status": r.cost_recovery_status,
            "manual_override": r.manual_override,
            "override_reason": r.override_reason,
            "override_by": r.override_by,
            "override_time": r.override_time.isoformat() if r.override_time else None,
            "final_result": r.final_result,
            "final_remark": r.final_remark,
            "state_history": state_logs,
            "original_evidences": original_evidences
        })

    return ExportSummary(
        batch_id=batch.id,
        batch_name=batch.name,
        export_time=datetime.now(),
        exported_by=exported_by,
        state_before_freeze=state_before,
        state_after_freeze=batch.state,
        freeze_reason=batch.frozen_reason,
        freeze_operator=batch.frozen_by,
        total_records=summary_data["total"],
        approved_count=summary_data["approved"],
        rejected_count=summary_data["rejected"],
        pending_count=summary_data["pending"],
        manual_override_count=summary_data["manual_override"],
        total_cost=summary_data["total_cost"],
        recovered_cost=summary_data["recovered_cost"],
        records=record_details
    )


def export_to_excel(summary: ExportSummary) -> bytes:
    output = BytesIO()

    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        summary_data = {
            "项目": [
                "批次ID", "批次名称", "导出时间", "导出人",
                "冻结前状态", "冻结后状态", "冻结原因", "冻结操作人",
                "总记录数", "通过数", "驳回数", "待处理数", "人工改判数",
                "总费用(元)", "已追回费用(元)"
            ],
            "内容": [
                summary.batch_id,
                summary.batch_name,
                summary.export_time.strftime("%Y-%m-%d %H:%M:%S"),
                summary.exported_by,
                summary.state_before_freeze.value if summary.state_before_freeze else "",
                summary.state_after_freeze.value if summary.state_after_freeze else "",
                summary.freeze_reason or "",
                summary.freeze_operator or "",
                summary.total_records,
                summary.approved_count,
                summary.rejected_count,
                summary.pending_count,
                summary.manual_override_count,
                summary.total_cost,
                summary.recovered_cost
            ]
        }
        pd.DataFrame(summary_data).to_excel(writer, sheet_name="汇总", index=False)

        records_df = pd.DataFrame([
            {
                "记录ID": r["record_id"],
                "状态": r["state"],
                "来源": r["source"],
                "会议室编码": r["room_code"],
                "会议室名称": r["room_name"] or "",
                "预约ID": r["appointment_id"] or "",
                "会议主题": r["appointment_subject"] or "",
                "预约日期": r["appointment_date"],
                "预约人": r["booker"] or "",
                "预约部门": r["booker_dept"] or "",
                "有无门禁记录": "是" if r["has_access_record"] else "否" if r["has_access_record"] is not None else "",
                "刷卡人": r["access_person"] or "",
                "有无取消消息": "是" if r["has_cancel_message"] else "否" if r["has_cancel_message"] is not None else "",
                "取消操作人": r["cancel_operator"] or "",
                "预估费用": r["estimated_cost"] or 0,
                "实际费用": r["actual_cost"] or 0,
                "追回状态": r["cost_recovery_status"] or "",
                "人工改判": "是" if r["manual_override"] else "否",
                "改判原因": r["override_reason"] or "",
                "改判人": r["override_by"] or "",
                "最终结果": r["final_result"] or "",
                "最终备注": r["final_remark"] or ""
            }
            for r in summary.records
        ])
        records_df.to_excel(writer, sheet_name="异常明细", index=False)

        logs_data = []
        for r in summary.records:
            for log in r["state_history"]:
                logs_data.append({
                    "记录ID": r["record_id"],
                    "原状态": log["from"] or "",
                    "新状态": log["to"],
                    "操作人": log["operator"],
                    "原因": log["reason"],
                    "时间": log["time"]
                })
        if logs_data:
            pd.DataFrame(logs_data).to_excel(writer, sheet_name="状态变更日志", index=False)

        evidences_data = []
        for r in summary.records:
            for ev in r["original_evidences"]:
                evidences_data.append({
                    "记录ID": r["record_id"],
                    "字段": ev["field"],
                    "原始值": ev["original_value"],
                    "解析值": ev["parsed_value"] or "",
                    "来源文件": ev["source_file"] or "",
                    "行号": ev["row_number"] or ""
                })
        if evidences_data:
            pd.DataFrame(evidences_data).to_excel(writer, sheet_name="原始证据", index=False)

    output.seek(0)
    return output.getvalue()
