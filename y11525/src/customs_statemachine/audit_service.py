import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session

from .models import AuditLog, Batch


class AuditService:
    def __init__(self, db: Session):
        self.db = db

    def log_action(
        self,
        batch_id: str,
        action: str,
        changed_by: str,
        old_status: Optional[str] = None,
        new_status: Optional[str] = None,
        reason: Optional[str] = None,
        changes: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditLog:
        log = AuditLog(
            id=str(uuid.uuid4()),
            batch_id=batch_id,
            action=action,
            old_status=old_status,
            new_status=new_status,
            changed_by=changed_by,
            changed_at=datetime.utcnow(),
            reason=reason,
            changes=changes,
            ip_address=ip_address,
            user_agent=user_agent
        )
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log

    def get_batch_history(
        self,
        batch_id: str,
        skip: int = 0,
        limit: int = 100,
        action: Optional[str] = None
    ) -> List[AuditLog]:
        query = self.db.query(AuditLog).filter(AuditLog.batch_id == batch_id)

        if action:
            query = query.filter(AuditLog.action == action)

        return query.order_by(AuditLog.changed_at.desc()).offset(skip).limit(limit).all()

    def get_user_activity(
        self,
        user: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[AuditLog]:
        return (
            self.db.query(AuditLog)
            .filter(AuditLog.changed_by == user)
            .order_by(AuditLog.changed_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_changes_summary(self, batch_id: str) -> List[Dict[str, Any]]:
        logs = (
            self.db.query(AuditLog)
            .filter(AuditLog.batch_id == batch_id)
            .order_by(AuditLog.changed_at.asc())
            .all()
        )

        summary = []
        for log in logs:
            entry = {
                "timestamp": log.changed_at.isoformat(),
                "user": log.changed_by,
                "action": log.action,
                "reason": log.reason,
            }

            if log.old_status or log.new_status:
                entry["status_change"] = {
                    "from": log.old_status,
                    "to": log.new_status
                }

            if log.changes:
                entry["changes"] = log.changes

            summary.append(entry)

        return summary

    def compare_states(self, batch_id: str) -> Dict[str, Any]:
        logs = (
            self.db.query(AuditLog)
            .filter(AuditLog.batch_id == batch_id)
            .order_by(AuditLog.changed_at.asc())
            .all()
        )

        if not logs:
            return {}

        return {
            "first_modification": {
                "time": logs[0].changed_at.isoformat(),
                "user": logs[0].changed_by,
                "action": logs[0].action
            },
            "last_modification": {
                "time": logs[-1].changed_at.isoformat(),
                "user": logs[-1].changed_by,
                "action": logs[-1].action
            },
            "total_changes": len(logs),
            "unique_users": len({log.changed_by for log in logs}),
            "all_statuses": [
                {
                    "status": log.new_status,
                    "time": log.changed_at.isoformat(),
                    "user": log.changed_by
                }
                for log in logs if log.new_status
            ]
        }
