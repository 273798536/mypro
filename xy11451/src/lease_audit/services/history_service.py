from typing import Any, Dict, List

from lease_audit.models.database import get_session, OperationLog, ImportBatch


class HistoryService:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.session = get_session(db_path)
    
    def query_history(
        self,
        batch_no: str = None,
        entity_type: str = None,
        entity_id: int = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        query = self.session.query(OperationLog)
        
        if batch_no:
            batch = self.session.query(ImportBatch).filter_by(batch_no=batch_no).first()
            if batch:
                query = query.filter(
                    ((OperationLog.entity_type == "ImportBatch") & (OperationLog.entity_id == batch.id)) |
                    (OperationLog.remark.contains(batch_no))
                )
        
        if entity_type:
            query = query.filter(OperationLog.entity_type == entity_type)
        
        if entity_id:
            query = query.filter(OperationLog.entity_id == entity_id)
        
        query = query.order_by(OperationLog.operated_at.desc())
        
        if limit:
            query = query.limit(limit)
        
        logs = query.all()
        
        return [
            {
                "id": log.id,
                "operated_at": log.operated_at.strftime("%Y-%m-%d %H:%M:%S"),
                "operation_type": log.operation_type,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "operated_by": log.operated_by,
                "ip_address": log.ip_address,
                "remark": log.remark
            }
            for log in logs
        ]
