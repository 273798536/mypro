import json
import uuid
import hashlib
import os
import pandas as pd
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session

from app.models import ImportBatch, TellerSchedule, LeaveRequest, BusinessForecast, PriceAdjustment, ShiftRecord
from app.config import settings
from app.services.task_service import TaskService, FAILURE_CATEGORY_WAITING_MANUAL

DATA_TYPE_MAP = {
    "schedule": TellerSchedule,
    "leave": LeaveRequest,
    "forecast": BusinessForecast,
    "adjustment": PriceAdjustment,
    "record": ShiftRecord,
}

ID_FIELD_MAP = {
    "schedule": "schedule_id",
    "leave": "leave_id",
    "forecast": "forecast_id",
    "adjustment": "adjustment_id",
    "record": "record_id",
}

class ImportService:
    @staticmethod
    def calculate_file_hash(file_path: str) -> str:
        hash_sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_sha256.update(chunk)
        return hash_sha256.hexdigest()

    @staticmethod
    def check_duplicate_import(db: Session, file_hash: str, data_type: str) -> Tuple[bool, Optional[ImportBatch]]:
        batch = (
            db.query(ImportBatch)
            .filter(ImportBatch.source_file_hash == file_hash)
            .filter(ImportBatch.data_type == data_type)
            .filter(ImportBatch.status == "completed")
            .first()
        )
        return batch is not None, batch

    @staticmethod
    def create_batch(
        db: Session,
        data_type: str,
        source_file_name: str,
        source_file_path: str,
        created_by: str,
    ) -> ImportBatch:
        file_hash = ImportService.calculate_file_hash(source_file_path)
        
        is_duplicate, existing_batch = ImportService.check_duplicate_import(db, file_hash, data_type)
        if is_duplicate:
            raise ValueError(f"文件已存在相同批次导入: {existing_batch.batch_id}")
        
        batch = ImportBatch(
            batch_id=f"BATCH_{uuid.uuid4().hex[:16]}",
            batch_name=f"{data_type}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            data_type=data_type,
            source_file_name=source_file_name,
            source_file_hash=file_hash,
            source_file_path=source_file_path,
            status="processing",
            created_by=created_by,
        )
        db.add(batch)
        db.commit()
        db.refresh(batch)
        return batch

    @staticmethod
    def read_file(file_path: str) -> pd.DataFrame:
        if file_path.endswith(".xlsx") or file_path.endswith(".xls"):
            return pd.read_excel(file_path)
        elif file_path.endswith(".csv"):
            return pd.read_csv(file_path)
        else:
            raise ValueError("不支持的文件格式")

    @staticmethod
    def parse_row(raw_row: Dict, data_type: str) -> Dict:
        parsed = {}
        raw_str = json.dumps(raw_row, ensure_ascii=False)
        
        if data_type == "schedule":
            parsed = {
                "schedule_id": str(raw_row.get("排班ID", raw_row.get("schedule_id", ""))),
                "branch_id": str(raw_row.get("网点ID", raw_row.get("branch_id", ""))),
                "branch_name": str(raw_row.get("网点名称", raw_row.get("branch_name", ""))),
                "teller_id": str(raw_row.get("柜员ID", raw_row.get("teller_id", ""))),
                "teller_name": str(raw_row.get("柜员姓名", raw_row.get("teller_name", ""))),
                "schedule_date": raw_row.get("排班日期", raw_row.get("schedule_date")),
                "shift_type": str(raw_row.get("班次类型", raw_row.get("shift_type", ""))),
                "window_number": str(raw_row.get("窗口号", raw_row.get("window_number", ""))),
                "start_time": raw_row.get("开始时间", raw_row.get("start_time")),
                "end_time": raw_row.get("结束时间", raw_row.get("end_time")),
                "break_start": raw_row.get("午休开始", raw_row.get("break_start")),
                "break_end": raw_row.get("午休结束", raw_row.get("break_end")),
                "is_temporary": bool(raw_row.get("是否临时", raw_row.get("is_temporary", False))),
                "temporary_reason": str(raw_row.get("临时原因", raw_row.get("temporary_reason", ""))),
            }
        elif data_type == "leave":
            parsed = {
                "leave_id": str(raw_row.get("请假单ID", raw_row.get("leave_id", ""))),
                "branch_id": str(raw_row.get("网点ID", raw_row.get("branch_id", ""))),
                "branch_name": str(raw_row.get("网点名称", raw_row.get("branch_name", ""))),
                "teller_id": str(raw_row.get("柜员ID", raw_row.get("teller_id", ""))),
                "teller_name": str(raw_row.get("柜员姓名", raw_row.get("teller_name", ""))),
                "leave_type": str(raw_row.get("请假类型", raw_row.get("leave_type", ""))),
                "start_date": raw_row.get("开始日期", raw_row.get("start_date")),
                "end_date": raw_row.get("结束日期", raw_row.get("end_date")),
                "leave_days": int(raw_row.get("请假天数", raw_row.get("leave_days", 0)) or 0),
                "reason": str(raw_row.get("请假原因", raw_row.get("reason", ""))),
                "is_training": bool(raw_row.get("是否培训", raw_row.get("is_training", False))),
                "training_location": str(raw_row.get("培训地点", raw_row.get("training_location", ""))),
            }
        elif data_type == "forecast":
            parsed = {
                "forecast_id": str(raw_row.get("预测ID", raw_row.get("forecast_id", ""))),
                "branch_id": str(raw_row.get("网点ID", raw_row.get("branch_id", ""))),
                "branch_name": str(raw_row.get("网点名称", raw_row.get("branch_name", ""))),
                "forecast_date": raw_row.get("预测日期", raw_row.get("forecast_date")),
                "time_slot": str(raw_row.get("时间段", raw_row.get("time_slot", ""))),
                "customer_count": int(raw_row.get("预测客户数", raw_row.get("customer_count", 0)) or 0),
                "transaction_count": int(raw_row.get("预测业务笔数", raw_row.get("transaction_count", 0)) or 0),
                "window_demand": float(raw_row.get("窗口需求", raw_row.get("window_demand", 0)) or 0),
                "service_type": str(raw_row.get("业务类型", raw_row.get("service_type", ""))),
            }
        elif data_type == "adjustment":
            parsed = {
                "adjustment_id": str(raw_row.get("改价ID", raw_row.get("adjustment_id", ""))),
                "branch_id": str(raw_row.get("网点ID", raw_row.get("branch_id", ""))),
                "branch_name": str(raw_row.get("网点名称", raw_row.get("branch_name", ""))),
                "effective_date": raw_row.get("生效日期", raw_row.get("effective_date")),
                "service_item": str(raw_row.get("服务项目", raw_row.get("service_item", ""))),
                "original_price": float(raw_row.get("原价", raw_row.get("original_price", 0)) or 0),
                "adjusted_price": float(raw_row.get("调整后价格", raw_row.get("adjusted_price", 0)) or 0),
                "adjustment_reason": str(raw_row.get("调整原因", raw_row.get("adjustment_reason", ""))),
                "is_manual": bool(raw_row.get("是否手工", raw_row.get("is_manual", True))),
            }
        elif data_type == "record":
            parsed = {
                "record_id": str(raw_row.get("记录ID", raw_row.get("record_id", ""))),
                "branch_id": str(raw_row.get("网点ID", raw_row.get("branch_id", ""))),
                "branch_name": str(raw_row.get("网点名称", raw_row.get("branch_name", ""))),
                "teller_id": str(raw_row.get("柜员ID", raw_row.get("teller_id", ""))),
                "teller_name": str(raw_row.get("柜员姓名", raw_row.get("teller_name", ""))),
                "record_date": raw_row.get("记录日期", raw_row.get("record_date")),
                "window_number": str(raw_row.get("窗口号", raw_row.get("window_number", ""))),
                "actual_start_time": raw_row.get("实际签到", raw_row.get("actual_start_time")),
                "actual_end_time": raw_row.get("实际签退", raw_row.get("actual_end_time")),
                "transaction_count": int(raw_row.get("业务笔数", raw_row.get("transaction_count", 0)) or 0),
            }
        
        return {"raw": raw_str, "parsed": parsed}

    @staticmethod
    def import_data(
        db: Session,
        batch: ImportBatch,
        df: pd.DataFrame,
        source_file_name: str,
        operator: str,
        task=None,
    ) -> Dict:
        model_class = DATA_TYPE_MAP[batch.data_type]
        id_field = ID_FIELD_MAP[batch.data_type]
        
        success_count = 0
        failed_count = 0
        skipped_count = 0
        failed_rows = []
        
        total_rows = len(df)
        
        for idx, row in df.iterrows():
            row_num = idx + 2
            try:
                raw_row = row.to_dict()
                parsed_result = ImportService.parse_row(raw_row, batch.data_type)
                
                entity_id = parsed_result["parsed"].get(id_field)
                if not entity_id:
                    entity_id = f"{batch.data_type}_{uuid.uuid4().hex[:12]}"
                    parsed_result["parsed"][id_field] = entity_id
                
                existing = (
                    db.query(model_class)
                    .filter(getattr(model_class, id_field) == entity_id)
                    .first()
                )
                
                if existing:
                    skipped_count += 1
                    continue
                
                entity = model_class(
                    **parsed_result["parsed"],
                    source_file=source_file_name,
                    source_row_number=row_num,
                    raw_value=parsed_result["raw"],
                    parsed_value=json.dumps(parsed_result["parsed"], ensure_ascii=False),
                    import_batch_id=batch.batch_id,
                    status="imported",
                    status_updated_by=operator,
                    status_reason="数据导入完成",
                )
                
                db.add(entity)
                success_count += 1
                
                if task and success_count % 10 == 0:
                    progress = int((idx + 1) / total_rows * 100)
                    TaskService.update_progress(
                        db, task, progress,
                        f"已处理 {idx + 1}/{total_rows} 行，成功 {success_count} 条"
                    )
                
            except Exception as e:
                failed_count += 1
                failed_rows.append({"row": row_num, "error": str(e)})
                continue
        
        db.commit()
        
        batch.total_rows = total_rows
        batch.success_rows = success_count
        batch.failed_rows = failed_count
        batch.skipped_rows = skipped_count
        batch.status = "completed" if failed_count == 0 else "completed_with_errors"
        batch.completed_at = datetime.now()
        
        if failed_rows:
            batch.error_message = json.dumps({"failed_rows": failed_rows}, ensure_ascii=False)
        
        db.commit()
        db.refresh(batch)
        
        return {
            "batch_id": batch.batch_id,
            "total": total_rows,
            "success": success_count,
            "failed": failed_count,
            "skipped": skipped_count,
            "failed_rows": failed_rows,
        }
