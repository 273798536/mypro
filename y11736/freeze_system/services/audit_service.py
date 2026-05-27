import json
from datetime import datetime
from typing import Optional, Any, Dict
from sqlalchemy.orm import Session
from ..models import AuditLog
from ..database import get_db


class AuditService:
    @staticmethod
    def log(
        operation_type: str,
        operation_subtype: str = "",
        target_type: str = "",
        target_id: Optional[int] = None,
        before_value: Any = None,
        after_value: Any = None,
        operator: str = "system",
        remark: str = "",
        data_source: str = "",
        risk_level: str = "normal",
        risk_desc: str = "",
        db: Optional[Session] = None,
    ):
        def to_json(v):
            if v is None:
                return ""
            if isinstance(v, (dict, list)):
                return json.dumps(v, ensure_ascii=False, default=str)
            return str(v)

        log = AuditLog(
            operation_type=operation_type,
            operation_subtype=operation_subtype,
            target_type=target_type,
            target_id=target_id,
            before_value=to_json(before_value),
            after_value=to_json(after_value),
            operator=operator,
            remark=remark,
            data_source=data_source,
            risk_level=risk_level,
            risk_desc=risk_desc,
        )

        if db:
            db.add(log)
        else:
            with get_db() as session:
                session.add(log)

    @staticmethod
    def get_logs(
        operation_type: Optional[str] = None,
        risk_level: Optional[str] = None,
        target_type: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100,
    ):
        with get_db() as db:
            query = db.query(AuditLog)
            if operation_type:
                query = query.filter(AuditLog.operation_type == operation_type)
            if risk_level:
                query = query.filter(AuditLog.risk_level == risk_level)
            if target_type:
                query = query.filter(AuditLog.target_type == target_type)
            if start_time:
                query = query.filter(AuditLog.operate_time >= start_time)
            if end_time:
                query = query.filter(AuditLog.operate_time <= end_time)
            
            results = query.order_by(AuditLog.operate_time.desc()).limit(limit).all()
            return [
                {
                    "id": log.id,
                    "operation_type": log.operation_type,
                    "operation_subtype": log.operation_subtype,
                    "target_type": log.target_type,
                    "target_id": log.target_id,
                    "before_value": log.before_value,
                    "after_value": log.after_value,
                    "operator": log.operator,
                    "operate_time": log.operate_time,
                    "remark": log.remark,
                    "data_source": log.data_source,
                    "risk_level": log.risk_level,
                    "risk_desc": log.risk_desc,
                    "created_at": log.created_at,
                }
                for log in results
            ]
