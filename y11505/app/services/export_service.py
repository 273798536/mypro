from typing import Dict, Any, List
from sqlalchemy.orm import Session
import pandas as pd
from datetime import datetime
from pathlib import Path

from app.core.config import settings
from app.models import (
    Batch,
    InspectionRecord,
    CalibrationCertificate,
    RepairQuote,
    StatusHistory,
    AuditLog,
)
from app.core.constants import RecordStatus, BatchStatus


class ExportService:
    def __init__(self, db: Session):
        self.db = db
    
    def generate_batch_summary(self, batch: Batch) -> Dict[str, Any]:
        records = (
            self.db.query(InspectionRecord)
            .filter(InspectionRecord.batch_id == batch.id, InspectionRecord.is_deleted == False)
            .all()
        )
        
        status_counts = {}
        for record in records:
            status = record.status
            status_counts[status] = status_counts.get(status, 0) + 1
        
        summary = {
            "batch_no": batch.batch_no,
            "batch_name": batch.name,
            "department": batch.department,
            "operator": batch.operator,
            "current_status": batch.status,
            "status_before_freeze": batch.status_before_freeze,
            "freeze_reason": batch.freeze_reason,
            "freeze_operator": batch.freeze_operator,
            "freeze_time": batch.freeze_time.isoformat() if batch.freeze_time else None,
            "record_count": batch.record_count,
            "abnormal_count": batch.abnormal_count,
            "status_distribution": status_counts,
            "created_at": batch.created_at.isoformat(),
            "updated_at": batch.updated_at.isoformat(),
        }
        
        return summary
    
    def generate_batch_details(self, batch: Batch) -> Dict[str, Any]:
        records = (
            self.db.query(InspectionRecord)
            .filter(InspectionRecord.batch_id == batch.id, InspectionRecord.is_deleted == False)
            .all()
        )
        
        record_details = []
        for record in records:
            record_details.append({
                "record_no": record.record_no,
                "device_code": record.device_code,
                "device_name": record.device_name,
                "inspection_date": record.inspection_date.isoformat() if record.inspection_date else None,
                "inspector": record.inspector,
                "inspection_result": record.inspection_result,
                "status": record.status,
                "abnormal_description": record.abnormal_description,
                "manual_reason": record.manual_reason,
                "manual_operator": record.manual_operator,
                "manual_time": record.manual_time.isoformat() if record.manual_time else None,
                "version": record.version,
            })
        
        certificates = (
            self.db.query(CalibrationCertificate)
            .filter(CalibrationCertificate.batch_id == batch.id, CalibrationCertificate.is_deleted == False)
            .all()
        )
        
        cert_details = []
        for cert in certificates:
            cert_details.append({
                "certificate_no": cert.certificate_no,
                "device_code": cert.device_code,
                "device_name": cert.device_name,
                "calibration_agency": cert.calibration_agency,
                "expiry_date": cert.expiry_date.isoformat() if cert.expiry_date else None,
                "is_expired": cert.is_expired,
                "is_valid": cert.is_valid,
                "version": cert.version,
            })
        
        quotes = (
            self.db.query(RepairQuote)
            .filter(RepairQuote.batch_id == batch.id, RepairQuote.is_deleted == False)
            .all()
        )
        
        quote_details = []
        for quote in quotes:
            quote_details.append({
                "quote_no": quote.quote_no,
                "device_code": quote.device_code,
                "device_name": quote.device_name,
                "fault_description": quote.fault_description,
                "quote_amount": quote.quote_amount,
                "quote_status": quote.quote_status,
                "version": quote.version,
            })
        
        return {
            "inspection_records": record_details,
            "calibration_certificates": cert_details,
            "repair_quotes": quote_details,
        }
    
    def generate_status_history(self, batch: Batch) -> List[Dict[str, Any]]:
        histories = (
            self.db.query(StatusHistory)
            .filter(StatusHistory.batch_id == batch.id)
            .order_by(StatusHistory.change_time.asc())
            .all()
        )
        
        return [
            {
                "record_type": h.record_type,
                "record_id": h.record_id,
                "from_status": h.from_status,
                "to_status": h.to_status,
                "change_reason": h.change_reason,
                "operator": h.operator,
                "change_time": h.change_time.isoformat(),
            }
            for h in histories
        ]
    
    def generate_audit_logs(self, batch: Batch) -> List[Dict[str, Any]]:
        logs = (
            self.db.query(AuditLog)
            .filter(AuditLog.batch_id == batch.id)
            .order_by(AuditLog.operation_time.asc())
            .all()
        )
        
        return [
            {
                "operation_type": l.operation_type,
                "record_type": l.record_type,
                "record_id": l.record_id,
                "operator": l.operator,
                "operation_time": l.operation_time.isoformat(),
                "change_reason": l.change_reason,
                "before_data": l.before_data,
                "after_data": l.after_data,
            }
            for l in logs
        ]
    
    def export_to_excel(self, batch: Batch, operator: str) -> str:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"batch_{batch.batch_no}_{timestamp}.xlsx"
        filepath = settings.EXPORT_DIR / filename
        
        summary = self.generate_batch_summary(batch)
        details = self.generate_batch_details(batch)
        history = self.generate_status_history(batch)
        audits = self.generate_audit_logs(batch)
        
        with pd.ExcelWriter(filepath, engine="openpyxl") as writer:
            pd.DataFrame([summary]).T.to_excel(writer, sheet_name="汇总", header=False)
            
            if details["inspection_records"]:
                pd.DataFrame(details["inspection_records"]).to_excel(writer, sheet_name="巡检记录", index=False)
            
            if details["calibration_certificates"]:
                pd.DataFrame(details["calibration_certificates"]).to_excel(writer, sheet_name="校准证书", index=False)
            
            if details["repair_quotes"]:
                pd.DataFrame(details["repair_quotes"]).to_excel(writer, sheet_name="维修报价", index=False)
            
            if history:
                pd.DataFrame(history).to_excel(writer, sheet_name="状态流转", index=False)
            
            if audits:
                pd.DataFrame(audits).to_excel(writer, sheet_name="审计日志", index=False)
        
        return str(filepath)
    
    def export_for_head_nurse(self, batch: Batch, operator: str) -> Dict[str, Any]:
        summary = self.generate_batch_summary(batch)
        
        records = (
            self.db.query(InspectionRecord)
            .filter(InspectionRecord.batch_id == batch.id, InspectionRecord.is_deleted == False)
            .order_by(InspectionRecord.status)
            .all()
        )
        
        abnormal_records = []
        for r in records:
            if r.status != RecordStatus.NORMAL:
                abnormal_records.append({
                    "device_code": r.device_code,
                    "device_name": r.device_name,
                    "status": r.status,
                    "inspection_result": r.inspection_result,
                    "abnormal_description": r.abnormal_description,
                    "manual_reason": r.manual_reason,
                    "manual_operator": r.manual_operator,
                })
        
        freeze_info = {
            "status_before_freeze": summary["status_before_freeze"],
            "current_status": summary["current_status"],
            "freeze_reason": summary["freeze_reason"],
            "freeze_operator": summary["freeze_operator"],
            "freeze_time": summary["freeze_time"],
        }
        
        return {
            "batch_info": {
                "batch_no": summary["batch_no"],
                "batch_name": summary["batch_name"],
                "department": summary["department"],
            },
            "freeze_info": freeze_info,
            "statistics": {
                "total_records": summary["record_count"],
                "abnormal_count": summary["abnormal_count"],
                "status_distribution": summary["status_distribution"],
            },
            "abnormal_records": abnormal_records,
            "export_time": datetime.now().isoformat(),
            "export_operator": operator,
        }
