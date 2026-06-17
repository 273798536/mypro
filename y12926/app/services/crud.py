import hashlib
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models.models import (
    Batch, MaterialSource, Question, ChangeRecord,
    RoutingResult, ReviewRecord, RollbackLog
)
from app.schemas.schemas import (
    BatchCreate, QuestionImportItem, ManualFixRequest,
    StatusTransitionRequest
)
from app.config import BatchStatus, QuestionStatus


class BatchCRUD:
    @staticmethod
    def generate_batch_no() -> str:
        ts = datetime.now().strftime("%Y%m%d%H%M%S")
        suffix = hashlib.md5(ts.encode()).hexdigest()[:6].upper()
        return f"RT{ts}{suffix}"

    @staticmethod
    def create(db: Session, data: BatchCreate, source_file: str = None,
               source_hash: str = None) -> Batch:
        batch_no = BatchCRUD.generate_batch_no()
        obj = Batch(
            batch_no=batch_no,
            batch_name=data.batch_name,
            remark=data.remark,
            importer=data.importer,
            source_file=source_file,
            source_file_hash=source_hash,
            status=BatchStatus.IMPORTED,
            current_round=1,
            last_operation="create_batch",
            last_operator=data.importer,
        )
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    @staticmethod
    def get(db: Session, batch_id: int) -> Optional[Batch]:
        return db.query(Batch).filter(Batch.id == batch_id).first()

    @staticmethod
    def get_by_no(db: Session, batch_no: str) -> Optional[Batch]:
        return db.query(Batch).filter(Batch.batch_no == batch_no).first()

    @staticmethod
    def list(db: Session, skip: int = 0, limit: int = 100) -> List[Batch]:
        return (
            db.query(Batch)
            .order_by(Batch.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def update_status(db: Session, batch_id: int, status: str,
                      operator: str = None, operation: str = None) -> Optional[Batch]:
        obj = BatchCRUD.get(db, batch_id)
        if not obj:
            return None
        obj.status = status
        if operator:
            obj.last_operator = operator
        if operation:
            obj.last_operation = operation
        obj.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(obj)
        return obj

    @staticmethod
    def update_counts(db: Session, batch_id: int):
        obj = BatchCRUD.get(db, batch_id)
        if not obj:
            return
        qs = db.query(Question).filter(Question.batch_id == batch_id)
        obj.total_count = qs.count()
        valid_statuses = (
            QuestionStatus.VALID, QuestionStatus.ROUTED,
            QuestionStatus.NEED_REVIEW, QuestionStatus.APPROVED,
        )
        obj.valid_count = qs.filter(Question.status.in_(valid_statuses)).count()
        obj.duplicate_count = qs.filter(Question.status == QuestionStatus.DUPLICATE).count()
        obj.conflict_count = qs.filter(Question.status == QuestionStatus.CONFLICT).count()
        obj.rollback_count = qs.filter(Question.status == QuestionStatus.ROLLBACK).count()
        obj.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(obj)
        return obj

    @staticmethod
    def increment_round(db: Session, batch_id: int) -> Optional[Batch]:
        obj = BatchCRUD.get(db, batch_id)
        if not obj:
            return None
        obj.current_round += 1
        obj.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(obj)
        return obj


class MaterialCRUD:
    @staticmethod
    def create(db: Session, batch_id: int, material_name: str,
               material_type: str = None, sheet_name: str = None,
               source_row: int = None, import_order: int = 0,
               remark: str = None) -> MaterialSource:
        obj = MaterialSource(
            batch_id=batch_id,
            material_name=material_name,
            material_type=material_type,
            sheet_name=sheet_name,
            source_row=source_row,
            import_order=import_order,
            remark=remark,
        )
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    @staticmethod
    def list_by_batch(db: Session, batch_id: int) -> List[MaterialSource]:
        return (
            db.query(MaterialSource)
            .filter(MaterialSource.batch_id == batch_id)
            .order_by(MaterialSource.import_order.asc())
            .all()
        )

    @staticmethod
    def mark_blocker(db: Session, material_id: int, reason: str) -> Optional[MaterialSource]:
        obj = db.query(MaterialSource).filter(MaterialSource.id == material_id).first()
        if obj:
            obj.is_rollback_blocker = True
            obj.blocker_reason = reason
            db.commit()
            db.refresh(obj)
        return obj


class QuestionCRUD:
    @staticmethod
    def _compute_dedup_key(item: QuestionImportItem) -> str:
        parts = []
        if item.title:
            parts.append(item.title.strip().lower())
        if item.content:
            parts.append(item.content.strip().lower())
        if item.answer:
            parts.append(item.answer.strip().lower())
        raw = "||".join(parts)
        if not raw.strip():
            raw = item.title or ""
        return hashlib.md5(raw.encode("utf-8")).hexdigest()

    @staticmethod
    def _detect_issues(item: QuestionImportItem) -> dict:
        issues = {
            "is_old_format": False,
            "has_missing_unit": False,
            "has_append_remark": bool(item.remark_append and item.remark_append.strip()),
        }
        if item.question_no and item.question_no.startswith("Q-OLD-"):
            issues["is_old_format"] = True
        if item.question_no and "_旧版" in (item.question_no or ""):
            issues["is_old_format"] = True
        if item.title and ("旧表" in item.title or "旧版" in item.title or "历史遗留" in item.title):
            issues["is_old_format"] = True
        has_numeric = any(c.isdigit() for c in (item.title or "") + (item.content or ""))
        if has_numeric and not item.unit:
            issues["has_missing_unit"] = True
        return issues

    @staticmethod
    def create(db: Session, batch_id: int, item: QuestionImportItem,
               material_id: int = None, status: str = QuestionStatus.PENDING,
               original_data: dict = None) -> Question:
        dedup_key = QuestionCRUD._compute_dedup_key(item)
        issues = QuestionCRUD._detect_issues(item)
        raw = original_data or item.model_dump(exclude_unset=False)
        obj = Question(
            batch_id=batch_id,
            material_id=material_id,
            question_no=item.question_no,
            dedup_key=dedup_key,
            title=item.title,
            content=item.content,
            answer=item.answer,
            category=item.category,
            difficulty=item.difficulty,
            tags=item.tags if item.tags else None,
            expected_model=item.expected_model,
            source_material=item.source_material,
            source_sheet=item.source_sheet,
            source_row=item.source_row,
            remark=item.remark,
            remark_append=item.remark_append,
            unit=item.unit,
            is_old_format=issues["is_old_format"],
            has_missing_unit=issues["has_missing_unit"],
            has_append_remark=issues["has_append_remark"],
            original_data=raw,
            status=status,
        )
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    @staticmethod
    def bulk_create(db: Session, batch_id: int, items: List[QuestionImportItem],
                    material_id: int = None) -> List[Question]:
        created = []
        for item in items:
            q = QuestionCRUD.create(db, batch_id, item, material_id=material_id)
            created.append(q)
        return created

    @staticmethod
    def get(db: Session, question_id: int) -> Optional[Question]:
        return db.query(Question).filter(Question.id == question_id).first()

    @staticmethod
    def list_by_batch(db: Session, batch_id: int, status: str = None,
                      skip: int = 0, limit: int = 500) -> List[Question]:
        q = db.query(Question).filter(Question.batch_id == batch_id)
        if status:
            q = q.filter(Question.status == status)
        return q.order_by(Question.id.asc()).offset(skip).limit(limit).all()

    @staticmethod
    def find_duplicates(db: Session, batch_id: int) -> Dict[str, List[Question]]:
        items = db.query(Question).filter(
            Question.batch_id == batch_id,
            Question.status.in_([QuestionStatus.PENDING, QuestionStatus.VALID])
        ).all()
        groups: Dict[str, List[Question]] = {}
        for it in items:
            if it.dedup_key not in groups:
                groups[it.dedup_key] = []
            groups[it.dedup_key].append(it)
        return {k: v for k, v in groups.items() if len(v) > 1}

    @staticmethod
    def mark_duplicate(db: Session, duplicate_id: int, master_id: int,
                       dedup_round: int = 1, operator: str = "system") -> Question:
        obj = QuestionCRUD.get(db, duplicate_id)
        if not obj:
            return None
        before_status = obj.status
        obj.status = QuestionStatus.DUPLICATE
        obj.duplicate_of_id = master_id
        obj.dedup_round = dedup_round
        obj.updated_at = datetime.utcnow()
        master = QuestionCRUD.get(db, master_id)
        ChangeCRUD.create(
            db,
            batch_id=obj.batch_id,
            question_id=obj.id,
            change_type="deduplicate",
            before_status=before_status,
            after_status=QuestionStatus.DUPLICATE,
            before_value={"id": obj.id, "title": obj.title, "dedup_key": obj.dedup_key},
            after_value={"merged_into": master_id, "master_title": master.title if master else None},
            operator=operator,
            operation_round=dedup_round,
            reason="去重合并",
            source_material=obj.source_material,
        )
        db.commit()
        db.refresh(obj)
        return obj

    @staticmethod
    def mark_valid(db: Session, question_id: int) -> Optional[Question]:
        obj = QuestionCRUD.get(db, question_id)
        if not obj:
            return None
        obj.status = QuestionStatus.VALID
        obj.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(obj)
        return obj

    @staticmethod
    def update_status(db: Session, question_id: int, status: str) -> Optional[Question]:
        obj = QuestionCRUD.get(db, question_id)
        if not obj:
            return None
        obj.status = status
        obj.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(obj)
        return obj

    @staticmethod
    def manual_fix(db: Session, req: ManualFixRequest) -> List[Question]:
        qids = req.question_ids or ([req.question_id] if req.question_id else [])
        updated = []
        batch_id = None
        for qid in qids:
            q = QuestionCRUD.get(db, qid)
            if not q:
                continue
            batch_id = q.batch_id
            before = {
                "status": q.status,
                "title": q.title,
                "category": q.category,
                "difficulty": q.difficulty,
                "unit": q.unit,
                "remark": q.remark,
            }
            diff = {}
            if req.new_status and req.new_status != q.status:
                diff["status"] = {"before": q.status, "after": req.new_status}
                q.status = req.new_status
            if req.modify_fields:
                for k, v in req.modify_fields.items():
                    if hasattr(q, k):
                        old_val = getattr(q, k)
                        if old_val != v:
                            diff[k] = {"before": old_val, "after": v}
                            setattr(q, k, v)
            q.updated_at = datetime.utcnow()
            batch = BatchCRUD.get(db, batch_id) if batch_id else None
            rnd = batch.current_round if batch else 1
            ReviewCRUD.create(
                db,
                batch_id=batch_id,
                question_id=q.id,
                reviewer=req.reviewer,
                review_type="manual_fix",
                review_action="update",
                before_status=before["status"],
                after_status=q.status,
                comment=req.comment,
                manual_fix=True,
                change_diff=diff if diff else None,
                operation_round=rnd,
            )
            if req.new_routing:
                rr = RoutingCRUD.create(db, q.id, req.new_routing, round_no=rnd, created_by=req.reviewer)
            db.commit()
            db.refresh(q)
            updated.append(q)
        if batch_id:
            BatchCRUD.update_counts(db, batch_id)
        return updated


class ChangeCRUD:
    @staticmethod
    def create(db: Session, batch_id: int, question_id: int = None,
               change_type: str = None, field_name: str = None,
               before_value: Any = None, after_value: Any = None,
               before_status: str = None, after_status: str = None,
               operator: str = "system", operation_round: int = 1,
               reason: str = None, source_material: str = None) -> ChangeRecord:
        obj = ChangeRecord(
            batch_id=batch_id,
            question_id=question_id,
            change_type=change_type,
            field_name=field_name,
            before_value=before_value,
            after_value=after_value,
            before_status=before_status,
            after_status=after_status,
            operator=operator,
            operation_round=operation_round,
            reason=reason,
            source_material=source_material,
        )
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    @staticmethod
    def list_by_batch(db: Session, batch_id: int, change_type: str = None,
                      question_id: int = None) -> List[ChangeRecord]:
        q = db.query(ChangeRecord).filter(ChangeRecord.batch_id == batch_id)
        if change_type:
            q = q.filter(ChangeRecord.change_type == change_type)
        if question_id:
            q = q.filter(ChangeRecord.question_id == question_id)
        return q.order_by(ChangeRecord.created_at.desc()).all()


class RoutingCRUD:
    @staticmethod
    def create(db: Session, question_id: int, routing_data: Any,
               round_no: int = 1, created_by: str = "auto") -> RoutingResult:
        model_kwargs = routing_data.model_dump(exclude_unset=True) if hasattr(routing_data, "model_dump") else dict(routing_data)
        obj = RoutingResult(
            question_id=question_id,
            round_no=round_no,
            created_by=created_by,
            **model_kwargs,
        )
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    @staticmethod
    def list_by_question(db: Session, question_id: int) -> List[RoutingResult]:
        return (
            db.query(RoutingResult)
            .filter(RoutingResult.question_id == question_id)
            .order_by(RoutingResult.round_no.desc(), RoutingResult.is_primary.desc())
            .all()
        )

    @staticmethod
    def list_by_batch(db: Session, batch_id: int) -> List[RoutingResult]:
        return (
            db.query(RoutingResult)
            .join(Question, RoutingResult.question_id == Question.id)
            .filter(Question.batch_id == batch_id)
            .order_by(RoutingResult.created_at.desc())
            .all()
        )

    @staticmethod
    def summary_by_batch(db: Session, batch_id: int) -> Dict[str, int]:
        rrs = RoutingCRUD.list_by_batch(db, batch_id)
        seen = set()
        summary: Dict[str, int] = {}
        for rr in rrs:
            if rr.question_id in seen:
                continue
            seen.add(rr.question_id)
            model = rr.model_name or "未命中"
            summary[model] = summary.get(model, 0) + 1
        return summary


class ReviewCRUD:
    @staticmethod
    def create(db: Session, batch_id: int, question_id: int = None,
               reviewer: str = None, review_type: str = None,
               review_action: str = None, before_status: str = None,
               after_status: str = None, before_routing: Any = None,
               after_routing: Any = None, comment: str = None,
               manual_fix: bool = False, change_diff: Any = None,
               operation_round: int = 1) -> ReviewRecord:
        obj = ReviewRecord(
            batch_id=batch_id,
            question_id=question_id,
            reviewer=reviewer,
            review_type=review_type,
            review_action=review_action,
            before_status=before_status,
            after_status=after_status,
            before_routing=before_routing,
            after_routing=after_routing,
            comment=comment,
            manual_fix=manual_fix,
            change_diff=change_diff,
            operation_round=operation_round,
        )
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    @staticmethod
    def list_by_batch(db: Session, batch_id: int) -> List[ReviewRecord]:
        return (
            db.query(ReviewRecord)
            .filter(ReviewRecord.batch_id == batch_id)
            .order_by(ReviewRecord.created_at.desc())
            .all()
        )

    @staticmethod
    def reviewers_of_batch(db: Session, batch_id: int) -> List[str]:
        rows = (
            db.query(ReviewRecord.reviewer)
            .filter(ReviewRecord.batch_id == batch_id)
            .distinct()
            .all()
        )
        return [r[0] for r in rows]


class RollbackCRUD:
    @staticmethod
    def create(db: Session, batch_id: int, from_status: str, to_status: str,
               rollback_reason: str = None, blocker_material_id: int = None,
               blocker_material_name: str = None, blocker_question_ids: List[int] = None,
               blocker_detail: Any = None, operator: str = "system",
               round_no: int = 1) -> RollbackLog:
        obj = RollbackLog(
            batch_id=batch_id,
            from_status=from_status,
            to_status=to_status,
            rollback_reason=rollback_reason,
            blocker_material_id=blocker_material_id,
            blocker_material_name=blocker_material_name,
            blocker_question_ids=blocker_question_ids,
            blocker_detail=blocker_detail,
            operator=operator,
            round_no=round_no,
        )
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    @staticmethod
    def list_by_batch(db: Session, batch_id: int) -> List[RollbackLog]:
        return (
            db.query(RollbackLog)
            .filter(RollbackLog.batch_id == batch_id)
            .order_by(RollbackLog.created_at.desc())
            .all()
        )
