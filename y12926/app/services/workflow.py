from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.services.crud import (
    BatchCRUD, ReviewCRUD, RollbackCRUD, QuestionCRUD,
    ChangeCRUD, MaterialCRUD, RoutingCRUD
)
from app.schemas.schemas import (
    StatusTransitionRequest, ManualFixRequest, ReviewRecordInfo
)
from app.config import BatchStatus, QuestionStatus, REVIEW_STATE_FLOW


class WorkflowService:
    @staticmethod
    def can_transition(current_status: str, target_status: str) -> bool:
        if target_status == BatchStatus.ROLLBACK:
            return True
        allowed = REVIEW_STATE_FLOW.get(current_status, [])
        return target_status in allowed

    @staticmethod
    def transition(db: Session, batch_id: int, req: StatusTransitionRequest) -> Dict[str, Any]:
        batch = BatchCRUD.get(db, batch_id)
        if not batch:
            return {"success": False, "error": "批次不存在"}

        current = batch.status
        target = req.target_status

        if target == BatchStatus.ROLLBACK:
            return WorkflowService._handle_rollback(db, batch, req)

        if not WorkflowService.can_transition(current, target):
            return {
                "success": False,
                "error": f"不允许从 {current} 流转到 {target}",
                "allowed_next": REVIEW_STATE_FLOW.get(current, []),
            }

        rnd = batch.current_round
        ReviewCRUD.create(
            db,
            batch_id=batch.id,
            reviewer=req.operator,
            review_type="status_transition",
            review_action=f"{current}->{target}",
            before_status=current,
            after_status=target,
            comment=req.reason,
            operation_round=rnd,
        )

        if target == BatchStatus.REVIEWING:
            qs = QuestionCRUD.list_by_batch(db, batch_id, status=QuestionStatus.ROUTED, limit=10000)
            for q in qs:
                QuestionCRUD.update_status(db, q.id, QuestionStatus.NEED_REVIEW)
        elif target == BatchStatus.REVIEWED:
            qs = QuestionCRUD.list_by_batch(db, batch_id, status=QuestionStatus.NEED_REVIEW, limit=10000)
            for q in qs:
                QuestionCRUD.update_status(db, q.id, QuestionStatus.VALID)
        elif target == BatchStatus.APPROVED:
            qs = QuestionCRUD.list_by_batch(db, batch_id, limit=10000)
            for q in qs:
                if q.status not in (QuestionStatus.DUPLICATE, QuestionStatus.ROLLBACK):
                    QuestionCRUD.update_status(db, q.id, QuestionStatus.APPROVED)

        BatchCRUD.update_status(db, batch_id, target, operator=req.operator,
                                operation=f"transition:{current}->{target}")
        BatchCRUD.update_counts(db, batch_id)

        return {
            "success": True,
            "batch_id": batch_id,
            "from": current,
            "to": target,
            "operator": req.operator,
            "reason": req.reason,
        }

    @staticmethod
    def _handle_rollback(db: Session, batch, req: StatusTransitionRequest) -> Dict[str, Any]:
        rnd = batch.current_round
        from_status = batch.status
        rollback_order = [
            BatchStatus.REPORTED, BatchStatus.APPROVED, BatchStatus.REVIEWED,
            BatchStatus.REVIEWING, BatchStatus.ROUTED, BatchStatus.DEDUPLICATED,
            BatchStatus.IMPORTED,
        ]
        try:
            current_idx = rollback_order.index(from_status)
        except ValueError:
            current_idx = 0
        if current_idx + 1 >= len(rollback_order):
            return {"success": False, "error": f"当前状态 {from_status} 已最早，无法回滚"}
        to_status = rollback_order[current_idx + 1]

        blocker_qids = []
        if req.blocker_material_id:
            MaterialCRUD.mark_blocker(db, req.blocker_material_id, req.reason or "回滚卡点")
            qs = QuestionCRUD.list_by_batch(db, batch.id, limit=10000)
            blocker_qids = [q.id for q in qs if q.material_id == req.blocker_material_id]
            for qid in blocker_qids[:50]:
                QuestionCRUD.update_status(db, qid, QuestionStatus.ROLLBACK)
        elif req.blocker_detail and "question_ids" in req.blocker_detail:
            blocker_qids = req.blocker_detail["question_ids"]
            for qid in blocker_qids[:50]:
                QuestionCRUD.update_status(db, qid, QuestionStatus.ROLLBACK)

        RollbackCRUD.create(
            db,
            batch_id=batch.id,
            from_status=from_status,
            to_status=to_status,
            rollback_reason=req.reason,
            blocker_material_id=req.blocker_material_id,
            blocker_material_name=req.blocker_material_name,
            blocker_question_ids=blocker_qids or None,
            blocker_detail=req.blocker_detail,
            operator=req.operator,
            round_no=rnd,
        )

        if to_status == BatchStatus.ROUTED:
            pass
        elif to_status == BatchStatus.DEDUPLICATED:
            pass
        elif to_status == BatchStatus.IMPORTED:
            qs = QuestionCRUD.list_by_batch(db, batch.id, limit=10000)
            for q in qs:
                if q.status not in (QuestionStatus.DUPLICATE, QuestionStatus.ROLLBACK):
                    QuestionCRUD.update_status(db, q.id, QuestionStatus.PENDING)

        ReviewCRUD.create(
            db,
            batch_id=batch.id,
            reviewer=req.operator,
            review_type="rollback",
            review_action=f"rollback:{from_status}->{to_status}",
            before_status=from_status,
            after_status=to_status,
            comment=req.reason,
            operation_round=rnd,
        )

        BatchCRUD.increment_round(db, batch.id)
        BatchCRUD.update_status(db, batch.id, to_status, operator=req.operator,
                                operation=f"rollback:{from_status}->{to_status}")
        BatchCRUD.update_counts(db, batch.id)

        return {
            "success": True,
            "batch_id": batch.id,
            "rollback": True,
            "from": from_status,
            "to": to_status,
            "round": rnd + 1,
            "blocker_material": req.blocker_material_name,
            "blocker_reason": req.reason,
            "blocked_question_count": len(blocker_qids),
        }

    @staticmethod
    def approve_single_question(db: Session, batch_id: int, question_id: int,
                                reviewer: str, comment: str = None) -> Dict[str, Any]:
        q = QuestionCRUD.get(db, question_id)
        if not q or q.batch_id != batch_id:
            return {"success": False, "error": "题目不存在或不属于该批次"}
        before = q.status
        batch = BatchCRUD.get(db, batch_id)
        rnd = batch.current_round if batch else 1
        QuestionCRUD.update_status(db, question_id, QuestionStatus.VALID)
        ReviewCRUD.create(
            db,
            batch_id=batch_id,
            question_id=question_id,
            reviewer=reviewer,
            review_type="question_review",
            review_action="approve",
            before_status=before,
            after_status=QuestionStatus.VALID,
            comment=comment,
            operation_round=rnd,
        )
        BatchCRUD.update_counts(db, batch_id)
        return {"success": True, "question_id": question_id, "from": before, "to": QuestionStatus.VALID}

    @staticmethod
    def reject_single_question(db: Session, batch_id: int, question_id: int,
                               reviewer: str, comment: str = None,
                               mark_conflict: bool = True) -> Dict[str, Any]:
        q = QuestionCRUD.get(db, question_id)
        if not q or q.batch_id != batch_id:
            return {"success": False, "error": "题目不存在或不属于该批次"}
        before = q.status
        target = QuestionStatus.CONFLICT if mark_conflict else QuestionStatus.NEED_REVIEW
        batch = BatchCRUD.get(db, batch_id)
        rnd = batch.current_round if batch else 1
        QuestionCRUD.update_status(db, question_id, target)
        ReviewCRUD.create(
            db,
            batch_id=batch_id,
            question_id=question_id,
            reviewer=reviewer,
            review_type="question_review",
            review_action="reject",
            before_status=before,
            after_status=target,
            comment=comment,
            operation_round=rnd,
        )
        BatchCRUD.update_counts(db, batch_id)
        return {"success": True, "question_id": question_id, "from": before, "to": target}


