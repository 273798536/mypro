import io
from typing import List, Optional
from datetime import datetime
import pandas as pd
from sqlalchemy.orm import Session

from app.models import ReturnCompensationQueue, QueueStatus, OperationHistory, RetryCategory


class ExportService:
    def __init__(self, db: Session):
        self.db = db

    def export_queues_to_excel(
        self,
        status: Optional[QueueStatus] = None,
        retry_category: Optional[RetryCategory] = None,
        customer_id: Optional[str] = None,
        is_frozen: Optional[bool] = None,
        is_manual: Optional[bool] = None
    ) -> bytes:
        query = self.db.query(ReturnCompensationQueue)

        if status:
            query = query.filter(ReturnCompensationQueue.status == status)
        if retry_category:
            query = query.filter(ReturnCompensationQueue.retry_category == retry_category)
        if customer_id:
            query = query.filter(ReturnCompensationQueue.customer_id == customer_id)
        if is_frozen is not None:
            query = query.filter(ReturnCompensationQueue.is_frozen == is_frozen)
        if is_manual is not None:
            query = query.filter(ReturnCompensationQueue.is_manual == is_manual)

        queues = query.order_by(ReturnCompensationQueue.created_at.desc()).all()

        data = []
        for queue in queues:
            data.append({
                "队列ID": queue.id,
                "批次号": queue.batch_no,
                "幂等键": queue.idempotency_key,
                "状态": queue.status.value if queue.status else "",
                "重试分类": queue.retry_category.value if queue.retry_category else "",
                "重试次数": queue.retry_count,
                "最大重试次数": queue.max_retries,
                "客户ID": queue.customer_id or "",
                "客户名称": queue.customer_name or "",
                "押金金额": queue.deposit_amount,
                "补偿金额": queue.compensation_amount,
                "实际扣减": queue.actual_deduction,
                "有出库单": "是" if queue.has_outbound_order else "否",
                "有归还照片": "是" if queue.has_return_photos else "否",
                "有维修估价": "是" if queue.has_maintenance_estimate else "否",
                "有扫码明细": "是" if queue.has_scan_details else "否",
                "有押金复核": "是" if queue.has_deposit_review else "否",
                "是否冻结": "是" if queue.is_frozen else "否",
                "冻结时间": queue.frozen_at.strftime("%Y-%m-%d %H:%M:%S") if queue.frozen_at else "",
                "冻结人": queue.frozen_by or "",
                "冻结原因": queue.frozen_reason or "",
                "是否人工处理": "是" if queue.is_manual else "否",
                "人工处理人": queue.manual_handler or "",
                "人工决策": queue.manual_decision or "",
                "人工处理时间": queue.manual_at.strftime("%Y-%m-%d %H:%M:%S") if queue.manual_at else "",
                "补偿时间": queue.compensated_at.strftime("%Y-%m-%d %H:%M:%S") if queue.compensated_at else "",
                "关闭时间": queue.closed_at.strftime("%Y-%m-%d %H:%M:%S") if queue.closed_at else "",
                "关闭人": queue.closed_by or "",
                "错误信息": queue.error_message or "",
                "创建人": queue.created_by or "",
                "创建时间": queue.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "更新时间": queue.updated_at.strftime("%Y-%m-%d %H:%M:%S")
            })

        df = pd.DataFrame(data)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, sheet_name="队列列表", index=False)

        return output.getvalue()

    def export_operation_history_to_excel(self, queue_id: Optional[int] = None) -> bytes:
        query = self.db.query(OperationHistory)
        if queue_id:
            query = query.filter(OperationHistory.queue_id == queue_id)

        histories = query.order_by(OperationHistory.operated_at.desc()).all()

        data = []
        for history in histories:
            data.append({
                "操作ID": history.id,
                "队列ID": history.queue_id,
                "操作类型": history.operation_type.value if history.operation_type else "",
                "操作人": history.operator,
                "操作时间": history.operated_at.strftime("%Y-%m-%d %H:%M:%S"),
                "原状态": history.old_status.value if history.old_status else "",
                "新状态": history.new_status.value if history.new_status else "",
                "变更摘要": str(history.change_summary),
                "详细说明": history.detail or "",
                "IP地址": history.ip_address or "",
                "User Agent": history.user_agent or ""
            })

        df = pd.DataFrame(data)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, sheet_name="操作历史", index=False)

        return output.getvalue()

    def export_finance_report(self) -> bytes:
        from sqlalchemy import func

        queues = self.db.query(ReturnCompensationQueue).all()

        summary_data = [{
            "统计项": "总记录数",
            "数量": len(queues),
            "押金总额": sum(q.deposit_amount for q in queues),
            "补偿总额": sum(q.compensation_amount for q in queues),
            "实际扣减总额": sum(q.actual_deduction for q in queues)
        }]

        for status in QueueStatus:
            status_queues = [q for q in queues if q.status == status]
            if status_queues:
                summary_data.append({
                    "统计项": f"{status.value}状态",
                    "数量": len(status_queues),
                    "押金总额": sum(q.deposit_amount for q in status_queues),
                    "补偿总额": sum(q.compensation_amount for q in status_queues),
                    "实际扣减总额": sum(q.actual_deduction for q in status_queues)
                })

        for category in RetryCategory:
            category_queues = [q for q in queues if q.retry_category == category]
            if category_queues:
                summary_data.append({
                    "统计项": f"重试分类-{category.value}",
                    "数量": len(category_queues),
                    "押金总额": sum(q.deposit_amount for q in category_queues),
                    "补偿总额": sum(q.compensation_amount for q in category_queues),
                    "实际扣减总额": sum(q.actual_deduction for q in category_queues)
                })

        detail_data = []
        for queue in queues:
            detail_data.append({
                "队列ID": queue.id,
                "批次号": queue.batch_no,
                "状态": queue.status.value if queue.status else "",
                "重试分类": queue.retry_category.value if queue.retry_category else "",
                "客户ID": queue.customer_id or "",
                "客户名称": queue.customer_name or "",
                "押金金额": queue.deposit_amount,
                "补偿金额": queue.compensation_amount,
                "实际扣减": queue.actual_deduction,
                "是否人工处理": "是" if queue.is_manual else "否",
                "创建时间": queue.created_at.strftime("%Y-%m-%d %H:%M:%S")
            })

        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            pd.DataFrame(summary_data).to_excel(writer, sheet_name="汇总统计", index=False)
            pd.DataFrame(detail_data).to_excel(writer, sheet_name="明细数据", index=False)

        return output.getvalue()
