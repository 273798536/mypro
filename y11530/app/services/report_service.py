from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
import pandas as pd
import os

from app.models import (
    ExceptionBatch,
    ExceptionRecord,
    StatusHistory,
    FailedRecord,
    RecordStatus,
    ExceptionStatus,
    ActionType,
)
from app.config import settings
from app.schemas import (
    ManagerDashboardResponse,
    BatchDetailReport,
    StatusChangeItem,
    RecordSummary,
)


class ReportService:
    def __init__(self, db: Session):
        self.db = db

    def get_manager_dashboard(self, branch_id: Optional[str] = None) -> ManagerDashboardResponse:
        query = self.db.query(ExceptionBatch)
        if branch_id:
            query = query.filter(ExceptionBatch.branch_id == branch_id)

        batches = query.all()

        total_records = sum(b.total_records for b in batches)
        unprocessed = sum(b.unprocessed_records for b in batches)
        corrected = sum(b.corrected_records for b in batches)
        need_confirm = sum(b.need_manual_confirm_records for b in batches)
        failed = sum(b.failed_records for b in batches)

        recent_batches = query.order_by(ExceptionBatch.created_at.desc()).limit(5).all()
        recent_reports = [self.get_batch_detail_report(b.id) for b in recent_batches]

        return ManagerDashboardResponse(
            total_batches=len(batches),
            draft_batches=sum(1 for b in batches if b.status == ExceptionStatus.DRAFT),
            pending_review_batches=sum(
                1 for b in batches if b.status == ExceptionStatus.PENDING_REVIEW
            ),
            approved_batches=sum(1 for b in batches if b.status == ExceptionStatus.APPROVED),
            frozen_batches=sum(1 for b in batches if b.status == ExceptionStatus.FROZEN),
            settled_batches=sum(1 for b in batches if b.status == ExceptionStatus.SETTLED),
            archived_batches=sum(1 for b in batches if b.status == ExceptionStatus.ARCHIVED),
            total_records=total_records,
            unprocessed_records=unprocessed,
            corrected_records=corrected,
            need_manual_confirm_records=need_confirm,
            failed_records=failed,
            recent_batches=recent_reports,
        )

    def get_batch_detail_report(self, batch_id: int) -> BatchDetailReport:
        batch = (
            self.db.query(ExceptionBatch).filter(ExceptionBatch.id == batch_id).first()
        )
        if not batch:
            raise ValueError(f"Batch {batch_id} not found")

        histories = (
            self.db.query(StatusHistory)
            .filter(StatusHistory.batch_id == batch_id, StatusHistory.record_id.is_(None))
            .order_by(StatusHistory.created_at.asc())
            .all()
        )

        status_changes = [
            StatusChangeItem(
                timestamp=h.created_at,
                action=h.action_type,
                from_status=h.from_status,
                to_status=h.to_status,
                operator=h.operator,
                reason=h.reason,
            )
            for h in histories
        ]

        freeze_history = next(
            (h for h in histories if h.action_type == ActionType.FREEZE), None
        )

        records_with_manual = (
            self.db.query(ExceptionRecord)
            .filter(
                ExceptionRecord.batch_id == batch_id,
                ExceptionRecord.manual_reason.isnot(None),
            )
            .all()
        )

        records_need_confirm = (
            self.db.query(ExceptionRecord)
            .filter(
                ExceptionRecord.batch_id == batch_id,
                ExceptionRecord.status == RecordStatus.NEED_MANUAL_CONFIRM,
            )
            .all()
        )

        def to_record_summary(r: ExceptionRecord) -> RecordSummary:
            return RecordSummary(
                id=r.id,
                exception_type=r.exception_type,
                exception_date=r.exception_date,
                teller_name=r.teller_name,
                description=r.description,
                status=r.status,
                before_status=r.before_status,
                after_status=r.after_status,
                manual_reason=r.manual_reason,
                reviewer=r.reviewer,
            )

        return BatchDetailReport(
            batch_no=batch.batch_no,
            branch_name=batch.branch_name,
            batch_date=batch.batch_date,
            current_status=batch.status,
            created_by=batch.created_by,
            created_at=batch.created_at,
            before_freeze_status=freeze_history.from_status if freeze_history else None,
            frozen_at=batch.frozen_at,
            frozen_by=batch.frozen_by,
            frozen_reason=batch.frozen_reason,
            total_records=batch.total_records,
            unprocessed_records=batch.unprocessed_records,
            corrected_records=batch.corrected_records,
            need_manual_confirm_records=batch.need_manual_confirm_records,
            failed_records=batch.failed_records,
            status_changes=status_changes,
            records_with_manual_reason=[to_record_summary(r) for r in records_with_manual],
            records_need_confirm=[to_record_summary(r) for r in records_need_confirm],
        )

    def export_to_excel(
        self,
        batch_ids: Optional[List[int]] = None,
        include_records: bool = True,
        include_history: bool = True,
        include_failures: bool = True,
    ) -> str:
        os.makedirs(settings.EXPORT_DIR, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"scheduling_exception_report_{timestamp}.xlsx"
        filepath = os.path.join(settings.EXPORT_DIR, filename)

        with pd.ExcelWriter(filepath, engine="openpyxl") as writer:
            batch_query = self.db.query(ExceptionBatch)
            if batch_ids:
                batch_query = batch_query.filter(ExceptionBatch.id.in_(batch_ids))
            batches = batch_query.all()

            batch_data = [
                {
                    "批次号": b.batch_no,
                    "支行名称": b.branch_name,
                    "支行ID": b.branch_id,
                    "批次日期": b.batch_date,
                    "当前状态": b.status,
                    "创建人": b.created_by,
                    "创建时间": b.created_at,
                    "总记录数": b.total_records,
                    "未处理": b.unprocessed_records,
                    "已修正": b.corrected_records,
                    "需人工确认": b.need_manual_confirm_records,
                    "失败记录": b.failed_records,
                    "冻结时间": b.frozen_at,
                    "冻结人": b.frozen_by,
                    "冻结原因": b.frozen_reason,
                    "结算时间": b.settled_at,
                    "归档时间": b.archived_at,
                }
                for b in batches
            ]
            pd.DataFrame(batch_data).to_excel(writer, sheet_name="批次汇总", index=False)

            if include_records:
                record_query = self.db.query(ExceptionRecord)
                if batch_ids:
                    record_query = record_query.filter(ExceptionRecord.batch_id.in_(batch_ids))
                records = record_query.all()

                record_data = [
                    {
                        "批次号": r.batch.batch_no if r.batch else "",
                        "异常类型": r.exception_type,
                        "异常日期": r.exception_date,
                        "柜员ID": r.teller_id,
                        "柜员姓名": r.teller_name,
                        "状态": r.status,
                        "描述": r.description,
                        "卡点说明": r.blocking_point,
                        "变更前状态": r.before_status,
                        "变更后状态": r.after_status,
                        "人工处理理由": r.manual_reason,
                        "复核人": r.reviewer,
                        "复核时间": r.reviewed_at,
                        "数据源": r.source_type,
                        "数据源ID": ",".join(r.source_ids) if r.source_ids else "",
                    }
                    for r in records
                ]
                pd.DataFrame(record_data).to_excel(writer, sheet_name="异常明细", index=False)

            if include_history:
                history_query = self.db.query(StatusHistory)
                if batch_ids:
                    history_query = history_query.filter(StatusHistory.batch_id.in_(batch_ids))
                histories = history_query.order_by(StatusHistory.created_at.asc()).all()

                history_data = [
                    {
                        "批次号": h.batch.batch_no if h.batch else "",
                        "记录ID": h.record_id if h.record_id else "批次级别",
                        "操作类型": h.action_type,
                        "变更前状态": h.from_status,
                        "变更后状态": h.to_status,
                        "操作人": h.operator,
                        "原因": h.reason,
                        "操作时间": h.created_at,
                    }
                    for h in histories
                ]
                pd.DataFrame(history_data).to_excel(writer, sheet_name="状态历史", index=False)

            if include_failures:
                failure_query = self.db.query(FailedRecord)
                if batch_ids:
                    failure_query = failure_query.filter(FailedRecord.batch_id.in_(batch_ids))
                failures = failure_query.all()

                failure_data = [
                    {
                        "批次ID": f.batch_id,
                        "记录标识": f.record_key,
                        "数据源": f.source_type,
                        "错误类型": f.error_type,
                        "错误信息": f.error_message,
                        "创建时间": f.created_at,
                    }
                    for f in failures
                ]
                pd.DataFrame(failure_data).to_excel(writer, sheet_name="失败记录", index=False)

        return filepath
