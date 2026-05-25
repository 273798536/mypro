import json
import os
from typing import List, Dict, Any, Optional
from datetime import datetime
import pandas as pd
from sqlalchemy.orm import Session
from .repository import DataRepository
from .models import (
    ImportTask,
    TaskStatus,
    RecordType,
    ImportSource,
    PendingRecordStatus,
)
from .config import UPLOAD_DIR
from .duplicate_detector import generate_fingerprint


class DataImporter:
    def __init__(self, db: Session):
        self.db = db
        self.repo = DataRepository(db)

    def import_from_api(
        self,
        record_type: RecordType,
        records: List[Dict[str, Any]],
    ) -> ImportTask:
        task = self.repo.create_import_task(
            record_type=record_type,
            source_type=ImportSource.API,
        )
        self.repo.add_log(task, f"通过API导入，共 {len(records)} 条记录，等待异步处理")
        self._persist_pending_records(task, record_type, records)
        return task

    def import_from_file(
        self,
        record_type: RecordType,
        file_path: str,
    ) -> ImportTask:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"文件不存在: {file_path}")

        filename = os.path.basename(file_path)
        task = self.repo.create_import_task(
            record_type=record_type,
            source_type=ImportSource.FILE,
            source_file=filename,
        )

        try:
            records = self._parse_file(file_path, record_type)
            self.repo.add_log(task, f"从文件 {filename} 导入，共 {len(records)} 条记录，等待异步处理")
            self._persist_pending_records(task, record_type, records, source_file=filename)
        except Exception as e:
            self.repo.update_task_status(task, TaskStatus.PERMANENT_FAILED, str(e))
            self.repo.add_log(task, f"文件解析失败: {str(e)}", level="error")

        return task

    def _persist_pending_records(
        self,
        task: ImportTask,
        record_type: RecordType,
        records: List[Dict[str, Any]],
        source_file: Optional[str] = None,
    ):
        for idx, data in enumerate(records):
            row_num = idx + 1
            try:
                fingerprint = generate_fingerprint(data, record_type)
                self.repo.create_pending_record(
                    task=task,
                    record_type=record_type,
                    raw_data=data,
                    source_row_number=row_num,
                    fingerprint=fingerprint,
                )
            except Exception as e:
                self.repo.add_log(
                    task,
                    f"第{row_num}行持久化失败: {str(e)}",
                    level="error",
                    raw_data=json.dumps(data, ensure_ascii=False, default=str),
                )

        task.total_count = len(records)
        try:
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise e
        self.db.refresh(task)

    def _parse_file(self, file_path: str, record_type: RecordType) -> List[Dict[str, Any]]:
        ext = os.path.splitext(file_path)[1].lower()

        if ext in [".xlsx", ".xls"]:
            df = pd.read_excel(file_path)
        elif ext == ".csv":
            df = pd.read_csv(file_path)
        elif ext == ".json":
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        else:
            raise ValueError(f"不支持的文件格式: {ext}")

        return self._dataframe_to_records(df, record_type)

    def _dataframe_to_records(self, df: pd.DataFrame, record_type: RecordType) -> List[Dict[str, Any]]:
        records = []
        column_mapping = self._get_column_mapping(record_type)

        for _, row in df.iterrows():
            record = {}
            for src_col, target_key in column_mapping.items():
                if src_col in df.columns:
                    record[target_key] = row[src_col]

            if "record_time" not in record or pd.isna(record.get("record_time")):
                record["record_time"] = datetime.utcnow()

            records.append(record)

        return records

    def _get_column_mapping(self, record_type: RecordType) -> Dict[str, str]:
        mappings = {
            RecordType.INVENTORY: {
                "柜机ID": "cabinet_id",
                "格口ID": "cell_id",
                "商品ID": "sku_id",
                "商品名称": "sku_name",
                "库存数量": "quantity",
                "是否热销格口": "is_hot_cell",
                "记录时间": "record_time",
            },
            RecordType.REPLENISHMENT: {
                "柜机ID": "cabinet_id",
                "格口ID": "cell_id",
                "照片URL": "photo_url",
                "照片哈希": "photo_hash",
                "补货数量": "replenishment_quantity",
                "操作员ID": "operator_id",
                "记录时间": "record_time",
            },
            RecordType.REFUND: {
                "柜机ID": "cabinet_id",
                "订单ID": "order_id",
                "用户ID": "user_id",
                "商品ID": "sku_id",
                "退款金额": "refund_amount",
                "退款原因": "refund_reason",
                "记录时间": "record_time",
            },
            RecordType.PRICE_ADJUSTMENT: {
                "柜机ID": "cabinet_id",
                "格口ID": "cell_id",
                "商品ID": "sku_id",
                "原价": "original_price",
                "新价": "new_price",
                "操作员ID": "operator_id",
                "审批备注": "approval_note",
                "记录时间": "record_time",
            },
        }
        return mappings.get(record_type, {})