class ManualReviewService:
    @staticmethod
    def apply_manual_fix(db: Session, req: ManualFixRequest) -> Dict[str, Any]:
        updated = QuestionCRUD.manual_fix(db, req)
        return {
            "success": True,
            "updated_count": len(updated),
            "updated_ids": [u.id for u in updated],
        }

    @staticmethod
    def get_question_change_diff(db: Session, question_id: int) -> Dict[str, Any]:
        q = QuestionCRUD.get(db, question_id)
        if not q:
            return {"error": "题目不存在"}
        changes = ChangeCRUD.list_by_batch(db, q.batch_id, question_id=question_id)
        reviews = ReviewCRUD.list_by_batch(db, q.batch_id)
        q_reviews = [r for r in reviews if r.question_id == question_id]
        return {
            "question_id": question_id,
            "original_data": q.original_data,
            "current": {
                "status": q.status,
                "title": q.title,
                "category": q.category,
                "difficulty": q.difficulty,
                "unit": q.unit,
                "remark": q.remark,
            },
            "dedup_history": [c for c in changes if c.change_type == "deduplicate"],
            "change_records": [
                {
                    "field": c.field_name,
                    "before": c.before_value,
                    "after": c.after_value,
                    "before_status": c.before_status,
                    "after_status": c.after_status,
                    "operator": c.operator,
                    "round": c.operation_round,
                    "reason": c.reason,
                    "time": c.created_at.isoformat() if c.created_at else None,
                }
                for c in changes
            ],
            "review_history": [
                {
                    "reviewer": r.reviewer,
                    "action": r.review_action,
                    "before_status": r.before_status,
                    "after_status": r.after_status,
                    "manual_fix": r.manual_fix,
                    "diff": r.change_diff,
                    "comment": r.comment,
                    "round": r.operation_round,
                    "time": r.created_at.isoformat() if r.created_at else None,
                }
                for r in q_reviews
            ],
            "routing_history": [
                {
                    "model": rr.model_name,
                    "confidence": rr.confidence,
                    "rule": rr.routing_rule,
                    "need_review": rr.need_review,
                    "reason": rr.review_reason,
                    "round": rr.round_no,
                    "by": rr.created_by,
                    "time": rr.created_at.isoformat() if rr.created_at else None,
                }
                for rr in RoutingCRUD.list_by_question(db, question_id)
            ],
        }

    @staticmethod
    def get_batch_rollback_trail(db: Session, batch_id: int) -> Dict[str, Any]:
        batch = BatchCRUD.get(db, batch_id)
        if not batch:
            return {"error": "批次不存在"}
        rollbacks = RollbackCRUD.list_by_batch(db, batch_id)
        materials = MaterialCRUD.list_by_batch(db, batch_id)
        blocker_materials = [m for m in materials if m.is_rollback_blocker]
        return {
            "batch_id": batch_id,
            "batch_no": batch.batch_no,
            "current_round": batch.current_round,
            "current_status": batch.status,
            "total_rollbacks": len(rollbacks),
            "rollback_trail": [
                {
                    "round": rb.round_no,
                    "from": rb.from_status,
                    "to": rb.to_status,
                    "reason": rb.rollback_reason,
                    "blocker_material": rb.blocker_material_name,
                    "blocker_material_id": rb.blocker_material_id,
                    "blocked_question_ids": rb.blocker_question_ids,
                    "detail": rb.blocker_detail,
                    "operator": rb.operator,
                    "time": rb.created_at.isoformat() if rb.created_at else None,
                }
                for rb in rollbacks
            ],
            "blocked_materials": [
                {
                    "id": m.id,
                    "name": m.material_name,
                    "sheet": m.sheet_name,
                    "reason": m.blocker_reason,
                    "remark": m.remark,
                }
                for m in blocker_materials
            ],
        }
