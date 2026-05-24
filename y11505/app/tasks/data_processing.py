from typing import Dict, Any
from sqlalchemy.orm import Session
import time
import random

from app.core.database import SessionLocal
from app.models import Batch, InspectionRecord
from app.services.device_status_linker import DeviceStatusLinkerService
from app.services.batch_service import BatchService


class DataProcessingTask:
    def __init__(self):
        pass
    
    @staticmethod
    def process_batch_import(payload: Dict[str, Any]) -> Dict[str, Any]:
        batch_id = payload.get("batch_id")
        if not batch_id:
            raise ValueError("batch_id is required")
        
        db = SessionLocal()
        try:
            batch = db.query(Batch).filter(Batch.id == batch_id).first()
            if not batch:
                raise ValueError(f"Batch not found: {batch_id}")
            
            time.sleep(1)
            
            linker = DeviceStatusLinkerService(db)
            updated_count = linker.batch_check_expired_certificates()
            
            batch_service = BatchService(db)
            batch_service.update_batch_stats(batch)
            
            db.commit()
            
            return {
                "batch_id": batch_id,
                "certificates_updated": updated_count,
                "status": "completed",
            }
        finally:
            db.close()
    
    @staticmethod
    def validate_batch_data(payload: Dict[str, Any]) -> Dict[str, Any]:
        batch_id = payload.get("batch_id")
        if not batch_id:
            raise ValueError("batch_id is required")
        
        db = SessionLocal()
        try:
            batch = db.query(Batch).filter(Batch.id == batch_id).first()
            if not batch:
                raise ValueError(f"Batch not found: {batch_id}")
            
            records = (
                db.query(InspectionRecord)
                .filter(InspectionRecord.batch_id == batch_id, InspectionRecord.is_deleted == False)
                .all()
            )
            
            errors = []
            for record in records:
                if not record.device_code:
                    errors.append(f"Record {record.record_no}: missing device_code")
                if not record.inspection_date:
                    errors.append(f"Record {record.record_no}: missing inspection_date")
            
            if random.random() < 0.1:
                raise RuntimeError("模拟随机失败: 网络连接超时")
            
            return {
                "batch_id": batch_id,
                "total_records": len(records),
                "errors": errors,
                "is_valid": len(errors) == 0,
            }
        finally:
            db.close()
    
    @staticmethod
    def simulate_failure(payload: Dict[str, Any]) -> Dict[str, Any]:
        failure_type = payload.get("failure_type", "transient")
        current_attempt = payload.get("current_attempt", 1)
        
        if failure_type == "permanent":
            raise RuntimeError("永久失败: 数据格式错误，无法自动修复")
        elif failure_type == "manual":
            if current_attempt >= 2:
                raise RuntimeError("需要人工干预: 数据存在歧义，请人工确认")
            else:
                raise RuntimeError("临时错误，正在重试...")
        else:
            if current_attempt < 2:
                raise RuntimeError("临时网络错误，重试中...")
            
            return {
                "status": "success",
                "message": "重试成功，数据已处理",
                "attempts": current_attempt,
            }
