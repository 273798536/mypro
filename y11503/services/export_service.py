from sqlalchemy.orm import Session
import pandas as pd
from datetime import datetime
from pathlib import Path
from typing import Optional, List

import models
import config

class ExportService:
    def __init__(self, db: Session):
        self.db = db

    def export_batch_to_excel(self, batch_no: str, export_dir: Path = None) -> str:
        if export_dir is None:
            export_dir = config.EXPORT_DIR

        batch = self.db.query(models.Batch).filter(models.Batch.batch_no == batch_no).first()
        if not batch:
            raise ValueError(f"Batch {batch_no} not found")

        if batch.status not in config.BatchStatus.CAN_EXPORT:
            raise ValueError(f"Cannot export batch in status: {batch.status}")

        export_dir.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"batch_{batch_no}_{timestamp}.xlsx"
        filepath = export_dir / filename

        with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
            self._write_batch_summary(batch, writer)
            self._write_repair_orders(batch, writer)
            self._write_spare_parts(batch, writer)
            self._write_photos(batch, writer)
            self._write_operation_logs(batch, writer)

        return str(filepath)

    def _write_batch_summary(self, batch: models.Batch, writer):
        data = [{
            "批次号": batch.batch_no,
            "状态": batch.status,
            "操作员": batch.operator,
            "描述": batch.description or "",
            "备件总数": batch.total_parts,
            "成功数": batch.success_parts,
            "失败数": batch.failed_parts,
            "幂等键": batch.idempotency_key,
            "重复策略": batch.duplicate_strategy,
            "错误信息": batch.error_message or "",
            "创建时间": batch.created_at.strftime("%Y-%m-%d %H:%M:%S") if batch.created_at else "",
            "提交时间": batch.submitted_at.strftime("%Y-%m-%d %H:%M:%S") if batch.submitted_at else "",
            "冻结时间": batch.frozen_at.strftime("%Y-%m-%d %H:%M:%S") if batch.frozen_at else "",
        }]
        df = pd.DataFrame(data)
        df.to_excel(writer, sheet_name="批次汇总", index=False)

    def _write_repair_orders(self, batch: models.Batch, writer):
        data = []
        for ro in batch.repair_orders:
            data.append({
                "维修单号": ro.order_no,
                "客户姓名": ro.customer_name or "",
                "客户电话": ro.customer_phone or "",
                "产品型号": ro.product_model or "",
                "故障描述": ro.fault_description or "",
                "工程师": ro.engineer or "",
                "补单标记": "是" if ro.is_late_submit else "否",
                "备注": ro.remark or "",
                "创建时间": ro.created_at.strftime("%Y-%m-%d %H:%M:%S") if ro.created_at else "",
            })
        df = pd.DataFrame(data)
        df.to_excel(writer, sheet_name="维修单", index=False)

    def _write_spare_parts(self, batch: models.Batch, writer):
        data = []
        for part in batch.parts:
            repair_order_no = next((ro.order_no for ro in batch.repair_orders if ro.id == part.repair_order_id), "")
            data.append({
                "备件编码": part.part_code,
                "备件名称": part.part_name or "",
                "条码": part.barcode or "",
                "数量": part.quantity,
                "状态": part.status,
                "退回件": "是" if part.is_returned else "否",
                "报废件": "是" if part.is_scrapped else "否",
                "混淆标记": "是" if part.is_mixed else "否",
                "维修单号": repair_order_no,
                "扫描时间": part.scan_time.strftime("%Y-%m-%d %H:%M:%S") if part.scan_time else "",
                "扫描人": part.scan_operator or "",
                "校验结果": part.validation_result or "",
                "校验信息": part.validation_message or "",
                "备注": part.remark or "",
                "创建时间": part.created_at.strftime("%Y-%m-%d %H:%M:%S") if part.created_at else "",
            })
        df = pd.DataFrame(data)
        df.to_excel(writer, sheet_name="备件明细", index=False)

    def _write_photos(self, batch: models.Batch, writer):
        data = []
        for photo in batch.photos:
            data.append({
                "照片类型": photo.photo_type,
                "文件名": photo.file_name or "",
                "文件路径": photo.file_path,
                "文件大小": photo.file_size or 0,
                "上传人": photo.upload_operator or "",
                "备注": photo.remark or "",
                "上传时间": photo.created_at.strftime("%Y-%m-%d %H:%M:%S") if photo.created_at else "",
            })
        df = pd.DataFrame(data)
        df.to_excel(writer, sheet_name="照片记录", index=False)

    def _write_operation_logs(self, batch: models.Batch, writer):
        data = []
        for log in sorted(batch.operation_logs, key=lambda x: x.created_at):
            data.append({
                "操作类型": log.operation,
                "操作员": log.operator,
                "原状态": log.old_status or "",
                "新状态": log.new_status or "",
                "变更字段": log.changed_fields or "",
                "备注": log.remark or "",
                "操作时间": log.created_at.strftime("%Y-%m-%d %H:%M:%S") if log.created_at else "",
            })
        df = pd.DataFrame(data)
        df.to_excel(writer, sheet_name="操作日志", index=False)

    def reconcile_batches(self, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> dict:
        query = self.db.query(models.Batch)
        if start_date:
            query = query.filter(models.Batch.created_at >= start_date)
        if end_date:
            query = query.filter(models.Batch.created_at <= end_date)

        batches = query.all()

        total_parts = sum(b.total_parts for b in batches)
        success_parts = sum(b.success_parts for b in batches)
        failed_parts = sum(b.failed_parts for b in batches)
        returned_parts = sum(1 for b in batches for p in b.parts if p.is_returned)
        scrapped_parts = sum(1 for b in batches for p in b.parts if p.is_scrapped)
        mixed_parts = sum(1 for b in batches for p in b.parts if p.is_mixed)
        late_submit_orders = sum(1 for b in batches for ro in b.repair_orders if ro.is_late_submit)

        status_summary = {}
        for status in config.BatchStatus.ALL_STATUSES:
            status_summary[status] = sum(1 for b in batches if b.status == status)

        return {
            "total_batches": len(batches),
            "total_parts": total_parts,
            "success_parts": success_parts,
            "failed_parts": failed_parts,
            "returned_parts": returned_parts,
            "scrapped_parts": scrapped_parts,
            "mixed_parts": mixed_parts,
            "late_submit_orders": late_submit_orders,
            "status_summary": status_summary,
            "reconciled_at": datetime.utcnow().isoformat(),
        }
