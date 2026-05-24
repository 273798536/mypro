import uuid
import pandas as pd
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from .models import Batch, Package, AuditLog
from .config import settings


class ExportService:
    def __init__(self, db: Session):
        self.db = db

    def export_batch_summary(
        self,
        batch: Batch,
        include_history: bool = True,
        include_packages: bool = True
    ) -> Dict[str, Any]:
        summary = {
            "batch_summary": {
                "batch_no": batch.batch_no,
                "current_status": batch.status.value,
                "source_type": batch.source_type,
                "customs_code": batch.customs_code,
                "total_packages": batch.total_packages,
                "total_tax_amount": batch.total_tax_amount,
                "created_at": batch.created_at.isoformat(),
                "created_by": batch.created_by,
                "frozen": {
                    "is_frozen": batch.status == batch.status.SETTLEMENT_FROZEN,
                    "frozen_at": batch.frozen_at.isoformat() if batch.frozen_at else None,
                    "frozen_by": batch.frozen_by,
                    "frozen_reason": batch.frozen_reason,
                    "status_before_frozen": batch.status_before_frozen
                },
                "manual_remark": batch.manual_remark
            }
        }

        if include_packages:
            packages = self.db.query(Package).filter(Package.batch_id == batch.id).all()
            summary["packages"] = [
                {
                    "package_no": p.package_no,
                    "waybill_no": p.waybill_no,
                    "declared_value": p.declared_value,
                    "tax_amount": p.tax_amount,
                    "is_abnormal": p.is_abnormal,
                    "abnormal_reason": p.abnormal_reason,
                    "source": p.source.value if p.source else None
                }
                for p in packages
            ]

            abnormal_packages = [p for p in packages if p.is_abnormal]
            summary["package_statistics"] = {
                "total": len(packages),
                "normal": len(packages) - len(abnormal_packages),
                "abnormal": len(abnormal_packages),
                "abnormal_rate": len(abnormal_packages) / len(packages) if packages else 0
            }

        if include_history:
            history = (
                self.db.query(AuditLog)
                .filter(AuditLog.batch_id == batch.id)
                .order_by(AuditLog.changed_at.asc())
                .all()
            )
            summary["change_history"] = [
                {
                    "timestamp": log.changed_at.isoformat(),
                    "action": log.action,
                    "user": log.changed_by,
                    "old_status": log.old_status,
                    "new_status": log.new_status,
                    "reason": log.reason,
                    "changes": log.changes
                }
                for log in history
            ]

            status_transitions = [
                h for h in summary["change_history"]
                if h["action"] == "status_transition"
            ]
            summary["status_timeline"] = status_transitions

        return summary

    def export_to_excel(
        self,
        batch: Batch,
        output_dir: Optional[Path] = None,
        include_history: bool = True,
        include_packages: bool = True
    ) -> Dict[str, Any]:
        if output_dir is None:
            output_dir = settings.DATA_DIR / "exports"
            output_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_name = f"batch_{batch.batch_no}_{timestamp}.xlsx"
        file_path = output_dir / file_name

        with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
            summary_data = {
                "项目": ["批次号", "当前状态", "来源类型", "关区代码", "包裹总数", "税费总额", "创建时间", "创建人"],
                "内容": [
                    batch.batch_no,
                    batch.status.value,
                    batch.source_type or "",
                    batch.customs_code or "",
                    batch.total_packages,
                    batch.total_tax_amount,
                    batch.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                    batch.created_by
                ]
            }
            pd.DataFrame(summary_data).to_excel(writer, sheet_name='批次概览', index=False)

            if batch.status == batch.status.SETTLEMENT_FROZEN:
                freeze_data = {
                    "项目": ["是否冻结", "冻结时间", "冻结人", "冻结原因", "冻结前状态"],
                    "内容": [
                        "是",
                        batch.frozen_at.strftime("%Y-%m-%d %H:%M:%S") if batch.frozen_at else "",
                        batch.frozen_by or "",
                        batch.frozen_reason or "",
                        batch.status_before_frozen or ""
                    ]
                }
                pd.DataFrame(freeze_data).to_excel(writer, sheet_name='冻结信息', index=False)

            if include_packages:
                packages = self.db.query(Package).filter(Package.batch_id == batch.id).all()
                if packages:
                    pkg_data = [{
                        "包裹号": p.package_no,
                        "运单号": p.waybill_no or "",
                        "申报价值": p.declared_value or 0,
                        "税费金额": p.tax_amount or 0,
                        "是否异常": "是" if p.is_abnormal else "否",
                        "异常原因": p.abnormal_reason or "",
                        "数据来源": p.source.value if p.source else ""
                    } for p in packages]
                    pd.DataFrame(pkg_data).to_excel(writer, sheet_name='包裹明细', index=False)

            if include_history:
                history = (
                    self.db.query(AuditLog)
                    .filter(AuditLog.batch_id == batch.id)
                    .order_by(AuditLog.changed_at.asc())
                    .all()
                )
                if history:
                    hist_data = [{
                        "时间": log.changed_at.strftime("%Y-%m-%d %H:%M:%S"),
                        "操作": log.action,
                        "操作人": log.changed_by,
                        "原状态": log.old_status or "",
                        "新状态": log.new_status or "",
                        "原因": log.reason or ""
                    } for log in history]
                    pd.DataFrame(hist_data).to_excel(writer, sheet_name='变更历史', index=False)

        file_size = file_path.stat().st_size

        return {
            "file_path": str(file_path),
            "file_name": file_name,
            "file_size": file_size,
            "created_at": datetime.now()
        }

    def export_multiple_batches(
        self,
        batches: list,
        output_dir: Optional[Path] = None
    ) -> Dict[str, Any]:
        if output_dir is None:
            output_dir = settings.DATA_DIR / "exports"
            output_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_name = f"batches_summary_{timestamp}.xlsx"
        file_path = output_dir / file_name

        all_batches_data = []
        for batch in batches:
            all_batches_data.append({
                "批次号": batch.batch_no,
                "当前状态": batch.status.value,
                "包裹总数": batch.total_packages,
                "税费总额": batch.total_tax_amount,
                "创建时间": batch.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "创建人": batch.created_by,
                "是否冻结": "是" if batch.status == batch.status.SETTLEMENT_FROZEN else "否",
                "冻结原因": batch.frozen_reason or "",
                "人工备注": batch.manual_remark or ""
            })

        with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
            pd.DataFrame(all_batches_data).to_excel(writer, sheet_name='批次汇总', index=False)

        file_size = file_path.stat().st_size

        return {
            "file_path": str(file_path),
            "file_name": file_name,
            "file_size": file_size,
            "created_at": datetime.now(),
            "batch_count": len(batches)
        }
