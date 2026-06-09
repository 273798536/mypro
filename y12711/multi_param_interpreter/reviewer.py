from typing import List, Dict, Any, Optional
from .models import ReviewRecord, ReviewAction, JudgmentStatus
from .db import Database


class Reviewer:
    def __init__(self, db: Database):
        self.db = db

    def list_pending(self, edge_only: bool = True) -> List[Dict[str, Any]]:
        if edge_only:
            return self.db.list_edge_cases()
        all_calc = self.db.get_calculations()
        return [c for c in all_calc if c["judgment_after"] in (
            JudgmentStatus.NEEDS_REVIEW.value,
            JudgmentStatus.EDGE_CASE.value,
            JudgmentStatus.PENDING.value,
        )]

    def review(
        self,
        calculation_id: int,
        action: ReviewAction,
        note: str,
        parameter_adjustment: Optional[Dict[str, float]] = None,
        supplementary_data: Optional[Dict[str, Any]] = None,
        reviewed_by: str = "editor",
    ) -> Dict[str, Any]:
        calc = self.db.get_calculation(calculation_id)
        if not calc:
            raise ValueError(f"找不到计算记录 #{calculation_id}")

        record = ReviewRecord(
            calculation_id=calculation_id,
            action=action,
            reviewer_note=note,
            parameter_adjustment=parameter_adjustment,
            supplementary_data=supplementary_data,
            reviewed_by=reviewed_by,
        )
        self.db.insert_review(record)

        updates: Dict[str, Any] = {}
        if action == ReviewAction.CONFIRM:
            if calc["judgment_after"] == JudgmentStatus.EDGE_CASE.value:
                updates["judgment_after"] = JudgmentStatus.ACCEPTED.value
                updates["explanation_after"] = (
                    calc["explanation_after"] + " [编辑复核：确认接受]"
                )
        elif action == ReviewAction.REJECT:
            updates["judgment_after"] = JudgmentStatus.REJECTED.value
            updates["explanation_after"] = (
                calc["explanation_after"] + f" [编辑驳回：{note}]"
            )
        elif action == ReviewAction.ADJUST:
            if parameter_adjustment:
                new_val = parameter_adjustment.get("adjusted_value")
                if new_val is not None:
                    old_raw = calc.get("adjusted_value")
                    updates["adjusted_value"] = float(new_val)
                    updates["formula_after"] = (
                        f"{calc['parameter_name']} = manual_adjust({new_val}) "
                        f"[原: {calc.get('formula_after')}]"
                    )
                    updates["explanation_after"] = (
                        f"编辑人工调整：原值 {old_raw} → 新值 {new_val}。备注：{note}"
                    )
                    updates["judgment_after"] = JudgmentStatus.ACCEPTED.value
                    updates["is_edge_case"] = 0
        elif action == ReviewAction.SUPPLEMENT:
            updates["explanation_after"] = (
                calc["explanation_after"] + f" [补充材料：{note}]"
            )
            updates["judgment_after"] = JudgmentStatus.ACCEPTED.value
            updates["is_edge_case"] = 0

        if updates:
            self.db.update_calculation(calculation_id, updates)

        return {
            "calculation_id": calculation_id,
            "action": action.value,
            "note": note,
            "updates_applied": list(updates.keys()),
        }

    def get_review_history(self, calculation_id: int) -> List[Dict[str, Any]]:
        return self.db.get_reviews(calculation_id)

    def get_formula_trace(self, question_id: str) -> List[Dict[str, Any]]:
        return self.db.get_formula_trace(question_id)
