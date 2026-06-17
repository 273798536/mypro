from typing import Dict, List, Any, Optional
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core.database import Database
from core.models import ReviewHistory, REVIEW_STATUSES, _now_iso


class ReviewManager:
    def __init__(self, db: Database):
        self.db = db

    def review_finding(
        self,
        finding_id: str,
        action: str,
        reviewer: str,
        comment: str,
        new_status: Optional[str] = None,
        handler_opinion: Optional[str] = None,
    ) -> Dict[str, Any]:
        finding = self.db.get_audit_finding(finding_id)
        if not finding:
            raise ValueError(f"未找到审计记录 {finding_id}")

        old_status = finding["review_status"]
        action_map = {
            "APPROVE": "APPROVED",
            "REJECT": "REJECTED",
            "MARK_FIXED": "FIXED",
            "NEEDS_FIX": "NEEDS_FIX",
            "REOPEN": "PENDING",
        }
        target = new_status or action_map.get(action.upper())
        if not target:
            target = old_status
        self.db.update_audit_finding_status(finding_id, target, handler_opinion)

        history = ReviewHistory(
            finding_id=finding_id,
            action=action,
            reviewer=reviewer,
            reviewed_at=_now_iso(),
            old_status=old_status,
            new_status=target,
            comment=comment,
        )
        self.db.insert_review_history(history)

        return {
            "finding_id": finding_id,
            "old_status": old_status,
            "new_status": target,
            "reviewer": reviewer,
            "reviewed_at": history.reviewed_at,
            "action": action,
            "comment": comment,
        }

    def list_pending(self, tenant_id: Optional[str] = None, risk_level: Optional[str] = None) -> List[Dict[str, Any]]:
        return self.db.list_audit_findings(
            review_status="PENDING", tenant_id=tenant_id, risk_level=risk_level)

    def list_histories(self, finding_id: str) -> List[Dict[str, Any]]:
        return self.db.list_review_histories(finding_id)

    def all_histories_map(self) -> Dict[str, List[Dict[str, Any]]]:
        from collections import defaultdict
        result = defaultdict(list)
        all_finding_ids = [f["finding_id"] for f in self.db.list_audit_findings()]
        for fid in all_finding_ids:
            hists = self.db.list_review_histories(fid)
            if hists:
                result[fid] = hists
        return dict(result)
