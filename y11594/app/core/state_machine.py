from typing import Dict, List, Optional, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.ledger import LedgerRecord, StatusHistory, LEDGER_STATUS_FLOW
from app.models.user import User


class LedgerStateMachine:
    def __init__(self, db: Session, user: User):
        self.db = db
        self.user = user

    def can_transition(self, current_status: str, target_status: str) -> Tuple[bool, str]:
        if current_status not in LEDGER_STATUS_FLOW:
            return False, f"未知状态: {current_status}"
        
        allowed_next = LEDGER_STATUS_FLOW[current_status]["next"]
        if target_status not in allowed_next:
            return False, f"无法从 {current_status} 转换到 {target_status}，允许的状态: {allowed_next}"
        
        return True, ""

    def transition(
        self,
        ledger: LedgerRecord,
        target_status: str,
        reason: str = "",
        change_note: str = "",
        changed_fields: Optional[Dict] = None
    ) -> LedgerRecord:
        can_trans, msg = self.can_transition(ledger.status, target_status)
        if not can_trans:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=msg
            )

        from_status = ledger.status

        history = StatusHistory(
            ledger_id=ledger.id,
            ledger_no=ledger.ledger_no,
            from_status=from_status,
            to_status=target_status,
            operator_id=self.user.id,
            operator_name=self.user.full_name,
            operate_time=datetime.utcnow(),
            reason=reason,
            change_note=change_note,
            changed_fields=changed_fields or {}
        )
        self.db.add(history)

        ledger.status = target_status
        ledger.updated_by = self.user.username
        ledger.version += 1

        if target_status == "submitted":
            ledger.submit_time = datetime.utcnow()
        elif target_status == "audited":
            ledger.audit_time = datetime.utcnow()
        elif target_status == "exported":
            ledger.export_time = datetime.utcnow()

        self.db.commit()
        self.db.refresh(ledger)

        return ledger

    def submit(self, ledger: LedgerRecord, reason: str = "") -> LedgerRecord:
        return self.transition(ledger, "submitted", reason=reason)

    def start_review(self, ledger: LedgerRecord, reason: str = "") -> LedgerRecord:
        return self.transition(ledger, "reviewing", reason=reason)

    def reject(self, ledger: LedgerRecord, reason: str, note: str = "") -> LedgerRecord:
        ledger.reviewer_opinion = reason
        return self.transition(ledger, "rejected", reason=reason, change_note=note)

    def confirm(self, ledger: LedgerRecord, reason: str = "") -> LedgerRecord:
        ledger.review_time = datetime.utcnow()
        return self.transition(ledger, "audited", reason=reason)

    def second_confirm(self, ledger: LedgerRecord, reason: str, opinion: str = "") -> LedgerRecord:
        ledger.supervisor_opinion = opinion
        return self.transition(ledger, "second_confirming", reason=reason)

    def audit(self, ledger: LedgerRecord, reason: str = "") -> LedgerRecord:
        return self.transition(ledger, "audited", reason=reason)

    def mark_exported(self, ledger: LedgerRecord, reason: str = "") -> LedgerRecord:
        return self.transition(ledger, "exported", reason=reason)

    def back_to_draft(self, ledger: LedgerRecord, reason: str) -> LedgerRecord:
        if ledger.status != "rejected":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="只有驳回状态的记录才能退回草稿"
            )
        return self.transition(ledger, "draft", reason=reason)
