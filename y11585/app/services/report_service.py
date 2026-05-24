from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.config import settings
from app.models.base import Batch, Contract, AuditLog, OperationType
from app.schemas.contract import ExportRequest, SummaryResponse


class ReportService:
    def __init__(self, db: Session):
        self.db = db

    def get_batch_summary(self, batch_id: int) -> SummaryResponse:
        batch = self.db.query(Batch).filter(Batch.id == batch_id).first()
        if not batch:
            raise ValueError(f"Batch {batch_id} not found")

        contracts = self.db.query(Contract).filter(Contract.batch_id == batch_id).all()
        
        total_contracts = len(contracts)
        frozen_contracts = sum(1 for c in contracts if c.is_frozen)
        archived_contracts = sum(1 for c in contracts if c.is_archived)
        total_amount = sum(c.total_amount or 0 for c in contracts)
        frozen_amount = sum(c.total_amount or 0 for c in contracts if c.is_frozen)

        manual_reasons = []
        audit_logs = self.db.query(AuditLog).filter(
            AuditLog.batch_id == batch_id,
            AuditLog.operation_type.in_([
                OperationType.FREEZE,
                OperationType.REVIEW_APPROVE,
                OperationType.REVIEW_REJECT,
                OperationType.SUPPLEMENT
            ])
        ).all()

        for log in audit_logs:
            manual_reasons.append({
                "operation_type": log.operation_type.value,
                "operation_by": log.operation_by,
                "operation_at": log.operation_at.isoformat(),
                "contract_id": log.contract_id,
                "change_reason": log.change_reason,
                "comment": log.comment
            })

        return SummaryResponse(
            batch_id=batch.id,
            batch_name=batch.name,
            total_contracts=total_contracts,
            frozen_contracts=frozen_contracts,
            archived_contracts=archived_contracts,
            total_amount=total_amount,
            frozen_amount=frozen_amount,
            manual_reasons=manual_reasons
        )

    def export_to_excel(self, request: ExportRequest, export_by: str) -> Dict[str, Any]:
        import pandas as pd
        
        query = self.db.query(Contract)
        if request.batch_id:
            query = query.filter(Contract.batch_id == request.batch_id)
        if request.contract_ids:
            query = query.filter(Contract.id.in_(request.contract_ids))
        if not request.include_frozen:
            query = query.filter(Contract.is_frozen == False)
        if not request.include_archived:
            query = query.filter(Contract.is_archived == False)
        
        contracts = query.all()
        
        contract_data = []
        for contract in contracts:
            contract_data.append({
                "合同编号": contract.contract_no,
                "合同名称": contract.contract_name,
                "甲方": contract.party_a,
                "乙方": contract.party_b,
                "合同金额": contract.total_amount,
                "版本": contract.version,
                "是否冻结": "是" if contract.is_frozen else "否",
                "冻结原因": contract.frozen_reason or "",
                "冻结人": contract.frozen_by or "",
                "是否归档": "是" if contract.is_archived else "否",
                "创建时间": contract.created_at.isoformat()
            })
        
        export_dir = settings.EXPORT_DIR
        export_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"contract_export_{timestamp}.xlsx"
        filepath = export_dir / filename
        
        df_contracts = pd.DataFrame(contract_data)
        
        freeze_changes = []
        for contract in contracts:
            audit_logs = self.db.query(AuditLog).filter(
                AuditLog.contract_id == contract.id,
                AuditLog.operation_type == OperationType.FREEZE
            ).all()
            
            for log in audit_logs:
                before = log.before_state or {}
                after = log.after_state or {}
                freeze_changes.append({
                    "合同编号": contract.contract_no,
                    "操作类型": "冻结",
                    "操作人": log.operation_by,
                    "操作时间": log.operation_at.isoformat(),
                    "原因": log.change_reason or "",
                    "冻结前状态": "正常",
                    "冻结后状态": "冻结"
                })
        
        df_freeze = pd.DataFrame(freeze_changes)
        
        with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
            df_contracts.to_excel(writer, sheet_name='合同汇总', index=False)
            if df_freeze.empty:
                pd.DataFrame({"说明": ["无冻结记录"]}).to_excel(writer, sheet_name='冻结变更', index=False)
            else:
                df_freeze.to_excel(writer, sheet_name='冻结变更', index=False)
        
        return {
            "filename": filename,
            "filepath": str(filepath),
            "contracts_count": len(contracts),
            "exported_at": datetime.now().isoformat(),
            "exported_by": export_by
        }

    def get_freeze_diff_report(self, contract_id: int) -> List[Dict[str, Any]]:
        contract = self.db.query(Contract).filter(Contract.id == contract_id).first()
        if not contract:
            raise ValueError(f"Contract {contract_id} not found")

        audit_logs = self.db.query(AuditLog).filter(
            AuditLog.contract_id == contract_id
        ).order_by(AuditLog.operation_at).all()

        diffs = []
        for log in audit_logs:
            before = log.before_state or {}
            after = log.after_state or {}
            
            fields_changed = []
            for key in set(list(before.keys()) + list(after.keys())):
                b_val = before.get(key)
                a_val = after.get(key)
                if b_val != a_val:
                    fields_changed.append({
                        "field": key,
                        "before": b_val,
                        "after": a_val
                    })
            
            diffs.append({
                "operation_type": log.operation_type.value,
                "operation_by": log.operation_by,
                "operation_at": log.operation_at.isoformat(),
                "change_reason": log.change_reason,
                "comment": log.comment,
                "fields_changed": fields_changed
            })

        return diffs
