from sqlalchemy.orm import Session
from typing import Dict, Any, List
import pandas as pd
from io import BytesIO

from app.models import (
    Batch, MaterialItem, BorrowRecord, DeviceTracking,
    StateRecord, MaterialStatus, AuditLog, OperationType
)
from app.schemas import BatchReportResponse, ReportItem


class ReportService:
    @staticmethod
    def get_batch_report(db: Session, batch: Batch) -> BatchReportResponse:
        items = []
        status_before_freeze_map = {}
        manual_reasons = {}
        
        if batch.is_frozen or batch.frozen_at:
            freeze_snapshots = db.query(StateRecord).filter(
                StateRecord.batch_id == batch.id,
                StateRecord.is_freeze_snapshot == True
            ).all()
            for snap in freeze_snapshots:
                status_before_freeze_map[snap.material_id] = snap.to_status
        
        manual_state_records = db.query(StateRecord).filter(
            StateRecord.batch_id == batch.id,
            StateRecord.material_id.isnot(None),
            StateRecord.is_freeze_snapshot == False,
            StateRecord.change_source.notin_(["logistics_import", "borrow_import", "freeze"])
        ).order_by(StateRecord.changed_at.asc()).all()
        for sr in manual_state_records:
            existing = manual_reasons.get(sr.material_id)
            if existing:
                manual_reasons[sr.material_id] = existing + "\n" + sr.reason
            else:
                manual_reasons[sr.material_id] = sr.reason
        
        manual_audits = db.query(AuditLog).filter(
            AuditLog.batch_id == batch.id,
            AuditLog.operation_type.in_([OperationType.REVIEW, OperationType.OVERRULE])
        ).order_by(AuditLog.operated_at.asc()).all()
        for audit in manual_audits:
            if audit.record_id and audit.record_type == "material":
                existing = manual_reasons.get(audit.record_id)
                if existing and audit.change_reason not in existing:
                    manual_reasons[audit.record_id] = existing + "\n" + audit.change_reason
                elif not existing:
                    manual_reasons[audit.record_id] = audit.change_reason
        
        for material in batch.materials:
            borrow_record = db.query(BorrowRecord).filter(
                BorrowRecord.batch_id == batch.id,
                BorrowRecord.material_id == material.id,
                BorrowRecord.is_returned == False
            ).first()
            
            device_tracking = None
            if borrow_record:
                device_tracking = db.query(DeviceTracking).filter(
                    DeviceTracking.borrow_record_id == borrow_record.id
                ).first()
            
            status_before = status_before_freeze_map.get(material.id)
            status_after = None
            
            if status_before:
                post_freeze_states = db.query(StateRecord).filter(
                    StateRecord.batch_id == batch.id,
                    StateRecord.material_id == material.id,
                    StateRecord.changed_at >= batch.frozen_at
                ).order_by(StateRecord.changed_at.asc()).all()
                if post_freeze_states:
                    status_after = post_freeze_states[-1].to_status
            
            item = ReportItem(
                material_code=material.material_code,
                material_name=material.material_name,
                status_before_freeze=status_before,
                status_after_freeze=status_after,
                current_status=material.status,
                borrower=borrow_record.borrower if borrow_record else None,
                last_location=device_tracking.last_known_location if device_tracking else None,
                responsible_person=device_tracking.responsible_person if device_tracking else None,
                manual_reason=manual_reasons.get(material.id),
                final_disposition=device_tracking.final_disposition if device_tracking else None
            )
            items.append(item)
        
        summary = ReportService._calculate_summary(items)
        
        return BatchReportResponse(
            batch_no=batch.batch_no,
            exhibition_name=batch.exhibition_name,
            is_frozen=batch.is_frozen,
            frozen_at=batch.frozen_at,
            frozen_reason=batch.frozen_reason,
            items=items,
            summary=summary
        )

    @staticmethod
    def _calculate_summary(items: List[ReportItem]) -> Dict[str, Any]:
        summary = {
            "total_items": len(items),
            "status_counts": {},
            "lost_count": 0,
            "borrowed_count": 0,
            "need_manual_attention": 0,
            "with_responsible_person": 0,
            "with_final_disposition": 0
        }
        
        for item in items:
            status = item.current_status
            summary["status_counts"][status] = summary["status_counts"].get(status, 0) + 1
            
            if status == MaterialStatus.LOST:
                summary["lost_count"] += 1
            if status == MaterialStatus.BORROWED:
                summary["borrowed_count"] += 1
            if item.manual_reason:
                summary["need_manual_attention"] += 1
            if item.responsible_person:
                summary["with_responsible_person"] += 1
            if item.final_disposition:
                summary["with_final_disposition"] += 1
        
        return summary

    @staticmethod
    def export_report_to_excel(db: Session, batch: Batch) -> BytesIO:
        report = ReportService.get_batch_report(db, batch)
        
        output = BytesIO()
        
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            summary_data = {
                "项目": [
                    "批次号",
                    "展会名称",
                    "是否冻结",
                    "冻结时间",
                    "冻结原因",
                    "物料总数",
                    "丢失数量",
                    "借出未还数量",
                    "需要人工关注数量",
                    "已落实责任人数量",
                    "已有最终去向数量"
                ],
                "值": [
                    report.batch_no,
                    report.exhibition_name,
                    "是" if report.is_frozen else "否",
                    str(report.frozen_at) if report.frozen_at else "",
                    report.frozen_reason or "",
                    str(report.summary["total_items"]),
                    str(report.summary["lost_count"]),
                    str(report.summary["borrowed_count"]),
                    str(report.summary["need_manual_attention"]),
                    str(report.summary["with_responsible_person"]),
                    str(report.summary["with_final_disposition"])
                ]
            }
            df_summary = pd.DataFrame(summary_data)
            df_summary.to_excel(writer, sheet_name="汇总", index=False)
            
            detail_data = []
            for item in report.items:
                detail_data.append({
                    "物料编码": item.material_code,
                    "物料名称": item.material_name,
                    "冻结前状态": item.status_before_freeze or "",
                    "冻结后状态": item.status_after_freeze or "",
                    "当前状态": item.current_status,
                    "借用人": item.borrower or "",
                    "最后位置": item.last_location or "",
                    "责任人": item.responsible_person or "",
                    "人工理由": item.manual_reason or "",
                    "最终去向": item.final_disposition or ""
                })
            df_detail = pd.DataFrame(detail_data)
            df_detail.to_excel(writer, sheet_name="明细", index=False)
        
        output.seek(0)
        return output

    @staticmethod
    def get_audit_log_excel(db: Session, batch_id: int) -> BytesIO:
        from app.services.audit_service import AuditService
        
        logs = AuditService.get_batch_audit_logs(db, batch_id, limit=1000)
        
        output = BytesIO()
        
        log_data = []
        for log in logs:
            log_data.append({
                "时间": str(log.operated_at),
                "操作人": log.operated_by or "",
                "操作类型": log.operation_type,
                "记录类型": log.record_type or "",
                "记录ID": log.record_id or "",
                "变更原因": log.change_reason or "",
                "变更前": str(log.before_data) if log.before_data else "",
                "变更后": str(log.after_data) if log.after_data else ""
            })
        
        df = pd.DataFrame(log_data)
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name="审计日志", index=False)
        
        output.seek(0)
        return output
