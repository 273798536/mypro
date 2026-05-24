from sqlalchemy.orm import Session
from typing import List, Optional
import pandas as pd
from io import BytesIO
from datetime import datetime

from app.models import ReceiptQueue
from app.schemas import ExportRequest


class ExportService:
    @staticmethod
    def _get_base_query(db: Session, filters: ExportRequest):
        query = db.query(
            ReceiptQueue.queue_no,
            ReceiptQueue.source_type,
            ReceiptQueue.material_name,
            ReceiptQueue.material_code,
            ReceiptQueue.quantity,
            ReceiptQueue.amount,
            ReceiptQueue.status,
            ReceiptQueue.retry_count,
            ReceiptQueue.is_dirty,
            ReceiptQueue.dirty_type,
            ReceiptQueue.dirty_note,
            ReceiptQueue.retry_category,
            ReceiptQueue.handler,
            ReceiptQueue.handled_at,
            ReceiptQueue.compensated_amount,
            ReceiptQueue.compensated_at,
            ReceiptQueue.closed_at,
            ReceiptQueue.created_at
        )

        if filters.status:
            query = query.filter(ReceiptQueue.status.in_(filters.status))
        if filters.source_type:
            query = query.filter(ReceiptQueue.source_type.in_(filters.source_type))
        if filters.is_dirty is not None:
            query = query.filter(ReceiptQueue.is_dirty == filters.is_dirty)
        if filters.start_date:
            query = query.filter(ReceiptQueue.created_at >= filters.start_date)
        if filters.end_date:
            query = query.filter(ReceiptQueue.created_at <= filters.end_date)

        return query.order_by(ReceiptQueue.created_at.desc())

    @classmethod
    def export_to_excel(cls, db: Session, filters: ExportRequest) -> BytesIO:
        query = cls._get_base_query(db, filters)
        results = query.all()

        columns = [
            "队列编号", "来源类型", "物料名称", "物料编码",
            "数量", "金额", "状态", "重试次数", "是否脏数据",
            "脏数据类型", "脏数据说明", "重试分类", "处理人",
            "处理时间", "补偿金额", "补偿时间", "关闭时间", "创建时间"
        ]

        data = []
        for r in results:
            data.append([
                r.queue_no,
                r.source_type,
                r.material_name,
                r.material_code or "",
                r.quantity,
                r.amount,
                r.status,
                r.retry_count,
                "是" if r.is_dirty else "否",
                r.dirty_type or "",
                r.dirty_note or "",
                r.retry_category or "",
                r.handler or "",
                r.handled_at.strftime("%Y-%m-%d %H:%M:%S") if r.handled_at else "",
                r.compensated_amount,
                r.compensated_at.strftime("%Y-%m-%d %H:%M:%S") if r.compensated_at else "",
                r.closed_at.strftime("%Y-%m-%d %H:%M:%S") if r.closed_at else "",
                r.created_at.strftime("%Y-%m-%d %H:%M:%S") if r.created_at else ""
            ])

        df = pd.DataFrame(data, columns=columns)

        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='回执队列数据')

            worksheet = writer.sheets['回执队列数据']
            for column in worksheet.columns:
                max_length = 0
                column_letter = column[0].column_letter
                for cell in column:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                adjusted_width = min(max_length + 2, 50)
                worksheet.column_dimensions[column_letter].width = adjusted_width

        output.seek(0)
        return output

    @classmethod
    def get_export_data(cls, db: Session, filters: ExportRequest) -> List[dict]:
        query = cls._get_base_query(db, filters)
        results = query.all()

        return [
            {
                "queue_no": r.queue_no,
                "source_type": r.source_type,
                "material_name": r.material_name,
                "material_code": r.material_code,
                "quantity": r.quantity,
                "amount": r.amount,
                "status": r.status,
                "retry_count": r.retry_count,
                "is_dirty": r.is_dirty,
                "dirty_type": r.dirty_type,
                "dirty_note": r.dirty_note,
                "retry_category": r.retry_category,
                "handler": r.handler,
                "handled_at": r.handled_at,
                "compensated_amount": r.compensated_amount,
                "compensated_at": r.compensated_at,
                "closed_at": r.closed_at,
                "created_at": r.created_at
            }
            for r in results
        ]
