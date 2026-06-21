from datetime import datetime

from topo_error_tracker.models import (
    AuditEntry,
    Material,
    MaterialStatus,
    ReviewDecision,
)
from topo_error_tracker.store import Store

EXTRAPOLATION_REVIEW_RULE = (
    "规则：外推越界复核——当检测到外推越界时，复核人必须能看到"
    "上一次谁处理、为什么没有直接通过。"
    "此规则不藏到日志里，直接写入审计条目的 rule_violation 字段。"
)

VISUAL_DETAIL_RULE = (
    "规则：图上顺但明细不匹配——草稿图与计算明细不一致时，"
    "必须在审计条目中标注，并在复核时提供上次处理人信息。"
)


class AuditManager:
    def __init__(self, store: Store):
        self.store = store

    def submit_review(
        self,
        material_id: str,
        reviewer: str,
        approved: bool,
        reason: str,
        extrapolation_boundary: bool = False,
    ) -> ReviewDecision:
        previous = self.store.get_latest_review(material_id)
        decision = ReviewDecision(
            material_id=material_id,
            reviewer=reviewer,
            approved=approved,
            reason=reason,
            timestamp=datetime.now(),
            previous_reviewer=previous.reviewer if previous else None,
            previous_reason=previous.reason if previous else None,
            extrapolation_boundary=extrapolation_boundary,
        )
        self.store.save_review_decision(decision)

        rule_violation = None
        if extrapolation_boundary and not approved:
            rule_violation = EXTRAPOLATION_REVIEW_RULE
        audit = AuditEntry(
            material_id=material_id,
            reviewer=reviewer,
            action="approve" if approved else "reject",
            reason=reason,
            timestamp=datetime.now(),
            rule_violation=rule_violation,
        )
        self.store.save_audit_entry(audit)

        if approved:
            self.store.update_material_status(material_id, MaterialStatus.REVIEWED)

        return decision

    def get_review_context(self, material_id: str) -> dict:
        previous = self.store.get_latest_review(material_id)
        audit_entries = self.store.list_audit_entries(material_id)
        edits = self.store.list_edits(material_id)

        context = {
            "material_id": material_id,
            "previous_reviewer": previous.reviewer if previous else None,
            "previous_reason": previous.reason if previous else None,
            "previous_approved": previous.approved if previous else None,
            "audit_entries": [
                {
                    "reviewer": a.reviewer,
                    "action": a.action,
                    "reason": a.reason,
                    "timestamp": a.timestamp.isoformat(),
                    "rule_violation": a.rule_violation,
                }
                for a in audit_entries
            ],
            "edit_count": len(edits),
            "last_edit": None,
        }
        if edits:
            last = edits[-1]
            context["last_edit"] = {
                "editor": last.editor,
                "field": last.field,
                "old_value": last.old_value,
                "new_value": last.new_value,
                "reason": last.reason,
                "edit_time": last.edit_time.isoformat(),
            }
        return context

    def check_extrapolation_review_required(self, material_id: str) -> dict:
        tracking = self.store.get_tracking_result(material_id)
        has_extrap = False
        if tracking:
            has_extrap = any(
                n.step_label == "外推越界" for n in tracking.error_nodes
            )
        previous = self.store.get_latest_review(material_id)
        return {
            "material_id": material_id,
            "extrapolation_detected": has_extrap,
            "previous_reviewer": previous.reviewer if previous else None,
            "previous_reason": previous.reason if previous else None,
            "review_required": has_extrap and (previous is None or not previous.approved),
            "rule": EXTRAPOLATION_REVIEW_RULE if has_extrap else None,
        }
