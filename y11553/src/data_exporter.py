import json
import os
from datetime import datetime
from typing import List, Dict, Any, Optional
import pandas as pd
from sqlalchemy.orm import Session
from .repository import DataRepository
from .models import (
    ImportTask,
    RecordType,
    InventoryRecord,
    ReplenishmentPhoto,
    RefundRecord,
    PriceAdjustment,
    DuplicateRecord,
    ProcessingLog,
)
from .config import EXPORT_DIR


class DataExporter:
    def __init__(self, db: Session):
        self.db = db
        self.repo = DataRepository(db)

    def export_task_results(self, task_id: str, format: str = "xlsx") -> str:
        task = self.repo.get_task_by_id(task_id)
        if not task:
            raise ValueError(f"任务不存在: {task_id}")

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"task_{task_id}_{timestamp}.{format}"
        filepath = os.path.join(EXPORT_DIR, filename)

        if format == "xlsx":
            self._export_to_excel(task, filepath)
        elif format == "csv":
            self._export_to_csv(task, filepath)
        elif format == "json":
            self._export_to_json(task, filepath)
        else:
            raise ValueError(f"不支持的导出格式: {format}")

        return filepath

    def _export_to_excel(self, task: ImportTask, filepath: str):
        with pd.ExcelWriter(filepath, engine="openpyxl") as writer:
            summary_df = pd.DataFrame([{
                "任务ID": task.task_id,
                "记录类型": task.record_type.value,
                "来源类型": task.source_type.value,
                "来源文件": task.source_file or "",
                "状态": task.status.value,
                "总计条数": task.total_count,
                "成功条数": task.success_count,
                "重复条数": task.duplicate_count,
                "错误条数": task.error_count,
                "创建时间": task.created_at,
                "完成时间": task.completed_at or "",
            }])
            summary_df.to_excel(writer, sheet_name="任务汇总", index=False)

            records_df = self._get_records_dataframe(task)
            if not records_df.empty:
                records_df.to_excel(writer, sheet_name="数据明细", index=False)

            duplicates = self.repo.get_task_duplicates(task.id)
            if duplicates:
                dup_df = pd.DataFrame([{
                    "原始记录ID": d.original_record_id,
                    "重复类型": d.duplicate_type.value,
                    "指纹": d.fingerprint,
                    "原因": d.reason,
                    "来源行号": d.source_row_number or "",
                    "原始数据": d.raw_data,
                } for d in duplicates])
                dup_df.to_excel(writer, sheet_name="重复记录", index=False)

            logs = self.repo.get_task_logs(task.id)
            if logs:
                logs_df = pd.DataFrame([{
                    "时间": log.created_at,
                    "级别": log.level,
                    "消息": log.message,
                    "记录ID": log.record_id or "",
                } for log in logs])
                logs_df.to_excel(writer, sheet_name="处理日志", index=False)

    def _export_to_csv(self, task: ImportTask, filepath: str):
        base_path = os.path.splitext(filepath)[0]

        records_df = self._get_records_dataframe(task)
        if not records_df.empty:
            records_df.to_csv(f"{base_path}_records.csv", index=False, encoding="utf-8-sig")

        duplicates = self.repo.get_task_duplicates(task.id)
        if duplicates:
            dup_df = pd.DataFrame([{
                "原始记录ID": d.original_record_id,
                "重复类型": d.duplicate_type.value,
                "指纹": d.fingerprint,
                "原因": d.reason,
            } for d in duplicates])
            dup_df.to_csv(f"{base_path}_duplicates.csv", index=False, encoding="utf-8-sig")

    def _export_to_json(self, task: ImportTask, filepath: str):
        data = {
            "task_summary": {
                "task_id": task.task_id,
                "record_type": task.record_type.value,
                "status": task.status.value,
                "total_count": task.total_count,
                "success_count": task.success_count,
                "duplicate_count": task.duplicate_count,
                "error_count": task.error_count,
            },
            "records": self._get_records_list(task),
            "duplicates": [{
                "original_record_id": d.original_record_id,
                "duplicate_type": d.duplicate_type.value,
                "reason": d.reason,
                "fingerprint": d.fingerprint,
            } for d in self.repo.get_task_duplicates(task.id)],
        }
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)

    def _get_records_dataframe(self, task: ImportTask) -> pd.DataFrame:
        records = self._get_records_list(task)
        return pd.DataFrame(records)

    def _get_records_list(self, task: ImportTask) -> List[Dict[str, Any]]:
        if task.record_type == RecordType.INVENTORY:
            query = self.db.query(InventoryRecord).filter(InventoryRecord.task_id == task.id)
            return [{
                "记录ID": r.record_id,
                "来源文件": r.source_file or "",
                "来源行号": r.source_row_number or "",
                "柜机ID": r.cabinet_id,
                "格口ID": r.cell_id,
                "商品ID": r.sku_id,
                "商品名称": r.sku_name,
                "库存数量": r.quantity,
                "是否热销格口": "是" if r.is_hot_cell else "否",
                "处理原因": r.processing_reason or "",
                "是否重复": "是" if r.is_duplicate else "否",
                "记录时间": r.record_time,
                "原始数据": r.raw_data,
            } for r in query.all()]

        elif task.record_type == RecordType.REPLENISHMENT:
            query = self.db.query(ReplenishmentPhoto).filter(ReplenishmentPhoto.task_id == task.id)
            return [{
                "记录ID": r.record_id,
                "来源文件": r.source_file or "",
                "来源行号": r.source_row_number or "",
                "柜机ID": r.cabinet_id,
                "格口ID": r.cell_id,
                "照片URL": r.photo_url,
                "照片哈希": r.photo_hash,
                "补货数量": r.replenishment_quantity,
                "操作员ID": r.operator_id,
                "是否重复": "是" if r.is_duplicate else "否",
                "记录时间": r.record_time,
            } for r in query.all()]

        elif task.record_type == RecordType.REFUND:
            query = self.db.query(RefundRecord).filter(RefundRecord.task_id == task.id)
            return [{
                "记录ID": r.record_id,
                "来源文件": r.source_file or "",
                "来源行号": r.source_row_number or "",
                "柜机ID": r.cabinet_id,
                "订单ID": r.order_id,
                "用户ID": r.user_id,
                "商品ID": r.sku_id,
                "退款金额": r.refund_amount,
                "退款原因": r.refund_reason,
                "是否重复": "是" if r.is_duplicate else "否",
                "记录时间": r.record_time,
            } for r in query.all()]

        elif task.record_type == RecordType.PRICE_ADJUSTMENT:
            query = self.db.query(PriceAdjustment).filter(PriceAdjustment.task_id == task.id)
            return [{
                "记录ID": r.record_id,
                "来源文件": r.source_file or "",
                "来源行号": r.source_row_number or "",
                "柜机ID": r.cabinet_id,
                "格口ID": r.cell_id,
                "商品ID": r.sku_id,
                "原价": r.original_price,
                "新价": r.new_price,
                "操作员ID": r.operator_id,
                "审批备注": r.approval_note or "",
                "是否重复": "是" if r.is_duplicate else "否",
                "记录时间": r.record_time,
            } for r in query.all()]

        return []

    def export_all_records(
        self,
        record_type: RecordType,
        cabinet_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        format: str = "xlsx",
    ) -> str:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{record_type.value}_all_{timestamp}.{format}"
        filepath = os.path.join(EXPORT_DIR, filename)

        records = self._query_records(record_type, cabinet_id, start_date, end_date)

        if format == "xlsx":
            pd.DataFrame(records).to_excel(filepath, index=False)
        elif format == "csv":
            pd.DataFrame(records).to_csv(filepath, index=False, encoding="utf-8-sig")
        elif format == "json":
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(records, f, ensure_ascii=False, indent=2, default=str)

        return filepath

    def _query_records(
        self,
        record_type: RecordType,
        cabinet_id: Optional[str],
        start_date: Optional[datetime],
        end_date: Optional[datetime],
    ) -> List[Dict]:
        model_map = {
            RecordType.INVENTORY: InventoryRecord,
            RecordType.REPLENISHMENT: ReplenishmentPhoto,
            RecordType.REFUND: RefundRecord,
            RecordType.PRICE_ADJUSTMENT: PriceAdjustment,
        }
        model = model_map.get(record_type)
        if not model:
            return []

        query = self.db.query(model)
        if cabinet_id:
            query = query.filter(model.cabinet_id == cabinet_id)
        if start_date:
            query = query.filter(model.record_time >= start_date)
        if end_date:
            query = query.filter(model.record_time <= end_date)

        return [r.__dict__ for r in query.all()]
